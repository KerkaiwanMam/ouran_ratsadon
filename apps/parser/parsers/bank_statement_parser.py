"""
Bank statement parsers for Thai banks (SCB, KBANK, BBL).

Each parser returns a list of NormalizedTransaction dicts:
  {
    "date":        "YYYY-MM-DD",
    "description": str,
    "amount":      float,        # positive = income, negative = expense
    "balance":     float | None,
    "channel":     str | None,   # ATM / INTERNET / BRANCH / TRANSFER
    "ref":         str | None,   # reference/trace number
  }

Caller is expected to map these to the SMEFinancialData transaction shape.
"""

from __future__ import annotations

import re
import io
import csv
from datetime import datetime
from typing import Any

import pandas as pd


# ─── Type alias ─────────────────────────────────────────────────────────────

NormalizedTransaction = dict[str, Any]


# ─── Helper utilities ────────────────────────────────────────────────────────

def _parse_thai_date(s: str) -> str:
    """Convert common Thai date formats to ISO 8601.

    Accepts:
        - "DD/MM/YYYY"  (AD or BE — auto-detect by year range)
        - "DD-MM-YYYY"
        - "YYYY-MM-DD"
        - "DD MMM YYYY" / "DD MMM YY"  (English or Thai month abbreviations)
    """
    s = s.strip()

    # Already ISO
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s

    # Thai month abbreviations map
    THAI_MONTHS = {
        "ม.ค.": 1, "ก.พ.": 2, "มี.ค.": 3, "เม.ย.": 4,
        "พ.ค.": 5, "มิ.ย.": 6, "ก.ค.": 7, "ส.ค.": 8,
        "ก.ย.": 9, "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12,
        "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4,
        "MAY": 5, "JUN": 6, "JUL": 7, "AUG": 8,
        "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
    }

    for abbr, month_num in THAI_MONTHS.items():
        if abbr in s.upper():
            parts = s.replace(abbr, f"-{month_num}-").split("-")
            parts = [p.strip() for p in parts if p.strip()]
            if len(parts) >= 3:
                day = int(parts[0])
                month = month_num
                year = int(parts[-1])
                if year < 2500:
                    year += 543  # already AD
                if year > 2500:
                    year -= 543  # convert BE → AD
                return f"{year:04d}-{month:02d}-{day:02d}"

    # DD/MM/YYYY or DD-MM-YYYY
    sep = "/" if "/" in s else "-"
    parts = s.split(sep)
    if len(parts) == 3:
        day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
        if year > 2500:
            year -= 543
        return f"{year:04d}-{month:02d}-{day:02d}"

    raise ValueError(f"ไม่สามารถแปลงวันที่ได้: {s!r}")


def _clean_amount(s: str) -> float | None:
    """Remove commas, spaces, and parse Thai-style number strings."""
    if not s or str(s).strip() in ("", "-", "–", "—"):
        return None
    cleaned = re.sub(r"[,\s]", "", str(s).strip())
    try:
        return float(cleaned)
    except ValueError:
        return None


def _infer_channel(desc: str) -> str:
    """Infer transaction channel from description text."""
    desc_upper = desc.upper()
    if any(k in desc_upper for k in ("ATM", "เอทีเอ็ม")):
        return "ATM"
    if any(k in desc_upper for k in ("INTERNET", "ONLINE", "MOBILE", "EASY APP", "K PLUS", "SCB EASY")):
        return "INTERNET"
    if any(k in desc_upper for k in ("TRANSFER", "TRSF", "โอน")):
        return "TRANSFER"
    if any(k in desc_upper for k in ("BRANCH", "COUNTER", "สาขา", "เคาน์เตอร์")):
        return "BRANCH"
    if any(k in desc_upper for k in ("PROMPTPAY", "พร้อมเพย์")):
        return "PROMPTPAY"
    return "OTHER"


# ─── SCB (Siam Commercial Bank) ──────────────────────────────────────────────

