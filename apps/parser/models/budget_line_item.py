"""Unified row schema for parsed government budget documents — mirrors the
Prisma `BudgetLineItem` model (prisma/schema.prisma) and the Data Dict
(2025-05-25). Whatever the source format (html / xlsx / csv), the parser
normalizes every row into this shape so the admin upload API can validate
and persist it the same way regardless of where it came from.
"""

from pydantic import BaseModel, Field
from typing import Literal


class BudgetLineItemRow(BaseModel):
    # Traceability — which source document / page this row came from
    refDoc: str
    refPageNo: int = 0

    # Organizational hierarchy (Data Dict columns)
    ministry: str
    strategy: str | None = None
    motherPlan: str | None = None
    crossFunc: bool = False
    budgetaryUnit: str
    budgetPlan: str

    # Mutually exclusive — a row belongs to either an "output" (ผลผลิต)
    # or a "project" (โครงการ), never both
    output: str | None = None
    project: str | None = None

    # Expenditure category breakdown, up to 6 levels deep
    categoryLv1: str | None = None
    categoryLv2: str | None = None
    categoryLv3: str | None = None
    categoryLv4: str | None = None
    categoryLv5: str | None = None
    categoryLv6: str | None = None

    itemDescription: str | None = None

    fiscalYear: int
    amount: float
    obliged: bool = False


class ParseResult(BaseModel):
    """Result envelope returned by /parse/government-budget."""

    sourceFormat: Literal["html", "xlsx", "csv"]
    filename: str
    fiscalYear: int | None = None
    totalRows: int
    rows: list[BudgetLineItemRow]
    # Non-fatal issues found while parsing (e.g. skipped rows) — surfaced to
    # the admin UI so problems are visible without failing the whole upload
    warnings: list[str] = Field(default_factory=list)
