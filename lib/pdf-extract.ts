import { PDFParse } from "pdf-parse";
import { importLog } from "./import-log";
import { withTimeout } from "./async-timeout";

const PDF_EXTRACT_TIMEOUT_MS = 50_000;
const PAGE_EXTRACT_TIMEOUT_MS = 15_000;

/** Same text extraction as POST /api/import — single source for parsers and calibration tests. */
export async function extractDocumentText(buffer: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return buffer.toString("utf8");
  }
  if (lower.endsWith(".txt")) {
    return buffer.toString("utf8");
  }

  return withTimeout(extractPdfText(buffer, filename), PDF_EXTRACT_TIMEOUT_MS, `pdf extract (${filename})`);
}

async function extractPdfText(buffer: Buffer, filename: string): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    let total = 1;
    try {
      const info = await parser.getInfo();
      total = Math.max(1, info.total || info.pages?.length || 1);
    } catch (e) {
      importLog("pdf:info-failed", {
        filename,
        bytes: buffer.length,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    importLog("pdf:start", { filename, bytes: buffer.length, pages: total });

    if (total <= 1) {
      const result = await withTimeout(parser.getText(), PAGE_EXTRACT_TIMEOUT_MS, `pdf page 1 (${filename})`);
      const text = result.text ?? "";
      importLog("pdf:done", { filename, pages: 1, chars: text.length });
      return text;
    }

    const parts: string[] = [];
    for (let page = 1; page <= total; page++) {
      const pageResult = await withTimeout(
        parser.getText({ partial: [page] }),
        PAGE_EXTRACT_TIMEOUT_MS,
        `pdf page ${page}/${total} (${filename})`
      );
      const chunk = pageResult.text ?? "";
      parts.push(chunk);
      importLog("pdf:page", { filename, page, total, chars: chunk.length });
    }

    const text = parts.join("\n");
    importLog("pdf:done", { filename, pages: total, chars: text.length });
    return text;
  } finally {
    await parser.destroy();
  }
}
