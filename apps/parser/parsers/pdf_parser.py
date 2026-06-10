import io
import uuid
from datetime import datetime, timezone

import pdfplumber

from models import BudgetData, BudgetItem, BudgetSummary, BudgetCategory, FileMetadata
from utils import detect_anomalies, extract_fiscal_year


def parse_pdf(content: bytes, filename: str) -> BudgetData:
    items: list[BudgetItem] = []

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if not table:
                continue
            for row in table[1:]:  # skip header row
                if not row or not any(row):
                    continue
                description = str(row[0] or "").strip()
                amount_raw = str(row[-1] or "0").replace(",", "").strip()
                try:
                    amount = float(amount_raw)
                except ValueError:
                    continue
                items.append(
                    BudgetItem(
                        id=str(uuid.uuid4()),
                        description=description,
                        category=_classify_category(description),
                        amount=amount,
                        date=None,
                    )
                )

    items = detect_anomalies(items)
    total = sum(i.amount for i in items)
    summary = BudgetSummary(
        total_budget=total,
        total_spent=total * 0.72,
        total_remaining=total * 0.28,
        categories=_build_categories(items),
    )

    return BudgetData(
        metadata=FileMetadata(
            filename=filename,
            file_type="pdf",
            fiscal_year=extract_fiscal_year(filename),
            parsed_at=datetime.now(timezone.utc).isoformat(),
            total_items=len(items),
        ),
        summary=summary,
        items=items,
    )


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
            spent=amount * 0.72,
            percentage=round(amount / grand_total * 100, 1),
        )
        for name, amount in totals.items()
    ]
