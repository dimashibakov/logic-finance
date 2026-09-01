import { NextRequest, NextResponse } from "next/server";
import { extractDocumentText } from "@/lib/pdf-extract";
import { importLog } from "@/lib/import-log";
import { detectBank, parseByBank, type BankId } from "@/parsers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Vercel Pro — multi-page PDF parse; Hobby caps at 10s unless upgraded. */
export const maxDuration = 60;

type ParsedFile = {
  filename: string;
  bank: BankId | null;
  result: ReturnType<typeof parseByBank> | null;
  warnings: string[];
};

export async function POST(request: NextRequest) {
  const started = Date.now();
  importLog("parse:request", {});

  try {
    const formData = await request.formData();
    const entries = formData.getAll("files");

    if (entries.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const files: ParsedFile[] = [];

    for (const entry of entries) {
      if (!(entry instanceof File)) continue;

      const fileStarted = Date.now();
      const warnings: string[] = [];
      importLog("parse:file:start", { filename: entry.name, size: entry.size });

      let text = "";
      try {
        text = await extractDocumentText(Buffer.from(await entry.arrayBuffer()), entry.name);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "PDF extract failed";
        warnings.push(msg);
        importLog("parse:file:extract-error", { filename: entry.name, error: msg, ms: Date.now() - fileStarted });
        files.push({ filename: entry.name, bank: null, result: null, warnings });
        continue;
      }

      if (!text.trim()) warnings.push("No text extracted");

      const bank = detectBank(text, entry.name);
      if (!bank) {
        warnings.push("Could not detect bank");
        importLog("parse:file:no-bank", { filename: entry.name, chars: text.length, ms: Date.now() - fileStarted });
        files.push({ filename: entry.name, bank: null, result: null, warnings });
        continue;
      }

      let result: ReturnType<typeof parseByBank>;
      try {
        result = parseByBank(bank, text);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Bank parser failed";
        warnings.push(msg);
        importLog("parse:file:parser-error", { filename: entry.name, bank, error: msg, ms: Date.now() - fileStarted });
        files.push({ filename: entry.name, bank, result: null, warnings });
        continue;
      }

      if (!result.control.ok) {
        warnings.push(`Control check failed: ${(result.control.notes ?? []).join("; ")}`);
      }
      if (result.txs.length === 0) warnings.push("No transactions parsed");

      importLog("parse:file:done", {
        filename: entry.name,
        bank,
        txs: result.txs.length,
        controlOk: result.control.ok,
        ms: Date.now() - fileStarted,
      });

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

    const controlOk = files.every((f) => !f.result || f.result.control.ok);
    const parseOk = files.every((f) => f.result !== null && f.bank !== null && f.warnings.length === 0);
    const warnings = files.flatMap((f) => f.warnings.map((w) => `${f.filename}: ${w}`));

    importLog("parse:response", {
      ms: Date.now() - started,
      files: files.length,
      rows: rows.length,
      controlOk,
      parseOk,
      warningCount: warnings.length,
    });

    return NextResponse.json({ files, rows, warnings, controlOk, parseOk });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import parse failed";
    importLog("parse:error", { ms: Date.now() - started, error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
