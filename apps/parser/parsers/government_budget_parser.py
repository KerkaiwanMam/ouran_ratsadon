"""Multi-format parser for government budget source documents.

Supports three input formats — html (Google Sheets export style table),
xlsx (openpyxl/pandas), csv (pandas) — and normalizes every row into the
shared `BudgetLineItemRow` shape (mirrors the Prisma `BudgetLineItem` model
and the Data Dict, 2025-05-25), so the rest of the pipeline (validation,
ETL aggregation into BudgetMinistry/Department/Project) doesn't need to
care which format the admin originally uploaded.

Per CLAUDE.md, PDF parsing stays a separate offline/team-only path
(`pdf_parser.py`) — this module only covers html / xlsx / csv.
"""

from __future__ import annotations

import io
import re
from typing import Any

import pandas as pd

from models import BudgetLineItemRow, ParseResult

# ─── Column-name mapping ─────────────────────────────────────────────────────
# Source documents (whether exported from Google Sheets as HTML, or as
# .xlsx / .csv) may use slightly different header spellings. We match
# header text against these candidate substrings (checked in order) to
# find the right BudgetLineItemRow field. Extend this list as real-world
# header variants are discovered in production data.
COLUMN_ALIASES: dict[str, list[str]] = {
    "ministry": ["กระทรวง", "ministry"],
    "strategy": ["แผนยุทธศาสตร์", "strategy"],
    "motherPlan": ["แผนแม่บท", "motherplan", "mother_plan"],
    "budgetaryUnit": ["หน่วยรับงบประมาณ", "budgetary_unit", "budgetaryunit"],
    "budgetPlan": ["แผนงาน", "budget_plan", "budgetplan"],
    "output": ["ผลผลิต", "output"],
    "project": ["โครงการ", "project"],
    "categoryLv1": ["หมวดรายจ่าย ระดับ 1", "หมวดงบรายจ่าย 1", "category_lv1", "categorylv1", "หมวด 1"],
    "categoryLv2": ["หมวดรายจ่าย ระดับ 2", "หมวดงบรายจ่าย 2", "category_lv2", "categorylv2", "หมวด 2"],
    "categoryLv3": ["หมวดรายจ่าย ระดับ 3", "หมวดงบรายจ่าย 3", "category_lv3", "categorylv3", "หมวด 3"],
    "categoryLv4": ["หมวดรายจ่าย ระดับ 4", "หมวดงบรายจ่าย 4", "category_lv4", "categorylv4", "หมวด 4"],
    "categoryLv5": ["หมวดรายจ่าย ระดับ 5", "หมวดงบรายจ่าย 5", "category_lv5", "categorylv5", "หมวด 5"],
    "categoryLv6": ["หมวดรายจ่าย ระดับ 6", "หมวดงบรายจ่าย 6", "category_lv6", "categorylv6", "หมวด 6"],
    "itemDescription": ["ชื่อรายการ", "item_description", "description", "รายการ"],
    "fiscalYear": ["ปีงบประมาณ", "fiscal_year", "fiscalyear", "year"],
    "amount": ["งบประมาณ", "จำนวนเงิน", "amount", "budget"],
    "obliged": ["งบผูกพัน", "obliged"],
    "crossFunc": ["บูรณาการ", "cross_func", "crossfunc"],
}

REQUIRED_FIELDS = ["ministry", "budgetaryUnit", "budgetPlan", "fiscalYear", "amount"]


def _normalize_header(text: Any) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip().lower()


def _map_columns(columns: list[Any]) -> dict[int, str]:
    """Returns {column_index: BudgetLineItemRow_field_name} for matched columns."""
    mapping: dict[int, str] = {}
    normalized = [_normalize_header(c) for c in columns]
    for field, aliases in COLUMN_ALIASES.items():
        for idx, header in enumerate(normalized):
            if idx in mapping:
                continue
            if any(alias.lower() in header for alias in aliases):
                mapping[idx] = field
                break
    return mapping


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        cleaned = str(value).replace(",", "").replace("฿", "").strip()
        if cleaned in ("", "-", "nan", "None"):
            return None
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def _to_int(value: Any) -> int | None:
    f = _to_float(value)
    return int(f) if f is not None else None


def _to_bool(value: Any) -> bool:
    s = str(value or "").strip().lower()
    return s in ("true", "1", "yes", "y", "ใช่", "จริง", "✓", "x")


# Pandas reads empty cells as float NaN, which str() turns into the string "nan".
# Any field that comes through as "nan" / "none" / "null" is treated as absent.
_BLANK_STRINGS = frozenset(("nan", "none", "null", "nat", "n/a", "-", "–", "—"))