def parse_scb(content: bytes, filename: str = "scb_statement.csv") -> list[NormalizedTransaction]:
    """Parse SCB CSV/XLSX bank statement.

    SCB CSV format (exported from SCB Easy App):
        Column layout (typical):
            วันที่ | รายการ | ถอน/เดบิต | ฝาก/เครดิต | คงเหลือ

    SCB also exports XLSX from branch with slightly different column names.
    """
    ext = filename.rsplit(".", 1)[-1].lower()

    try:
        if ext in ("xlsx", "xls"):
            df = pd.read_excel(io.BytesIO(content), header=None)
        else:
            text = content.decode("utf-8-sig", errors="replace")
            df = pd.read_csv(io.StringIO(text), header=None)
    except Exception as exc:
        raise ValueError(f"ไม่สามารถอ่านไฟล์ SCB ได้: {exc}") from exc

    # Detect header row (contains date-like keyword)
    header_row = 0
    for i, row in df.iterrows():
        row_str = " ".join(str(v) for v in row.values).upper()
        if any(k in row_str for k in ("วันที่", "DATE", "รายการ", "DESCRIPTION")):
            header_row = int(str(i))
            break

    df = pd.read_excel(io.BytesIO(content), header=header_row) if ext in ("xlsx", "xls") else \
         pd.read_csv(io.StringIO(content.decode("utf-8-sig", errors="replace")), header=header_row)
    df.columns = [str(c).strip() for c in df.columns]

    # Normalise column names
    COL_MAP = {
        "date":    ["วันที่", "DATE", "Transaction Date", "TXN DATE"],
        "desc":    ["รายการ", "Description", "DESCRIPTION", "Remark", "หมายเหตุ"],
        "debit":   ["ถอน", "DEBIT", "เดบิต", "Withdrawal"],
        "credit":  ["ฝาก", "CREDIT", "เครดิต", "Deposit"],
        "balance": ["คงเหลือ", "Balance", "BALANCE"],
        "ref":     ["เลขที่อ้างอิง", "Reference", "REF", "Ref.No"],
    }

    def find_col(keys: list[str]) -> str | None:
        for k in keys:
            for col in df.columns:
                if k.lower() in col.lower():
                    return col
        return None

    date_col    = find_col(COL_MAP["date"])
    desc_col    = find_col(COL_MAP["desc"])
    debit_col   = find_col(COL_MAP["debit"])
    credit_col  = find_col(COL_MAP["credit"])
    balance_col = find_col(COL_MAP["balance"])
    ref_col     = find_col(COL_MAP["ref"])

    if not date_col or not desc_col:
        raise ValueError("ไม่พบคอลัมน์วันที่หรือรายการในไฟล์ SCB — กรุณาตรวจสอบรูปแบบไฟล์")

    results: list[NormalizedTransaction] = []

    for _, row in df.iterrows():
        date_raw = str(row.get(date_col, "")).strip()
        if not date_raw or date_raw.lower() in ("nan", "วันที่", "date"):
            continue

        try:
            date_iso = _parse_thai_date(date_raw)
        except ValueError:
            continue

        debit_val  = _clean_amount(str(row.get(debit_col, "") if debit_col else ""))
        credit_val = _clean_amount(str(row.get(credit_col, "") if credit_col else ""))
        balance    = _clean_amount(str(row.get(balance_col, "") if balance_col else ""))
        desc       = str(row.get(desc_col, "")).strip()
        ref        = str(row.get(ref_col, "")).strip() if ref_col else None

        # Compute signed amount: credit = +, debit = -
        if credit_val and credit_val > 0:
            amount = credit_val
        elif debit_val and debit_val > 0:
            amount = -debit_val
        else:
            continue

        results.append({
            "date":        date_iso,
            "description": desc,
            "amount":      round(amount, 2),
            "balance":     balance,
            "channel":     _infer_channel(desc),
            "ref":         ref if ref and ref != "nan" else None,
            "bank":        "SCB",
        })

    return results


# ─── KBANK (Kasikorn Bank) ────────────────────────────────────────────────────

