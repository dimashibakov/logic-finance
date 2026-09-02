// lib/parsers/universal.ts
// Universal statement parser: Anthropic PDF extraction + deterministic control gate.

import { z } from "zod";
import { detectAlfaRef, detectSberRef } from "@/parsers/account-detect";
import type { AlfaParseResult } from "@/lib/parsers/alfa-ru";
import type { SberParseResult } from "@/lib/parsers/sber-ru";

export const ExtractedOp = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive(),
  direction: z.enum(["debit", "credit"]),
  description: z.string(),
  op_code: z.string().nullable(),
  balance_after: z.number().nullable(),
  suggested_category: z.string().nullable(),
  suggested_type: z.enum(["expense", "income", "transfer"]).nullable(),
  needs_review: z.boolean(),
});

export const ExtractedStatement = z.object({
  bank: z.string(),
  account_hint: z.string().nullable(),
  currency: z.string(),
  period_start: z.string().nullable(),
  period_end: z.string().nullable(),
  control: z.object({
    opening: z.number().nullable(),
    deposits: z.number().nullable(),
    withdrawals: z.number().nullable(),
    closing: z.number().nullable(),
  }),
  operations: z.array(ExtractedOp),
});

export type ExtractedStatement = z.infer<typeof ExtractedStatement>;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  parsedDeposits: number;
  parsedWithdrawals: number;
}

const near = (a: number | null, b: number | null, eps = 0.01) =>
  a != null && b != null && Math.abs(a - b) < eps;

export function validateStatement(s: ExtractedStatement): ValidationResult {
  const errors: string[] = [];
  const credits = s.operations.filter((o) => o.direction === "credit");
  const debits = s.operations.filter((o) => o.direction === "debit");
  const parsedDeposits = +credits.reduce((x, o) => x + o.amount, 0).toFixed(2);
  const parsedWithdrawals = +debits.reduce((x, o) => x + o.amount, 0).toFixed(2);
  const c = s.control;

  if (c.deposits != null && !near(c.deposits, parsedDeposits)) {
    errors.push(`Deposits mismatch: control ${c.deposits}, parsed ${parsedDeposits}`);
  }
  if (c.withdrawals != null && !near(c.withdrawals, parsedWithdrawals)) {
    errors.push(`Withdrawals mismatch: control ${c.withdrawals}, parsed ${parsedWithdrawals}`);
  }
  if (c.opening != null && c.closing != null && !near(c.closing, c.opening + parsedDeposits - parsedWithdrawals)) {
    errors.push(`Balance mismatch: ${c.opening} + ${parsedDeposits} - ${parsedWithdrawals} ≠ ${c.closing}`);
  }
  if (s.operations.length === 0) errors.push("No operations extracted");

  const codes = s.operations.map((o) => o.op_code).filter(Boolean) as string[];
  if (new Set(codes).size !== codes.length) errors.push("Duplicate op_code within statement");

  if (c.deposits == null && c.withdrawals == null && (c.opening == null || c.closing == null)) {
    errors.push("No control totals found — cannot verify");
  }

  return { ok: errors.length === 0, errors, parsedDeposits, parsedWithdrawals };
}

export interface UniversalParsedTx {
  ts: string;
  amount: number;
  type: "expense" | "income" | "transfer";
  externalId: string;
  description: string;
  suggestedCategory: string | null;
  needsReview: boolean;
}

export function toParsedTx(s: ExtractedStatement, bankTag = "uni"): UniversalParsedTx[] {
  return s.operations.map((o) => ({
    ts: o.date,
    amount: o.amount,
    type: o.suggested_type ?? (o.direction === "credit" ? "income" : "expense"),
    externalId: `${bankTag.toUpperCase()}-${o.date.replace(/-/g, "")}-${o.op_code ?? Math.round(o.amount * 100)}`,
    description: o.description,
    suggestedCategory: o.suggested_category,
    needsReview: o.needs_review,
  }));
}

export function resolveAccountRef(extracted: ExtractedStatement, text: string): string {
  const bank = extracted.bank.toLowerCase();
  if (/alfa|альфа/.test(bank) || /alfa|альфа/i.test(text)) return detectAlfaRef(text);
  if (/sber|сбер/.test(bank) || /sber|сбер/i.test(text)) return detectSberRef(text);
  const hint = extracted.account_hint ?? "";
  const tail = hint.match(/(\d{4})/)?.[1];
  if (tail) return `${extracted.bank.toLowerCase().replace(/\s+/g, "")}-${tail}`;
  return `${extracted.bank.toLowerCase().replace(/\s+/g, "")}-unknown`;
}

