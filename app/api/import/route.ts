import { PDFParse } from "pdf-parse";
import { NextRequest, NextResponse } from "next/server";
import { detectBank, parseByBank, type BankId, type StatementRow } from "@/parsers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const entries = formData.getAll("files");

  if (entries.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const results: {
    filename: string;
    bank: BankId | null;
    rows: (StatementRow & { bank: string })[];
    warnings: string[];
  }[] = [];

  for (const entry of entries) {
    if (!(entry instanceof File)) continue;
    if (!entry.name.toLowerCase().endsWith(".pdf")) {
      results.push({
        filename: entry.name,
        bank: null,
        rows: [],
        warnings: ["Skipped: only .pdf files are supported"],
      });
      continue;
    }

    const buffer = Buffer.from(await entry.arrayBuffer());
    const warnings: string[] = [];
    let text = "";

    try {
      text = await extractPdfText(buffer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "PDF parse failed";
      results.push({ filename: entry.name, bank: null, rows: [], warnings: [msg] });
      continue;
    }

    if (!text.trim()) warnings.push("No text extracted from PDF");

    const bank = detectBank(text);
    if (!bank) {
      warnings.push("Could not detect bank — no parser applied");
      results.push({ filename: entry.name, bank: null, rows: [], warnings });
      continue;
    }

    const parsed = parseByBank(bank, text);
    if (parsed.length === 0) warnings.push("No transactions matched generic parser — TODO: calibrate bank parser");

    results.push({
      filename: entry.name,
      bank,
      rows: parsed.map((row) => ({ ...row, bank })),
      warnings,
    });
  }

  const allRows = results.flatMap((r) => r.rows);

  return NextResponse.json({
    files: results,
    rows: allRows,
    warnings: results.flatMap((r) => r.warnings.map((w) => `${r.filename}: ${w}`)),
  });
}
