from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any

from parsers.pdf_parser import parse_pdf
from parsers.excel_parser import parse_excel
from parsers.government_budget_parser import parse_government_budget
from parsers.bank_statement_parser import parse_bank_statement
from parsers.accounting_export_parser import parse_accounting_export
from models import BudgetData, ParseResult

app = FastAPI(
    title="ouran-ratsadon Parser Microservice",
    version="0.1.0",
    description="Internal parser service สำหรับแปลงไฟล์งบประมาณรัฐและข้อมูลการเงิน SME ให้เป็น JSON",
    openapi_tags=[
        {"name": "Health", "description": "Health check"},
        {"name": "Civic Parsers", "description": "แปลงไฟล์งบประมาณรัฐ (Admin only)"},
        {"name": "Business Parsers", "description": "แปลงไฟล์การเงิน SME"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/parse/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok"}


@app.post("/parse/pdf", response_model=BudgetData, tags=["Civic Parsers"], summary="แปลง PDF งบประมาณรัฐ")
async def upload_pdf(file: UploadFile = File(...)) -> BudgetData:
    if file.content_type not in ("application/pdf",):
        raise HTTPException(status_code=400, detail="ไฟล์ต้องเป็น PDF เท่านั้น")
    content = await file.read()
    return parse_pdf(content, filename=file.filename or "upload.pdf")


@app.post("/parse/excel", response_model=BudgetData, tags=["Civic Parsers"], summary="แปลง Excel งบประมาณรัฐ")
async def upload_excel(file: UploadFile = File(...)) -> BudgetData:
    allowed = (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
    )
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="ไฟล์ต้องเป็น Excel เท่านั้น")
    content = await file.read()
    return parse_excel(content, filename=file.filename or "upload.xlsx")


@app.post("/parse/government-budget", response_model=ParseResult, tags=["Civic Parsers"], summary="แปลงไฟล์งบประมาณรัฐ (HTML/XLSX/CSV)")
async def upload_government_budget(
    file: UploadFile = File(...),
    fiscal_year: int | None = Form(default=None),
) -> ParseResult:
    """Multi-format ingestion endpoint for Civic Layer admin uploads.

    Detects sourceFormat (html / xlsx / csv) from filename/content-type,
    parses into the unified BudgetLineItemRow shape (mirrors the Data Dict
    and Prisma `BudgetLineItem`), and returns rows + non-fatal warnings so
    the admin UI can review before committing to the upload pipeline
    (POST /api/admin/civic-data/upload in the Next.js app).
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="ไฟล์ว่างเปล่า — กรุณาอัปโหลดไฟล์ใหม่")

    # Must match the limit enforced in apps/web/.../admin/civic-data/upload/route.ts
    # (MAX_FILE_SIZE = 150 MB) — a mismatch here causes files between the two
    # limits to pass the Next.js check and then fail at the parser with a
    # confusing different-limit message even though the UI said up to 150 MB.
    MAX_SIZE = 150 * 1024 * 1024  # 150 MB
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="ไฟล์มีขนาดใหญ่เกินไป (จำกัดไม่เกิน 150 MB)")

    try:
        return parse_government_budget(
            content,
            filename=file.filename or "upload",
            content_type=file.content_type,
            fiscal_year_hint=fiscal_year,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


# ─── Bank statement endpoints ─────────────────────────────────────────────────

class BankStatementResponse(BaseModel):
    bank: str
    transactionCount: int
    transactions: list[dict[str, Any]]
    warnings: list[str]


SUPPORTED_BANKS = {"SCB", "KBANK", "BBL"}

ALLOWED_CONTENT_TYPES = {
    "text/csv",
    "application/csv",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    # Some browsers send octet-stream for CSV
    "application/octet-stream",
}

MAX_BANK_FILE_SIZE = 20 * 1024 * 1024  # 20 MB — bank statements are tiny


@app.post("/parse/bank-statement", response_model=BankStatementResponse, tags=["Business Parsers"], summary="แปลง Bank Statement (SCB/KBANK/BBL)")
async def parse_bank(
    file: UploadFile = File(...),
    bank: str = Form(...),
) -> BankStatementResponse:
    """Parse a Thai bank statement CSV/XLSX into normalised transactions.

    Args:
        file: The uploaded bank statement file (.csv or .xlsx).
        bank: Bank identifier — one of "SCB", "KBANK", "BBL".

    Returns:
        BankStatementResponse with parsed transactions and any warnings.
    """
    bank_upper = bank.strip().upper()
    if bank_upper not in SUPPORTED_BANKS:
        raise HTTPException(
            status_code=400,
            detail=f"ธนาคาร {bank!r} ไม่รองรับ — รองรับเฉพาะ: {', '.join(sorted(SUPPORTED_BANKS))}",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="ไฟล์ว่างเปล่า")

    if len(content) > MAX_BANK_FILE_SIZE:
        raise HTTPException(status_code=413, detail="ไฟล์มีขนาดเกิน 20 MB")

    filename = file.filename or f"{bank_upper}_statement.csv"

    try:
        transactions = parse_bank_statement(content, bank=bank_upper, filename=filename)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    warnings: list[str] = []
    if len(transactions) == 0:
        warnings.append("ไม่พบรายการธุรกรรมในไฟล์ — กรุณาตรวจสอบว่าเลือกรูปแบบธนาคารถูกต้อง")

    return BankStatementResponse(
        bank=bank_upper,
        transactionCount=len(transactions),
        transactions=transactions,
        warnings=warnings,
    )


# ─── Accounting export endpoints ──────────────────────────────────────────────

class AccountingExportResponse(BaseModel):
    software: str
    entryCount: int
    entries: list[dict[str, Any]]
    warnings: list[str]


SUPPORTED_ACCOUNTING = {"PEAK", "FLOWACCOUNT"}


@app.post("/parse/accounting-export", response_model=AccountingExportResponse, tags=["Business Parsers"], summary="แปลง Accounting Export (PEAK/FlowAccount)")
async def parse_accounting(
    file: UploadFile = File(...),
    software: str = Form(...),
) -> AccountingExportResponse:
    """Parse a Thai accounting software export (PEAK / FlowAccount) into
    normalised journal entries.

    Args:
        file: The exported CSV or XLSX file.
        software: "PEAK" | "FLOWACCOUNT"
    """
    sw = software.strip().upper()
    if sw not in SUPPORTED_ACCOUNTING:
        raise HTTPException(
            status_code=400,
            detail=f"ซอฟต์แวร์ {software!r} ไม่รองรับ — รองรับเฉพาะ: {', '.join(sorted(SUPPORTED_ACCOUNTING))}",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="ไฟล์ว่างเปล่า")

    if len(content) > 50 * 1024 * 1024:  # 50 MB
        raise HTTPException(status_code=413, detail="ไฟล์มีขนาดเกิน 50 MB")

    filename = file.filename or f"{sw}_export.csv"

    try:
        entries = parse_accounting_export(content, software=sw, filename=filename)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    warnings: list[str] = []
    if len(entries) == 0:
        warnings.append(
            "ไม่พบรายการในไฟล์ — กรุณาตรวจสอบว่าไฟล์ถูก Export จากโปรแกรมที่เลือก"
        )

    return AccountingExportResponse(
        software=sw,
        entryCount=len(entries),
        entries=entries,
        warnings=warnings,
    )