def _row_to_line_item(
    row: dict[str, Any],
    *,
    refDoc: str,
    refPageNo: int,
    fallback_fiscal_year: int | None,
    row_no: int,
    warnings: list[str],
) -> BudgetLineItemRow | None:
    ministry = _clean_str(row.get("ministry")) or ""
    budgetaryUnit = _clean_str(row.get("budgetaryUnit")) or ""
    budgetPlan = _clean_str(row.get("budgetPlan")) or ""
    amount = _to_float(row.get("amount"))
    fiscalYear = _to_int(row.get("fiscalYear")) or fallback_fiscal_year
    # Data Dict says FISCAL_YEAR in source CSVs is recorded in ค.ศ. (Gregorian,
    # e.g. 2026), but the rest of the platform — Prisma BudgetLineItem,
    # the admin upload form, and its `2500 <= fiscalYear <= 2700` validation —
    # all use พ.ศ. (Buddhist Era, e.g. 2569 = 2026 + 543). Without converting
    # here, inserted rows end up tagged with the Gregorian year while the ETL
    # re-query filters by the form's Buddhist-Era year, matching nothing and
    # silently producing an empty ministries[] tree (the bug just diagnosed).
    if fiscalYear is not None and fiscalYear < 2400:
        fiscalYear += 543

    missing = [
        name
        for name, val in [
            ("ministry", ministry),
            ("budgetaryUnit", budgetaryUnit),
            ("budgetPlan", budgetPlan),
        ]
        if not val
    ]
    if amount is None:
        missing.append("amount")
    if fiscalYear is None:
        missing.append("fiscalYear")

    if missing:
        warnings.append(f"แถวที่ {row_no}: ข้ามแถวเพราะขาดข้อมูลที่จำเป็น ({', '.join(missing)})")
        return None

    output = (str(row.get("output")).strip() or None) if row.get("output") else None
    project = (str(row.get("project")).strip() or None) if row.get("project") else None
    if output and project:
        # Data Dict says these are mutually exclusive — keep `project` and
        # warn rather than silently dropping the whole row
        warnings.append(
            f"แถวที่ {row_no}: มีทั้ง 'ผลผลิต' และ 'โครงการ' พร้อมกัน (ต้องมีอย่างใดอย่างหนึ่ง) — ใช้ค่า 'โครงการ' เป็นหลัก"
        )
        output = None

    return BudgetLineItemRow(
        refDoc=refDoc,
        refPageNo=refPageNo,
        ministry=ministry,
        strategy=_clean_str(row.get("strategy")),
        motherPlan=_clean_str(row.get("motherPlan")),
        crossFunc=_to_bool(row.get("crossFunc")),
        budgetaryUnit=budgetaryUnit,
        budgetPlan=budgetPlan,
        output=output,
        project=project,
        categoryLv1=_clean_str(row.get("categoryLv1")),
        categoryLv2=_clean_str(row.get("categoryLv2")),
        categoryLv3=_clean_str(row.get("categoryLv3")),
        categoryLv4=_clean_str(row.get("categoryLv4")),
        categoryLv5=_clean_str(row.get("categoryLv5")),
        categoryLv6=_clean_str(row.get("categoryLv6")),
        itemDescription=_clean_str(row.get("itemDescription")),
        fiscalYear=fiscalYear,
        amount=amount,
        obliged=_to_bool(row.get("obliged")),
    )


def _clean_str(value: Any) -> str | None:
    """Return None for missing/blank values including pandas NaN → 'nan'."""
    if value is None:
        return None
    s = str(value).strip()
    if not s or s.lower() in _BLANK_STRINGS:
        return None
    return s


def _dataframe_to_rows(
    df: "pd.DataFrame",
    *,
    refDoc: str,
    fiscal_year_hint: int | None,
    warnings: list[str],
) -> list[BudgetLineItemRow]:
    col_map = _map_columns(list(df.columns))
    if not col_map:
        warnings.append("ไม่พบคอลัมน์ที่ตรงกับ Data Dict เลยแม้แต่คอลัมน์เดียว — ตรวจสอบหัวตารางของไฟล์ต้นฉบับ")
        return []

    matched_fields = set(col_map.values())
    missing_required = [f for f in REQUIRED_FIELDS if f not in matched_fields]
    if missing_required:
        warnings.append(
            "ไฟล์ขาดคอลัมน์ที่จำเป็นตาม Data Dict: " + ", ".join(missing_required)
        )

    rows: list[BudgetLineItemRow] = []
    columns = list(df.columns)
    for i, (_, raw_row) in enumerate(df.iterrows(), start=1):
        record: dict[str, Any] = {}
        for idx, field in col_map.items():
            if idx < len(columns):
                record[field] = raw_row[columns[idx]]
        if not any(v not in (None, "") for v in record.values()):
            continue  # fully blank row — skip silently
        item = _row_to_line_item(
            record,
            refDoc=refDoc,
            refPageNo=1,
            fallback_fiscal_year=fiscal_year_hint,
            row_no=i,
            warnings=warnings,
        )
        if item:
            rows.append(item)
    return rows


# ─── Per-format entry points ─────────────────────────────────────────────────

