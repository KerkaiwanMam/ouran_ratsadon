"""
Accounting export parsers for Thai SME software: PEAK and FlowAccount.

Both parsers return a list of NormalizedJournalEntry dicts:
  {
    "date":        "YYYY-MM-DD",
    "doc_no":      str | None,   # invoice / receipt / journal number
    "account":     str | None,   # chart of accounts code or name
    "description": str,
    "debit":       float,        # 0 if credit entry
    "credit":      float,        # 0 if debit entry
    "net":         float,        # credit - debit (positive = income, negative = expense)
    "vat":         float | None,
    "wht":         float | None, # withholding tax
    "category":    str | None,   # mapped from PEAK/FlowAccount category field
    "source":      str,          # "PEAK" | "FLOWACCOUNT"
  }
"""

from __future__ import annotations

import re
import io
import csv
from datetime import datetime
from typing import Any

import pandas as pd


NormalizedJournalEntry = dict[str, Any]

# ─── Thai month names ─────────────────────────────────────────────────────────

_THAI_MONTHS = {
    "มกราคม": 1, "กุมภาพันธ์": 2, "มีนาคม": 3, "เมษายน": 4,
    "พฤษภาคม": 5, "มิถุนายน": 6, "กรกฎาคม": 7, "สิงหาคม": 8,
    "กันยายน": 9, "ตุลาคม": 10, "พฤศจิกายน": 11, "ธันวาคม": 12,
    # Short forms
    "ม.ค.": 1, "ก.พ.": 2, "มี.ค.": 3, "เม.ย.": 4,
    "พ.ค.": 5, "มิ.ย.": 6, "ก.ค.": 7, "ส.ค.": 8,
    "ก.ย.": 9, "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12,
    # English
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _parse_date(s: str) -> str:
    """Convert common Thai/ISO date formats to ISO 8601 YYYY-MM-DD."""
    if not s:
        raise ValueError(f"Empty date string")
    s = s.strip()

    # ISO: YYYY-MM-DD or YYYY/MM/DD
    m = re.match(r"^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$", s)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y > 2500:
            y -= 543
        return f"{y:04d}-{mo:02d}-{d:02d}"

    # DD/MM/YYYY or DD-MM-YYYY
    m = re.match(r"^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$", s)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y > 2500:
            y -= 543
        return f"{y:04d}-{mo:02d}-{d:02d}"

    # "DD ธันวาคม 2566" or "12 Dec 2023"
    m = re.match(r"^(\d{1,2})\s+(.+?)\s+(\d{4})$", s)
    if m:
        d = int(m.group(1))
        month_str = m.group(2).strip().lower()
        y = int(m.group(3))
        if y > 2500:
            y -= 543
        mo = _THAI_MONTHS.get(month_str) or _THAI_MONTHS.get(m.group(2).strip())
        if mo:
            return f"{y:04d}-{mo:02d}-{d:02d}"

    raise ValueError(f"Unrecognised date format: {s!r}")


def _clean_amount(s: Any) -> float:
    """Parse amount string → float. Handles commas, Thai dashes (–), parens."""
    if s is None or (isinstance(s, float) and pd.isna(s)):
        return 0.0
    s = str(s).strip().replace(",", "").replace("–", "-").replace("−", "-")
    if s in ("-", "", "–", "—"):
        return 0.0
    # Parentheses = negative: (1,234.56) → -1234.56
    m = re.match(r"^\((.+)\)$", s)
    if m:
        return -abs(float(m.group(1).replace(",", "")))
    try:
        return float(s)
    except ValueError:
        return 0.0


def _find_header_row(df: pd.DataFrame, keywords: list[str]) -> int:
    """Return the index of the first row that contains all given keywords."""
    for i, row in df.iterrows():
        row_lower = [str(v).lower().strip() for v in row.values]
        if all(any(kw in cell for cell in row_lower) for kw in keywords):
            return int(i)
    return -1


# ─── PEAK parser ─────────────────────────────────────────────────────────────

# PEAK export column aliases (case-insensitive)
_PEAK_DATE_COLS  = {"วันที่", "date", "transaction date", "วันที่ทำรายการ"}
_PEAK_DOC_COLS   = {"เลขที่เอกสาร", "doc no", "document no", "document number", "เลขที่"}
_PEAK_DESC_COLS  = {"รายการ", "description", "รายละเอียด", "detail"}
_PEAK_DEBIT_COLS = {"เดบิต", "debit", "จ่าย", "payment"}
_PEAK_CREDIT_COLS= {"เครดิต", "credit", "รับ", "receipt"}
_PEAK_ACCT_COLS  = {"บัญชี", "account", "รหัสบัญชี", "account code", "chart of account"}
_PEAK_CAT_COLS   = {"หมวดหมู่", "category", "ประเภท", "type"}
_PEAK_VAT_COLS   = {"vat", "ภาษีมูลค่าเพิ่ม", "ภาษี"}
_PEAK_WHT_COLS   = {"หัก ณ ที่จ่าย", "wht", "withholding", "ภาษีหัก ณ ที่จ่าย"}


def _match_col(df: pd.DataFrame, aliases: set[str]) -> str | None:
    """Return the first DataFrame column whose lowercased name is in aliases."""
    for col in df.columns:
        if str(col).lower().strip() in aliases:
            return col
    return None


def parse_peak(content: bytes, filename: str) -> list[NormalizedJournalEntry]:
    """Parse a PEAK accounting export (CSV or XLSX)."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext in ("xlsx", "xls"):
        raw = pd.read_excel(io.BytesIO(content), header=None, dtype=str)
    else:
        text = content.decode("utf-8-sig", errors="replace")
        raw = pd.read_csv(io.StringIO(text), header=None, dtype=str)

    # Detect header row
    hdr = _find_header_row(raw, ["วันที่", "รายการ"]) or \
          _find_header_row(raw, ["date", "description"])
    if hdr < 0:
        hdr = 0

    df = raw.iloc[hdr + 1:].copy()
    df.columns = raw.iloc[hdr].values
    df = df.dropna(how="all").reset_index(drop=True)

    date_col   = _match_col(df, _PEAK_DATE_COLS)
    doc_col    = _match_col(df, _PEAK_DOC_COLS)
    desc_col   = _match_col(df, _PEAK_DESC_COLS)
    debit_col  = _match_col(df, _PEAK_DEBIT_COLS)
    credit_col = _match_col(df, _PEAK_CREDIT_COLS)
    acct_col   = _match_col(df, _PEAK_ACCT_COLS)
    cat_col    = _match_col(df, _PEAK_CAT_COLS)
    vat_col    = _match_col(df, _PEAK_VAT_COLS)
    wht_col    = _match_col(df, _PEAK_WHT_COLS)

    if not date_col or not desc_col:
        raise ValueError("ไม่พบคอลัมน์ที่จำเป็น (วันที่, รายการ) ใน PEAK export")

    results: list[NormalizedJournalEntry] = []
    for _, row in df.iterrows():
        raw_date = str(row[date_col]).strip() if date_col else ""
        if not raw_date or raw_date.lower() in ("nan", "none", ""):
            continue
        try:
            iso_date = _parse_date(raw_date)
        except ValueError:
            continue

        debit  = _clean_amount(row[debit_col])  if debit_col  else 0.0
        credit = _clean_amount(row[credit_col]) if credit_col else 0.0
        net    = credit - debit

        results.append({
            "date":        iso_date,
            "doc_no":      str(row[doc_col]).strip()  if doc_col  else None,
            "account":     str(row[acct_col]).strip() if acct_col else None,
            "description": str(row[desc_col]).strip(),
            "debit":       debit,
            "credit":      credit,
            "net":         net,
            "vat":         _clean_amount(row[vat_col]) if vat_col else None,
            "wht":         _clean_amount(row[wht_col]) if wht_col else None,
            "category":    str(row[cat_col]).strip()  if cat_col  else None,
            "source":      "PEAK",
        })

    return results


# ─── FlowAccount parser ───────────────────────────────────────────────────────

_FA_DATE_COLS   = {"วันที่", "date", "transaction date", "วันที่ทำรายการ", "issue date", "วันที่ออก"}
_FA_DOC_COLS    = {"เลขที่", "doc no", "เลขที่เอกสาร", "invoice no", "receipt no"}
_FA_DESC_COLS   = {"รายการ", "description", "รายละเอียด", "item description", "detail"}
_FA_INCOME_COLS = {"รายรับ", "income", "revenue", "ยอดรับ", "amount received"}
_FA_EXPENSE_COLS= {"รายจ่าย", "expense", "ค่าใช้จ่าย", "ยอดจ่าย", "amount paid"}
_FA_NET_COLS    = {"ยอดสุทธิ", "net amount", "net", "ยอดรวม", "total"}
_FA_CAT_COLS    = {"หมวดหมู่", "category", "ประเภท", "type", "account type"}
_FA_VAT_COLS    = {"vat", "ภาษีมูลค่าเพิ่ม", "tax amount"}
_FA_WHT_COLS    = {"หัก ณ ที่จ่าย", "wht", "withholding tax"}
_FA_STATUS_COLS = {"สถานะ", "status", "payment status"}


def parse_flowaccount(content: bytes, filename: str) -> list[NormalizedJournalEntry]:
    """Parse a FlowAccount accounting export (CSV or XLSX)."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext in ("xlsx", "xls"):
        raw = pd.read_excel(io.BytesIO(content), header=None, dtype=str)
    else:
        text = content.decode("utf-8-sig", errors="replace")
        raw = pd.read_csv(io.StringIO(text), header=None, dtype=str)

    # FlowAccount usually has a title row + blank + header row
    hdr = _find_header_row(raw, ["วันที่", "รายการ"]) or \
          _find_header_row(raw, ["date", "description"])
    if hdr < 0:
        hdr = 0

    df = raw.iloc[hdr + 1:].copy()
    df.columns = raw.iloc[hdr].values
    df = df.dropna(how="all").reset_index(drop=True)

    date_col    = _match_col(df, _FA_DATE_COLS)
    doc_col     = _match_col(df, _FA_DOC_COLS)
    desc_col    = _match_col(df, _FA_DESC_COLS)
    income_col  = _match_col(df, _FA_INCOME_COLS)
    expense_col = _match_col(df, _FA_EXPENSE_COLS)
    net_col     = _match_col(df, _FA_NET_COLS)
    cat_col     = _match_col(df, _FA_CAT_COLS)
    vat_col     = _match_col(df, _FA_VAT_COLS)
    wht_col     = _match_col(df, _FA_WHT_COLS)

    if not date_col or not desc_col:
        raise ValueError("ไม่พบคอลัมน์ที่จำเป็น (วันที่, รายการ) ใน FlowAccount export")

    results: list[NormalizedJournalEntry] = []
    for _, row in df.iterrows():
        raw_date = str(row[date_col]).strip()
        if not raw_date or raw_date.lower() in ("nan", "none", ""):
            continue
        try:
            iso_date = _parse_date(raw_date)
        except ValueError:
            continue

        income  = _clean_amount(row[income_col])  if income_col  else 0.0
        expense = _clean_amount(row[expense_col]) if expense_col else 0.0

        # Prefer explicit net column; otherwise derive from income/expense
        if net_col:
            net = _clean_amount(row[net_col])
        else:
            net = income - expense

        # Map to debit/credit for consistency with PEAK output
        credit = income  if income  > 0 else 0.0
        debit  = expense if expense > 0 else 0.0

        results.append({
            "date":        iso_date,
            "doc_no":      str(row[doc_col]).strip()  if doc_col  else None,
            "account":     None,
            "description": str(row[desc_col]).strip(),
            "debit":       debit,
            "credit":      credit,
            "net":         net,
            "vat":         _clean_amount(row[vat_col]) if vat_col else None,
            "wht":         _clean_amount(row[wht_col]) if wht_col else None,
            "category":    str(row[cat_col]).strip()  if cat_col  else None,
            "source":      "FLOWACCOUNT",
        })

    return results


# ─── Dispatcher ──────────────────────────────────────────────────────────────

def parse_accounting_export(
    content: bytes,
    software: str,
    filename: str,
) -> list[NormalizedJournalEntry]:
    """
    Dispatch to the correct parser.

    :param software: "PEAK" | "FLOWACCOUNT"
    """
    software = software.upper()
    if software == "PEAK":
        return parse_peak(content, filename)
    elif software in ("FLOWACCOUNT", "FLOW_ACCOUNT"):
        return parse_flowaccount(content, filename)
    else:
        raise ValueError(f"Unknown accounting software: {software!r}. Use PEAK or FLOWACCOUNT.")
