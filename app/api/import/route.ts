import { NextRequest, NextResponse } from "next/server";
import { extractDocumentText } from "@/lib/pdf-extract";
import { importLog, serializeImportError } from "@/lib/import-log";
import {
  extractStatement,
  resolveAccountRef,
  toParsedTx,
  validateStatement,
  type ExtractedStatement,
} from "@/lib/parsers/universal";
import { detectBank, parseByBank, type BankId, type ParseResult } from "@/parsers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type ImportRow = {
  date: string;
  amount: number;
  currency: string;
  type: string;
  merchant: string | null;
  bank: string;
  accountRef: string;
  categoryGuess?: string | null;
  suggestedCategory?: string | null;
  needsReview?: boolean;
  excluded?: boolean;
  excludeReason?: string;
  externalId: string;
  rawDescription?: string;
};

type ParsedFile = {
  filename: string;
  bank: BankId | string | null;
  parser: "regex" | "llm";
  result: ParseResult | null;
  importRows: ImportRow[];
  warnings: string[];
};

function rowsFromParseResult(result: ParseResult, bank: string): ImportRow[] {
  return result.txs.map((tx) => ({
    date: tx.date,
    amount: tx.amount,
    currency: tx.currency,
    type: tx.type,
    merchant: tx.merchant ?? null,
    bank,
    accountRef: tx.accountRef,
    categoryGuess: tx.categoryGuess ?? null,
    suggestedCategory: tx.categoryGuess ?? null,
    needsReview: false,
    excluded: tx.excluded ?? false,
    excludeReason: tx.excludeReason,
    externalId: tx.externalId,
    rawDescription: tx.rawDescription,
  }));
}

function buildLlmParseResult(extracted: ExtractedStatement, text: string): ParseResult {
  const accountRef = resolveAccountRef(extracted, text);
  const currency = extracted.currency === "USD" ? "USD" : "RUB";
  const gate = validateStatement(extracted);
  const universalTxs = toParsedTx(extracted, extracted.bank);

  return {
    account: {
      ref: accountRef,
      currency,
      statementBalanceEnd: extracted.control.closing ?? 0,
      periodStart: extracted.period_start ?? "",
      periodEnd: extracted.period_end ?? "",
    },
    txs: universalTxs.map((u) => ({
      date: u.ts,
      amount: u.amount,
      currency,
      type: u.type,
      accountRef,
      rawDescription: u.description,
      externalId: u.externalId,
      categoryGuess: u.suggestedCategory ?? undefined,
    })),
    control: {
      deposits: extracted.control.deposits ?? 0,
      withdrawals: extracted.control.withdrawals ?? 0,
      ok: gate.ok,
      notes: gate.errors,
    },
  };
}

function rowsFromLlm(extracted: ExtractedStatement, text: string): ImportRow[] {
  const accountRef = resolveAccountRef(extracted, text);
  const currency = extracted.currency === "USD" ? "USD" : "RUB";
  return toParsedTx(extracted, extracted.bank).map((u) => ({
    date: u.ts,
    amount: u.amount,
    currency,
    type: u.type,
    merchant: null,
    bank: extracted.bank,
    accountRef,
    categoryGuess: u.suggestedCategory,
    suggestedCategory: u.suggestedCategory,
    needsReview: u.needsReview,
    externalId: u.externalId,
    rawDescription: u.description,
  }));
}

function tryRegexParse(bank: BankId, text: string): ParseResult | null {
  try {
    return parseByBank(bank, text);
  } catch {
    return null;
  }
}

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

      const buffer = Buffer.from(await entry.arrayBuffer());
      if (buffer.length === 0) {
        warnings.push("Empty PDF file");
        importLog("parse:file:empty", { filename: entry.name, reportedSize: entry.size });
        files.push({ filename: entry.name, bank: null, parser: "regex", result: null, importRows: [], warnings });
        continue;
      }

      let text = "";
      try {
        text = await extractDocumentText(buffer, entry.name);
      } catch (e) {
        const { error: msg, stack } = serializeImportError(e);
        warnings.push(msg);
        importLog("parse:file:extract-error", { filename: entry.name, error: msg, stack, ms: Date.now() - fileStarted });
        files.push({ filename: entry.name, bank: null, parser: "regex", result: null, importRows: [], warnings });
        continue;
      }

      if (!text.trim()) warnings.push("No text extracted");

      const bank = detectBank(text, entry.name);
      let result: ParseResult | null = null;
      let parser: "regex" | "llm" = "regex";
      let importRows: ImportRow[] = [];
      const regexResult = bank ? tryRegexParse(bank, text) : null;

      if (regexResult && regexResult.txs.length > 0 && regexResult.control.ok) {
        result = regexResult;
        importLog("parse:file:done", {
          filename: entry.name,
          bank,
          parser: "regex",
          txs: regexResult.txs.length,
          controlOk: regexResult.control.ok,
          ms: Date.now() - fileStarted,
        });
        importRows = rowsFromParseResult(regexResult, bank!);
      } else {
        if (regexResult && regexResult.txs.length === 0) warnings.push("No transactions parsed");
        if (regexResult && !regexResult.control.ok) {
          warnings.push(`Control check failed: ${(regexResult.control.notes ?? []).join("; ")}`);
        }
        if (!bank) warnings.push("Could not detect bank");

        importLog("parse:llm:request", {
          filename: entry.name,
          priorBank: bank,
          priorTxs: regexResult?.txs.length ?? 0,
        });
        try {
          const extracted = await extractStatement(buffer.toString("base64"));
          const gate = validateStatement(extracted);
          if (!gate.ok) {
            importLog("parse:llm:rejected", { filename: entry.name, errors: gate.errors });
            warnings.push(...gate.errors);
            files.push({
              filename: entry.name,
              bank: extracted.bank,
              parser: "llm",
              result: null,
              importRows: [],
              warnings,
            });
            continue;
          }

          result = buildLlmParseResult(extracted, text);
          importRows = rowsFromLlm(extracted, text);
          parser = "llm";
          importLog("parse:llm:done", {
            filename: entry.name,
            bank: extracted.bank,
            ops: result.txs.length,
            controlOk: true,
            ms: Date.now() - fileStarted,
          });
        } catch (e) {
          const { error: msg, stack } = serializeImportError(e);
          warnings.push(msg);
          importLog("parse:llm:rejected", { filename: entry.name, error: msg, stack });
          files.push({ filename: entry.name, bank, parser: "llm", result: null, importRows: [], warnings });
          continue;
        }
      }

      files.push({
        filename: entry.name,
        bank: bank ?? result?.account.ref ?? null,
        parser,
        result,
        importRows,
        warnings,
      });
    }

    const rows = files.flatMap((f) => f.importRows);
    const controlOk = files.every((f) => f.result?.control.ok !== false);
    const parseOk = files.every((f) => f.result !== null && f.warnings.length === 0);
    const allWarnings = files.flatMap((f) => f.warnings.map((w) => `${f.filename}: ${w}`));

    importLog("parse:response", {
      ms: Date.now() - started,
      files: files.length,
      rows: rows.length,
      controlOk,
      parseOk,
      warningCount: allWarnings.length,
    });

    return NextResponse.json({
      files: files.map(({ result, importRows: _rows, ...rest }) => rest),
      rows,
      warnings: allWarnings,
      controlOk,
      parseOk,
    });
  } catch (e) {
    const { error: msg, stack } = serializeImportError(e);
    importLog("parse:error", { ms: Date.now() - started, error: msg, stack });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
