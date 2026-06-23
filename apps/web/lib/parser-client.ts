/**
 * Client for the FastAPI parser microservice (apps/parser) — Business Layer
 * file parsing. Maps a File's sourceFormat to the right parser endpoint and
 * normalizes the response into RawTx[] for finalizeFileUpload.
 */
import { FileSourceFormat } from "@prisma/client";
import type { RawTx } from "@/lib/file-processor";

const PARSER_URL = process.env.PARSER_URL ?? "http://localhost:8000";

const CONTENT_TYPES: Record<string, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
};

export type ParserErrorCode =
  | "PARSER_UNAVAILABLE"
  | "PARSE_ERROR"
  | "NO_TRANSACTIONS"
  | "UNSUPPORTED_FORMAT";

export class ParserError extends Error {
  code: ParserErrorCode;
  userMessage: string;

  constructor(code: ParserErrorCode, userMessage: string) {
    super(userMessage);
    this.name = "ParserError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

interface BankStatementResponse {
  transactionCount: number;
  transactions: Array<{ date: string; description: string; amount: number; category?: string | null }>;
  warnings: string[];
}

interface AccountingExportResponse {
  entryCount: number;
  entries: Array<{ date: string; description: string; net: number }>;
  warnings: string[];
}

interface ExcelTemplateResponse {
  transactionCount: number;
  transactions: Array<{ date: string; description: string; amount: number; category?: string | null }>;
  warnings: string[];
}

async function callParser(path: string, form: FormData): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${PARSER_URL}${path}`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new ParserError(
      "PARSER_UNAVAILABLE",
      "ไม่สามารถเชื่อมต่อระบบประมวลผลไฟล์ได้ กรุณาลองใหม่อีกครั้ง"
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "ไม่สามารถประมวลผลไฟล์ได้" }));
    const detail = typeof body.detail === "string" ? body.detail : "ไม่สามารถประมวลผลไฟล์ได้";
    throw new ParserError("PARSE_ERROR", detail);
  }

  return res.json();
}

function rowsToRawTx(rows: Array<{ date: string; description: string; amount: number }>): RawTx[] {
  return rows.map((row) => ({
    date: new Date(row.date),
    description: row.description,
    amount: row.amount,
    transactionType: row.amount >= 0 ? "INCOME" : "EXPENSE",
  }));
}

/**
 * Send an uploaded Business Layer file to the FastAPI parser and return
 * normalized transactions ready for finalizeFileUpload.
 *
 * Throws ParserError on unreachable service, parser-side rejection, an
 * unsupported sourceFormat, or zero parsed transactions.
 */
export async function parseBusinessFile(
  buffer: Buffer,
  filename: string,
  sourceFormat: FileSourceFormat,
  fileType: string
): Promise<RawTx[]> {
  const contentType = CONTENT_TYPES[fileType.toLowerCase()] ?? "application/octet-stream";
  // Buffer's underlying ArrayBufferLike can include SharedArrayBuffer in its
  // type, which Blob's BlobPart doesn't accept — slice() always returns a
  // plain ArrayBuffer at runtime for Node Buffers.
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: contentType });

  let transactions: RawTx[];

  switch (sourceFormat) {
    case "BANK_SCB":
    case "BANK_KBANK":
    case "BANK_BBL": {
      const bank = sourceFormat.replace("BANK_", "");
      const form = new FormData();
      form.append("file", blob, filename);
      form.append("bank", bank);
      const data = (await callParser("/parse/bank-statement", form)) as BankStatementResponse;
      transactions = rowsToRawTx(data.transactions);
      break;
    }

    case "PEAK":
    case "FLOWACCOUNT": {
      const form = new FormData();
      form.append("file", blob, filename);
      form.append("software", sourceFormat);
      const data = (await callParser("/parse/accounting-export", form)) as AccountingExportResponse;
      transactions = data.entries.map((entry) => ({
        date: new Date(entry.date),
        description: entry.description,
        amount: entry.net,
        transactionType: entry.net >= 0 ? "INCOME" : "EXPENSE",
      }));
      break;
    }

    case "EXCEL_TEMPLATE": {
      const form = new FormData();
      form.append("file", blob, filename);
      const data = (await callParser("/parse/excel-template", form)) as ExcelTemplateResponse;
      transactions = rowsToRawTx(data.transactions);
      break;
    }

    default:
      throw new ParserError(
        "UNSUPPORTED_FORMAT",
        "รูปแบบไฟล์นี้ยังไม่รองรับการประมวลผลอัตโนมัติ"
      );
  }

  if (transactions.length === 0) {
    throw new ParserError(
      "NO_TRANSACTIONS",
      "ไม่พบรายการธุรกรรมในไฟล์ — กรุณาตรวจสอบรูปแบบไฟล์"
    );
  }

  return transactions;
}
