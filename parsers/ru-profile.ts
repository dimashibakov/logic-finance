import type { ParsedTx } from "./types";
import { isoFromRuDate, parseRuAmount, round2, verifyControl } from "./utils";

const TOLERANCE = 0.01;

const RU_MONEY_RE = /-?[\d\s]+,\d{2}\s*(?:RUR|RUB|₽)?/gi;

/** Signed RU money token, e.g. «-85 000,00 RUR» → -85000. */
export function parseRuSignedAmount(raw: string): number {
  const cleaned = raw
    .trim()
    .replace(/\s*(?:RUR|RUB|₽)\s*$/i, "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/^\+/, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export interface RuStatementHeader {
  start: string;
  end: string;
  opening: number;
  closing: number;
  deposits: number;
  withdrawals: number;
}

/** Map RU statement summary labels — opening/closing are balances, not flow totals. */
export function extractRuStatementHeader(text: string): RuStatementHeader {
  const period = text.match(/(\d{2}\.\d{2}\.\d{4})\s*[-–]\s*(\d{2}\.\d{2}\.\d{4})/);

  const openingMatch = text.match(/(?:Входящий(?:\s+остаток)?)[^\d-]*(-?[\d\s]+,\d{2})\s*(?:RUR|RUB|₽)?/i);
  const closingMatch = text.match(/(?:Исходящий(?:\s+остаток)?)[^\d-]*(-?[\d\s]+,\d{2})\s*(?:RUR|RUB|₽)?/i);
  const depositsMatch = text.match(/Поступления[^\d-]*(-?[\d\s]+,\d{2})\s*(?:RUR|RUB|₽)?/i);
  const withdrawalsMatch = text.match(/Расходы[^\d-]*(-?[\d\s]+,\d{2})\s*(?:RUR|RUB|₽)?/i);

  return {
    start: period ? isoFromRuDate(period[1]) : "",
    end: period ? isoFromRuDate(period[2]) : "",
    opening: openingMatch ? parseRuAmount(openingMatch[1]) : 0,
    closing: closingMatch ? parseRuAmount(closingMatch[1]) : 0,
    deposits: depositsMatch ? parseRuAmount(depositsMatch[1]) : 0,
    withdrawals: withdrawalsMatch ? parseRuAmount(withdrawalsMatch[1]) : 0,
  };
}

export function extractLastRuMoneyToken(text: string): string | null {
  const matches = [...text.matchAll(RU_MONEY_RE)];
  return matches.length ? matches[matches.length - 1][0] : null;
}

export function isRuCurrentAccountTable(text: string): boolean {
  return /Операции по счету/i.test(text) || /Дата проводки\s*\|\s*Код операции/i.test(text);
}

export function verifyRuStatementControl(
  txs: ParsedTx[],
  header: RuStatementHeader,
  options: { checkBalance?: boolean } = {}
): { ok: boolean; notes: string[] } {
  const { checkBalance = true } = options;
  const flow = verifyControl(txs, {
    deposits: header.deposits,
    withdrawals: header.withdrawals,
  });
  const notes = [...flow.notes];

  let balanceOk = true;
  if (checkBalance) {
    const expectedClosing = round2(header.opening - header.withdrawals + header.deposits);
    balanceOk = Math.abs(expectedClosing - header.closing) <= TOLERANCE;
    if (!balanceOk) {
      notes.push(
        `Balance equation mismatch: opening ${header.opening} - withdrawals ${header.withdrawals} + deposits ${header.deposits} = ${expectedClosing}, statement closing ${header.closing}`
      );
    }
  }

  return { ok: flow.ok && balanceOk, notes };
}

export type RuOperationDraft = {
  date: string;
  code: string;
  parts: string[];
};

export function iterRuCurrentAccountBlocks(text: string): RuOperationDraft[] {
  const marker = /Операции по счету/i;
  const idx = text.search(marker);
  const body = idx >= 0 ? text.slice(idx) : text;
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const blocks: RuOperationDraft[] = [];
  let current: RuOperationDraft | null = null;
  const dateRowRe = /^(\d{2}\.\d{2}\.\d{4})\s*\|\s*(\S+)\s*\|\s*(.*)$/;

  for (const line of lines) {
    if (/^Дата проводки/i.test(line)) continue;
    const m = line.match(dateRowRe);
    if (m) {
      if (current) blocks.push(current);
      current = { date: isoFromRuDate(m[1]), code: m[2], parts: [m[3].trim()] };
    } else if (current) {
      current.parts.push(line);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

export function ruOperationDescription(block: RuOperationDraft): { description: string; signedAmount: number } | null {
  const body = block.parts.join("\n");
  const moneyRaw = extractLastRuMoneyToken(body);
  if (!moneyRaw) return null;

  const signedAmount = parseRuSignedAmount(moneyRaw);
  const description = body
    .replace(moneyRaw, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { description, signedAmount };
}
