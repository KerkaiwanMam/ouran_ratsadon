import re
import statistics
from models import BudgetItem


def detect_anomalies(items: list[BudgetItem]) -> list[BudgetItem]:
    if len(items) < 3:
        return items

    amounts = [i.amount for i in items]
    mean = statistics.mean(amounts)
    stdev = statistics.stdev(amounts)

    result: list[BudgetItem] = []
    for item in items:
        z = abs(item.amount - mean) / stdev if stdev > 0 else 0
        if z > 3:
            item.anomaly_flag = "critical"
            item.anomaly_reason = f"ค่าสูงกว่าค่าเฉลี่ย {z:.1f} ส่วนเบี่ยงเบนมาตรฐาน"
        elif z > 2:
            item.anomaly_flag = "warning"
            item.anomaly_reason = f"ค่าสูงกว่าค่าเฉลี่ย {z:.1f} ส่วนเบี่ยงเบนมาตรฐาน"
        result.append(item)

    return result


def extract_fiscal_year(filename: str) -> str | None:
    match = re.search(r"(256[0-9]|255[0-9])", filename)
    if match:
        return match.group(1)
    return None
