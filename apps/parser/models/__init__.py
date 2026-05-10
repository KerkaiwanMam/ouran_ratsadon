from pydantic import BaseModel
from typing import Literal


class FileMetadata(BaseModel):
    filename: str
    file_type: Literal["pdf", "xlsx"]
    fiscal_year: str | None = None
    organization: str | None = None
    parsed_at: str
    total_items: int


class BudgetCategory(BaseModel):
    name: str
    budget: float
    spent: float
    percentage: float


class BudgetSummary(BaseModel):
    total_budget: float
    total_spent: float
    total_remaining: float
    categories: list[BudgetCategory]


class BudgetItem(BaseModel):
    id: str
    description: str
    category: str
    amount: float
    date: str | None = None
    anomaly_flag: Literal["none", "warning", "critical"] = "none"
    anomaly_reason: str | None = None


class BudgetData(BaseModel):
    metadata: FileMetadata
    summary: BudgetSummary
    items: list[BudgetItem]
