import { NextRequest, NextResponse } from "next/server";
import { extractDocumentText } from "@/lib/pdf-extract";
import { detectBank, parseByBank, type BankId } from "@/parsers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const entries = formData.getAll("files");

  if (entries.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const files: {
    filename: string;
    bank: BankId | null;
    result: ReturnType<typeof parseByBank> | null;
    warnings: string[];
  }[] = [];

  for (const entry of entries) {
    if (!(entry instanceof File)) continue;

    const warnings: string[] = [];
    let text = "";

    try {
      text = await extractDocumentText(Buffer.from(await entry.arrayBuffer()), entry.name);
    } catch (e) {
      warnings.push(e instanceof Error ? e.message : "Parse failed");
      files.push({ filename: entry.name, bank: null, result: null, warnings });
      continue;
    }

    if (!text.trim()) warnings.push("No text extracted");

    const bank = detectBank(text, entry.name);
    if (!bank) {
      warnings.push("Could not detect bank");
      files.push({ filename: entry.name, bank: null, result: null, warnings });
      continue;
    }

    const result = parseByBank(bank, text);
    if (!result.control.ok) {
      warnings.push(`Control check failed: ${(result.control.notes ?? []).join("; ")}`);
    }
    if (result.txs.length === 0) warnings.push("No transactions parsed");

    files.push({ filename: entry.name, bank, result, warnings });
  }

  const rows = files.flatMap((f) =>
    (f.result?.txs ?? []).map((tx) => ({
      date: tx.date,
      amount: tx.amount,
      currency: tx.currency,
      type: tx.type,
      merchant: tx.merchant ?? null,
      bank: f.bank ?? "unknown",
      accountRef: tx.accountRef,
      categoryGuess: tx.categoryGuess,
      excluded: tx.excluded ?? false,
      excludeReason: tx.excludeReason,
      externalId: tx.externalId,
      rawDescription: tx.rawDescription,
    }))
  );

  return NextResponse.json({
    files,
    rows,
    warnings: files.flatMap((f) => f.warnings.map((w) => `${f.filename}: ${w}`)),
    controlOk: files.every((f) => !f.result || f.result.control.ok),
  });
}
