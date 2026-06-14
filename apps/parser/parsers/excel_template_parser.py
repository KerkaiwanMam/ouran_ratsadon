"""
Parser for the controlled SME upload template (Phase 0 — Business Layer).

Template columns (see docs/sample-data.md and sample-data/sme-template.csv):
    วันที่ | รายการ | หมวดหมู่ (optional) | จำนวนเงิน | ประเภท (income/expense)

Returns a list of NormalizedTransaction dicts (same shape used by
bank_statement_parser.py), plus an optional "category":
    {
        "date":        "YYYY-MM-DD",
        "description": str,
        "amount":      float,        # positive = income, negative = expense
        "category":    str | None,
    }
"""

from __future__ import annotations

import io
import re
from typing import Any

import pandas as pd

NormalizedTransaction = dict[str, Any]

# ─── Column aliases ──────────────────────────────────────────────────────────
# Primary headers are Thai (the downloadable template); English aliases are
# accepted too in case a user re-saves the template with translated headers.
_COLUMN_ALIASES: dict[str, list[str]] = {
    "date": ["วันที่", "date"],
    "description": ["รายการ", "description", "desc"],
    "category": ["หมวดหมู่", "category"],
    "amount": ["จำนวนเงิน", "amount"],
    "type": ["ประเภท", "type"],
}

_INCOME_VALUES = {"income", "รายรับ", "รับ", "in"}
_EXPENSE_VALUES = {"expense", "รายจ่าย", "จ่าย", "out"}


def _resolve_columns(columns: list[str]) -> dict[str, str]:
    """Map logical field names (date/description/...) to actual column names."""
    lower_to_actual = {str(c).strip().lower(): c for c in columns}
    resolved: dict[str, str] = {}
    for field, aliases in _COLUMN_ALIASES.items():
        for alias in aliases:
            actual = lower_to_actual.get(alias.lower())
            if actual is not None:
                resolved[field] = actual
                break
    return resolved


def _parse_date(s: str) -> str:
    """Convert ISO or DD/MM/YYYY (AD or BE) date strings to ISO 8601."""
    s = s.strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s

    sep = "/" if "/" in s else "-"
    parts = s.split(sep)
    if len(parts) == 3:
        day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
        if year > 2500:
            year -= 543  # Buddhist Era → Gregorian
        return f"{year:04d}-{month:02d}-{day:02d}"

    raise ValueError(f"ไม่สามารถแปลงวันที่ได้: {s!r}")


def _clean_amount(s: str) -> float | None:
    """Remove commas/spaces and parse Thai-style number strings."""
    if not s or str(s).strip() in ("", "-", "–", "—"):
        return None
    cleaned = re.sub(r"[,\s]", "", str(s).strip())
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_excel_template(content: bytes, filename: str = "template.xlsx") -> list[NormalizedTransaction]:
    """Parse the SME Excel/CSV template into normalized transactions.

    Raises:
        ValueError: file can't be read or required columns are missing.
    """
    ext = filename.rsplit(".", 1)[-1].lower()

    try:
        if ext in ("xlsx", "xls"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            text = content.decode("utf-8-sig", errors="replace")
            df = pd.read_csv(io.StringIO(text))
    except Exception as exc:
        raise ValueError(f"ไม่สามารถอ่านไฟล์ได้: {exc}") from exc

    cols = _resolve_columns([str(c) for c in df.columns])
    missing = [f for f in ("date", "description", "amount") if f not in cols]
    if missing:
        raise ValueError(
            "ไม่พบคอลัมน์ที่จำเป็น — ไฟล์ต้องมีคอลัมน์ วันที่, รายการ, จำนวนเงิน "
            "(และ หมวดหมู่, ประเภท แบบไม่บังคับ)"
        )

    results: list[NormalizedTransaction] = []

    for _, row in df.iterrows():
        date_raw = str(row.get(cols["date"], "")).strip()
        if not date_raw or date_raw.lower() == "nan":
            continue

        try:
            date_iso = _parse_date(date_raw)
        except ValueError:
            continue

        amount_val = _clean_amount(str(row.get(cols["amount"], "")))
        if amount_val is None:
            continue

        desc = str(row.get(cols["description"], "")).strip()

        type_raw = str(row.get(cols["type"], "")).strip().lower() if "type" in cols else ""
        if type_raw in _EXPENSE_VALUES:
            amount = -abs(amount_val)
        elif type_raw in _INCOME_VALUES:
            amount = abs(amount_val)
        else:
            amount = amount_val

        category_raw = str(row.get(cols["category"], "")).strip() if "category" in cols else ""
        category = category_raw if category_raw and category_raw.lower() != "nan" else None

        results.append({
            "date": date_iso,
            "description": desc,
            "amount": round(amount, 2),
            "category": category,
        })

    return results
