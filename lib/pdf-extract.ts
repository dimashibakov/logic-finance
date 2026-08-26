import { PDFParse } from "pdf-parse";

/** Same text extraction as POST /api/import — single source for parsers and calibration tests. */
export async function extractDocumentText(buffer: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return buffer.toString("utf8");
  }
  if (lower.endsWith(".txt")) {
    return buffer.toString("utf8");
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}