def _parse_xlsx(content: bytes, *, refDoc: str, fiscal_year_hint: int | None, warnings: list[str]) -> list[BudgetLineItemRow]:
    sheets = pd.read_excel(io.BytesIO(content), sheet_name=None, dtype=object)
    all_rows: list[BudgetLineItemRow] = []
    for sheet_name, df in sheets.items():
        if df.empty:
            continue
        sheet_rows = _dataframe_to_rows(df, refDoc=f"{refDoc}#{sheet_name}", fiscal_year_hint=fiscal_year_hint, warnings=warnings)
        all_rows.extend(sheet_rows)
    return all_rows


def _parse_csv(content: bytes, *, refDoc: str, fiscal_year_hint: int | None, warnings: list[str]) -> list[BudgetLineItemRow]:
    # Thai government exports are commonly UTF-8 (with or without BOM) or TIS-620/cp874
    for encoding in ("utf-8-sig", "utf-8", "cp874", "tis-620"):
        try:
            df = pd.read_csv(io.BytesIO(content), dtype=object, encoding=encoding)
            return _dataframe_to_rows(df, refDoc=refDoc, fiscal_year_hint=fiscal_year_hint, warnings=warnings)
        except (UnicodeDecodeError, UnicodeError):
            continue
    warnings.append("ไม่สามารถอ่านไฟล์ CSV ได้ — ลองตรวจสอบ encoding ของไฟล์ (รองรับ UTF-8 / TIS-620)")
    return []


def _parse_html(content: bytes, *, refDoc: str, fiscal_year_hint: int | None, warnings: list[str]) -> list[BudgetLineItemRow]:
    # Google Sheets "Publish to web → .html" exports a <table> per sheet/tab.
    # pandas.read_html (lxml/bs4 backend) extracts every <table> on the page.
    try:
        tables = pd.read_html(io.BytesIO(content), flavor="lxml")
    except ValueError:
        warnings.append("ไม่พบตารางข้อมูล (<table>) ในไฟล์ HTML — ตรวจสอบว่าเป็นไฟล์ที่ export จาก Google Sheets ถูกต้อง")
        return []

    all_rows: list[BudgetLineItemRow] = []
    for i, df in enumerate(tables):
        if df.empty or len(df.columns) < 2:
            continue
        # Google Sheets exports often duplicate the header into row 0 —
        # if the first data row looks identical to the header, drop it
        if len(df) > 1 and list(df.iloc[0].astype(str)) == [str(c) for c in df.columns]:
            df = df.iloc[1:]
        table_rows = _dataframe_to_rows(df, refDoc=f"{refDoc}#table{i + 1}", fiscal_year_hint=fiscal_year_hint, warnings=warnings)
        all_rows.extend(table_rows)
    return all_rows


_FORMAT_PARSERS = {
    "xlsx": _parse_xlsx,
    "csv": _parse_csv,
    "html": _parse_html,
}


def detect_source_format(filename: str, content_type: str | None) -> str | None:
    name = (filename or "").lower()
    if name.endswith((".xlsx", ".xls")):
        return "xlsx"
    if name.endswith(".csv"):
        return "csv"
    if name.endswith((".html", ".htm")):
        return "html"
    if content_type:
        ct = content_type.lower()
        if "spreadsheetml" in ct or "ms-excel" in ct:
            return "xlsx"
        if "csv" in ct:
            return "csv"
        if "html" in ct:
            return "html"
    return None


def parse_government_budget(
    content: bytes,
    *,
    filename: str,
    content_type: str | None = None,
    fiscal_year_hint: int | None = None,
) -> ParseResult:
    """Detects the source format from filename/content-type, parses the file,
    and returns a unified ParseResult with BudgetLineItemRow rows + warnings.

    Raises ValueError with a Thai-friendly message if the format can't be
    determined or no rows could be extracted at all.
    """
    source_format = detect_source_format(filename, content_type)
    if source_format is None:
        raise ValueError("ไม่รองรับไฟล์ประเภทนี้ — รองรับเฉพาะ .xlsx, .csv, .html เท่านั้น")

    warnings: list[str] = []
    parser_fn = _FORMAT_PARSERS[source_format]
    rows = parser_fn(content, refDoc=filename, fiscal_year_hint=fiscal_year_hint, warnings=warnings)

    if not rows:
        raise ValueError(
            "ไม่สามารถแยกข้อมูลรายการงบประมาณจากไฟล์นี้ได้เลย — "
            + (warnings[0] if warnings else "กรุณาตรวจสอบรูปแบบไฟล์เทียบกับ Data Dict")
        )

    resolved_year = fiscal_year_hint or rows[0].fiscalYear

    return ParseResult(
        sourceFormat=source_format,  # type: ignore[arg-type]
        filename=filename,
        fiscalYear=resolved_year,
        totalRows=len(rows),
        rows=rows,
        warnings=warnings,
    )