def parse_kbank(content: bytes, filename: str = "kbank_statement.csv") -> list[NormalizedTransaction]:
    """Parse KBANK CSV/XLSX bank statement.

    KBANK CSV format (exported from K PLUS or branch):
        วันที่ / เวลา | รายการ | จำนวนเงิน (ถอน) | จำนวนเงิน (ฝาก) | คงเหลือ

    K PLUS app exports with slightly different headers — we normalise both.
    """
    ext = filename.rsplit(".", 1)[-1].lower()

    try:
        if ext in ("xlsx", "xls"):
            # KBANK XLSX often has account info rows at the top
            df_raw = pd.read_excel(io.BytesIO(content), header=None)
        else:
            text = content.decode("utf-8-sig", errors="replace")
            df_raw = pd.read_csv(io.StringIO(text), header=None)
    except Exception as exc:
        raise ValueError(f"ไม่สามารถอ่านไฟล์ KBANK ได้: {exc}") from exc

    # Find header row
    header_row = 0
    for i, row in df_raw.iterrows():
        row_str = " ".join(str(v) for v in row.values).upper()
        if any(k in row_str for k in ("วันที่", "DATE")):
            header_row = int(str(i))
            break

    if ext in ("xlsx", "xls"):
        df = pd.read_excel(io.BytesIO(content), header=header_row)
    else:
        df = pd.read_csv(
            io.StringIO(content.decode("utf-8-sig", errors="replace")),
            header=header_row
        )
    df.columns = [str(c).strip() for c in df.columns]

    COL_MAP = {
        "date":    ["วันที่", "DATE", "Transaction Date"],
        "time":    ["เวลา", "TIME"],
        "desc":    ["รายการ", "Description", "DESCRIPTION", "Channel", "ช่องทาง"],
        "debit":   ["ถอน", "DEBIT", "จำนวนเงิน (ถอน)", "Withdrawal"],
        "credit":  ["ฝาก", "CREDIT", "จำนวนเงิน (ฝาก)", "Deposit"],
        "balance": ["คงเหลือ", "Balance", "BALANCE"],
        "ref":     ["เลขที่อ้างอิง", "Reference No.", "Ref"],
    }

    def find_col(keys: list[str]) -> str | None:
        for k in keys:
            for col in df.columns:
                if k.lower() in col.lower():
                    return col
        return None

    date_col    = find_col(COL_MAP["date"])
    desc_col    = find_col(COL_MAP["desc"])
    debit_col   = find_col(COL_MAP["debit"])
    credit_col  = find_col(COL_MAP["credit"])
    balance_col = find_col(COL_MAP["balance"])
    ref_col     = find_col(COL_MAP["ref"])

    if not date_col:
        raise ValueError("ไม่พบคอลัมน์วันที่ในไฟล์ KBANK — กรุณาตรวจสอบรูปแบบไฟล์")

    results: list[NormalizedTransaction] = []

    for _, row in df.iterrows():
        date_raw = str(row.get(date_col, "")).strip()
        if not date_raw or date_raw.lower() in ("nan", "วันที่", "date"):
            continue

        try:
            date_iso = _parse_thai_date(date_raw)
        except ValueError:
            continue

        debit_val  = _clean_amount(str(row.get(debit_col, "") if debit_col else ""))
        credit_val = _clean_amount(str(row.get(credit_col, "") if credit_col else ""))
        balance    = _clean_amount(str(row.get(balance_col, "") if balance_col else ""))
        desc       = str(row.get(desc_col, "")).strip() if desc_col else ""
        ref        = str(row.get(ref_col, "")).strip() if ref_col else None

        if credit_val and credit_val > 0:
            amount = credit_val
        elif debit_val and debit_val > 0:
            amount = -debit_val
        else:
            continue

        results.append({
            "date":        date_iso,
            "description": desc,
            "amount":      round(amount, 2),
            "balance":     balance,
            "channel":     _infer_channel(desc),
            "ref":         ref if ref and ref != "nan" else None,
            "bank":        "KBANK",
        })

    return results


# ─── BBL (Bangkok Bank) ───────────────────────────────────────────────────────

