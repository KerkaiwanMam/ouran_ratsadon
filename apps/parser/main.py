from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from parsers.pdf_parser import parse_pdf
from parsers.excel_parser import parse_excel
from models import BudgetData

app = FastAPI(title="ouran-ratsadon parser", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/parse/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/parse/pdf", response_model=BudgetData)
async def upload_pdf(file: UploadFile = File(...)) -> BudgetData:
    if file.content_type not in ("application/pdf",):
        raise HTTPException(status_code=400, detail="ไฟล์ต้องเป็น PDF เท่านั้น")
    content = await file.read()
    return parse_pdf(content, filename=file.filename or "upload.pdf")


@app.post("/parse/excel", response_model=BudgetData)
async def upload_excel(file: UploadFile = File(...)) -> BudgetData:
    allowed = (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
    )
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="ไฟล์ต้องเป็น Excel เท่านั้น")
    content = await file.read()
    return parse_excel(content, filename=file.filename or "upload.xlsx")
