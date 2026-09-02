import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { importLog, serializeImportError } from "./import-log";
import { withTimeout } from "./async-timeout";

const PDF_EXTRACT_TIMEOUT_MS = 50_000;

/** Same text extraction as POST /api/import — single source for parsers and calibration tests. */
export async function extractDocumentText(buffer: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return buffer.toString("utf8");
  }
  if (lower.endsWith(".txt")) {
    return buffer.toString("utf8");
  }

  if (buffer.length === 0) {
    throw new Error("Empty PDF buffer");
  }

  return withTimeout(extractPdfText(buffer, filename), PDF_EXTRACT_TIMEOUT_MS, `pdf extract (${filename})`);
}

async function extractPdfText(buffer: Buffer, filename: string): Promise<string> {
  importLog("pdf:start", { filename, bytes: buffer.length });

  try {
    const result = await pdfParse(buffer);
    const text = result.text ?? "";
    importLog("pdf:done", { filename, pages: result.numpages, chars: text.length });
    return text;
  } catch (e) {
    importLog("pdf:error", { filename, bytes: buffer.length, ...serializeImportError(e) });
    throw e;
  }
}