def parse_bbl(content: bytes, filename: str = "bbl_statement.csv") -> list[NormalizedTransaction]:
    """Parse BBL CSV/XLSX bank statement.

    BBL CSV format (exported from Bualuang ibanking):
        วันที่ | คำอธิบาย | รหัสอ้างอิง | ถอน | ฝาก | คงเหลือ

    BBL date format is typically DD/MM/YYYY in Buddhist Era (BE).
    """
    ext = filename.rsplit(".", 1)[-1].lower()

    try:
        if ext in ("xlsx", "xls"):
            df_raw = pd.read_excel(io.BytesIO(content), header=None)
        else:
            text = content.decode("utf-8-sig", errors="replace")
            df_raw = pd.read_csv(io.StringIO(text), header=None)
    except Exception as exc:
        raise ValueError(f"ไม่สามารถอ่านไฟล์ BBL ได้: {exc}") from exc

    # Find header row
    header_row = 0
    for i, row in df_raw.iterrows():
        row_str = " ".join(str(v) for v in row.values).upper()
        if any(k in row_str for k in ("วันที่", "DATE", "DESCRIPTION", "คำอธิบาย")):
            header_row = int(str(i))
            break

    if ext in ("xlsx", "xls"):
        df = pd.read_excel(io.BytesIO(content), header=header_row)
    else:
        df = pd.read_csv(
            io.StringIO(content.decode("utf-8-sig", errors="replace")),
            header=header_row
        )
    df.columns = [str(c).strip() for c in df.columns]

    COL_MAP = {
        "date":    ["วันที่", "Date", "DATE", "Transaction Date"],
        "desc":    ["คำอธิบาย", "Description", "DESCRIPTION", "Remarks"],
        "debit":   ["ถอน", "Withdrawal", "DEBIT", "Debit"],
        "credit":  ["ฝาก", "Deposit", "CREDIT", "Credit"],
        "balance": ["คงเหลือ", "Balance", "BALANCE"],
        "ref":     ["รหัสอ้างอิง", "Reference", "Ref", "Cheque No"],
    }

    def find_col(keys: list[str]) -> str | None:
        for k in keys:
            for col in df.columns:
                if k.lower() in col.lower():
                    return col
        return None

    date_col    = find_col(COL_MAP["date"])
    desc_col    = find_col(COL_MAP["desc"])
    debit_col   = find_col(COL_MAP["debit"])
    credit_col  = find_col(COL_MAP["credit"])
    balance_col = find_col(COL_MAP["balance"])
    ref_col     = find_col(COL_MAP["ref"])

    if not date_col:
        raise ValueError("ไม่พบคอลัมน์วันที่ในไฟล์ BBL — กรุณาตรวจสอบรูปแบบไฟล์")

    results: list[NormalizedTransaction] = []

    for _, row in df.iterrows():
        date_raw = str(row.get(date_col, "")).strip()
        if not date_raw or date_raw.lower() in ("nan", "วันที่", "date"):
            continue

        try:
            date_iso = _parse_thai_date(date_raw)
        except ValueError:
            continue

        debit_val  = _clean_amount(str(row.get(debit_col, "") if debit_col else ""))
        credit_val = _clean_amount(str(row.get(credit_col, "") if credit_col else ""))
        balance    = _clean_amount(str(row.get(balance_col, "") if balance_col else ""))
        desc       = str(row.get(desc_col, "")).strip() if desc_col else ""
        ref        = str(row.get(ref_col, "")).strip() if ref_col else None

        if credit_val and credit_val > 0:
            amount = credit_val
        elif debit_val and debit_val > 0:
            amount = -debit_val
        else:
            continue

        results.append({
            "date":        date_iso,
            "description": desc,
            "amount":      round(amount, 2),
            "balance":     balance,
            "channel":     _infer_channel(desc),
            "ref":         ref if ref and ref != "nan" else None,
            "bank":        "BBL",
        })

    return results


# ─── Dispatcher ──────────────────────────────────────────────────────────────

BANK_PARSERS = {
    "SCB":   parse_scb,
    "KBANK": parse_kbank,
    "BBL":   parse_bbl,
}


def parse_bank_statement(
    content: bytes,
    bank: str,
    filename: str = "statement.csv",
) -> list[NormalizedTransaction]:
    """Dispatch to the correct bank parser.

    Args:
        content: Raw file bytes.
        bank:    One of "SCB", "KBANK", "BBL" (case-insensitive).
        filename: Original filename (used for extension detection).

    Returns:
        List of NormalizedTransaction dicts.

    Raises:
        ValueError: Unknown bank or parse error.
    """
    bank_upper = bank.upper()
    parser = BANK_PARSERS.get(bank_upper)
    if not parser:
        raise ValueError(
            f"ธนาคาร {bank!r} ไม่รองรับ — รองรับเฉพาะ: {', '.join(BANK_PARSERS)}"
        )
    return parser(content, filename=filename)