/** Build ExtractedStatement from regex Sber parse — for validator tests / golden paths. */
export function extractedFromSberParse(result: SberParseResult, accountHint: string | null = null): ExtractedStatement {
  return {
    bank: "sber",
    account_hint: accountHint,
    currency: "RUB",
    period_start: null,
    period_end: null,
    control: { ...result.control },
    operations: result.transactions.map((t) => ({
      date: t.ts,
      amount: t.amount,
      direction: t.type === "income" ? "credit" : "debit",
      description: [t.bankCategory, t.description].filter(Boolean).join(" | "),
      op_code: t.externalId.split("-").pop() ?? null,
      balance_after: null,
      suggested_category: null,
      suggested_type: t.type,
      needs_review: false,
    })),
  };
}

/** Build ExtractedStatement from regex Alfa parse — for validator tests. */
export function extractedFromAlfaParse(result: AlfaParseResult): ExtractedStatement {
  return {
    bank: "alfa",
    account_hint: null,
    currency: "RUB",
    period_start: null,
    period_end: null,
    control: { ...result.control },
    operations: result.transactions.map((t) => ({
      date: t.ts,
      amount: t.amount,
      direction: t.type === "income" ? "credit" : "debit",
      description: t.description,
      op_code: t.externalId,
      balance_after: null,
      suggested_category: null,
      suggested_type: t.type,
      needs_review: false,
    })),
  };
}

const TOOL_SCHEMA = {
  name: "emit_statement",
  description: "Return the parsed bank statement as structured data.",
  input_schema: {
    type: "object",
    required: ["bank", "currency", "control", "operations"],
    properties: {
      bank: { type: "string" },
      account_hint: { type: ["string", "null"] },
      currency: { type: "string" },
      period_start: { type: ["string", "null"] },
      period_end: { type: ["string", "null"] },
      control: {
        type: "object",
        properties: {
          opening: { type: ["number", "null"] },
          deposits: { type: ["number", "null"] },
          withdrawals: { type: ["number", "null"] },
          closing: { type: ["number", "null"] },
        },
      },
      operations: {
        type: "array",
        items: {
          type: "object",
          required: [
            "date",
            "amount",
            "direction",
            "description",
            "op_code",
            "balance_after",
            "suggested_category",
            "suggested_type",
            "needs_review",
          ],
          properties: {
            date: { type: "string" },
            amount: { type: "number" },
            direction: { type: "string", enum: ["debit", "credit"] },
            description: { type: "string" },
            op_code: { type: ["string", "null"] },
            balance_after: { type: ["number", "null"] },
            suggested_category: { type: ["string", "null"] },
            suggested_type: { type: ["string", "null"], enum: ["expense", "income", "transfer", null] },
            needs_review: { type: "boolean" },
          },
        },
      },
    },
  },
} as const;

export const EXTRACTION_PROMPT = `
Ты извлекаешь данные из банковской выписки (PDF на русском или английском). Верни строго структуру инструментом emit_statement. Правила:

СУММЫ И ЗНАКИ
- amount всегда ПОЛОЖИТЕЛЬНОЕ. Направление кодируй в direction: debit = списание/расход, credit = поступление/приход.
- Знаки «+»/«−» в выписке, слово «Пополнение/Списание», и уменьшение/увеличение остатка — используй для определения direction.
- Разделители тысяч (пробел/NBSP) и запятая-десятичная: 85 000,00 -> 85000.00.

КОНТРОЛЬ (обязательно, это проверяется детерминированно)
- opening = входящий остаток на начало периода; closing = исходящий остаток на конец.
- deposits = сумма всех поступлений (Пополнение); withdrawals = сумма всех списаний (Расходы/Списание).
- Если поле в выписке отсутствует — ставь null, НЕ выдумывай.

ОПЕРАЦИИ
- Каждую операцию — отдельным объектом. date в формате YYYY-MM-DD (дата операции, не обработки).
- op_code — код операции/авторизации из выписки (для дедупа). Если нет — null.
- balance_after — остаток после операции, если в выписке есть колонка остатка; иначе null.
- description — краткое описание (мерчант/контрагент).

КАТЕГОРИЯ (предложение, пользователь подтвердит)
- suggested_category по маппингу: продукты, транспорт, кафе, подписки, связь, бизнес-ТВЕ.
- Переводы на свой счёт — transfer; возможная конвертация — needs_review=true.
- Если неоднозначно — needs_review=true.

Ничего, кроме вызова emit_statement, не возвращай.
`.trim();

export async function extractStatement(pdfBase64: string, promptExtra = ""): Promise<ExtractedStatement> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "tool", name: "emit_statement" },
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
            { type: "text", text: EXTRACTION_PROMPT + (promptExtra ? `\n\n${promptExtra}` : "") },
          ],
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content?: { type: string; input?: unknown }[] };
  const toolUse = data.content?.find((b) => b.type === "tool_use");
  if (!toolUse?.input) throw new Error("No structured output from model");
  return ExtractedStatement.parse(toolUse.input);
}
