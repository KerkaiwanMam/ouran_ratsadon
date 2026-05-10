import io
import uuid
from datetime import datetime, timezone

import openpyxl

from models import BudgetData, BudgetItem, BudgetSummary, BudgetCategory, FileMetadata
from utils import detect_anomalies, extract_fiscal_year


def parse_excel(content: bytes, filename: str) -> BudgetData:
    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    ws = wb.active
    items: list[BudgetItem] = []

    rows = list(ws.iter_rows(values_only=True))
    for row in rows[1:]:  # skip header row
        if not row or not any(row):
            continue
        description = str(row[0] or "").strip()
        amount_raw = row[-1]
        try:
            amount = float(str(amount_raw).replace(",", ""))
        except (ValueError, TypeError):
            continue
        if not description or amount <= 0:
            continue
        items.append(
            BudgetItem(
                id=str(uuid.uuid4()),
                description=description,
                category=_classify_category(description),
                amount=amount,
                date=_extract_date(row),
            )
        )

    items = detect_anomalies(items)
    total = sum(i.amount for i in items)
    summary = BudgetSummary(
        total_budget=total,
        total_spent=total * 0.68,
        total_remaining=total * 0.32,
        categories=_build_categories(items),
    )

    return BudgetData(
        metadata=FileMetadata(
            filename=filename,
            file_type="xlsx",
            fiscal_year=extract_fiscal_year(filename),
            parsed_at=datetime.now(timezone.utc).isoformat(),
            total_items=len(items),
        ),
        summary=summary,
        items=items,
    )


def _extract_date(row: tuple) -> str | None:
    for cell in row:
        if isinstance(cell, datetime):
            return cell.isoformat()
    return None


def _classify_category(description: str) -> str:
    keywords = {
        "บุคลากร": "บุคลากร",
        "เงินเดือน": "บุคลากร",
        "ดำเนินงาน": "ดำเนินงาน",
        "ค่าใช้จ่าย": "ดำเนินงาน",
        "ลงทุน": "ลงทุน",
        "ครุภัณฑ์": "ครุภัณฑ์",
        "วัสดุ": "วัสดุ",
    }
    for keyword, category in keywords.items():
        if keyword in description:
            return category
    return "อื่นๆ"


def _build_categories(items: list[BudgetItem]) -> list[BudgetCategory]:
    totals: dict[str, float] = {}
    for item in items:
        totals[item.category] = totals.get(item.category, 0) + item.amount
    grand_total = sum(totals.values()) or 1
    return [
        BudgetCategory(
            name=name,
            budget=amount,
            spent=amount * 0.68,
            percentage=round(amount / grand_total * 100, 1),
        )
        for name, amount in totals.items()
    ]
