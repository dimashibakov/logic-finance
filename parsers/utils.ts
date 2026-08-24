import { createHash } from "crypto";
import type { ParsedTx } from "./types";

const TOLERANCE = 0.01;

export function parseRuAmount(raw: string): number {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".").replace(/^\+/, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function parseUsAmount(raw: string): number {
  const n = parseFloat(raw.replace(/[$,\s]/g, "").replace(/(\d)(?=\.\d)/, "$1"));
  const fixed = raw.includes(".") ? parseFloat(raw.replace(/,/g, "")) : parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(fixed) ? fixed : Number.isFinite(n) ? n : 0;
}

export function parseUsMoney(raw: string): number {
  return parseFloat(raw.replace(/,/g, "").replace(/[^\d.-]/g, "")) || 0;
}

export function isoFromRuDate(d: string): string {
  const m = d.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return d;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function isoFromUsDate(d: string): string {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!m) return d;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${m[1]}-${m[2]}`;
}

export function makeExternalId(
  accountRef: string,
  date: string,
  amount: number,
  rawDescription: string,
  seqWithinDay: number
): string {
  return createHash("sha1")
    .update(`${accountRef}|${date}|${amount}|${rawDescription}|${seqWithinDay}`)
    .digest("hex");
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function controlTotals(txs: ParsedTx[]): { deposits: number; withdrawals: number } {
  let deposits = 0;
  let withdrawals = 0;
  for (const tx of txs) {
    if (tx.skipControl || tx.pending) continue;
    const sign = tx.statementSign ?? (tx.type === "income" ? 1 : tx.type === "expense" ? -1 : 0);
    if (sign > 0) deposits += tx.amount;
    else if (sign < 0) withdrawals += tx.amount;
  }
  return { deposits: round2(deposits), withdrawals: round2(withdrawals) };
}

export function verifyControl(
  txs: ParsedTx[],
  expected: { deposits?: number; withdrawals?: number },
  notes: string[] = []
): { ok: boolean; notes: string[] } {
  const actual = controlTotals(txs);
  const out = [...notes];

  if (expected.deposits != null && Math.abs(actual.deposits - expected.deposits) > TOLERANCE) {
    out.push(`Deposits mismatch: statement ${expected.deposits}, parsed ${actual.deposits}`);
  }
  if (expected.withdrawals != null && Math.abs(actual.withdrawals - expected.withdrawals) > TOLERANCE) {
    out.push(`Withdrawals mismatch: statement ${expected.withdrawals}, parsed ${actual.withdrawals}`);
  }

  const ok =
    (expected.deposits == null || Math.abs(actual.deposits - expected.deposits) <= TOLERANCE) &&
    (expected.withdrawals == null || Math.abs(actual.withdrawals - expected.withdrawals) <= TOLERANCE);

  return { ok, notes: out };
}

export function seqByDate(txs: ParsedTx[]): Map<string, number> {
  const counts = new Map<string, number>();
  return new Map(
    txs.map((tx) => {
      const n = counts.get(tx.date) ?? 0;
      counts.set(tx.date, n + 1);
      return [tx.rawDescription, n] as const;
    })
  );
}

export function assignExternalIds(txs: ParsedTx[]): ParsedTx[] {
  const daySeq = new Map<string, number>();
  return txs.map((tx) => {
    const seq = daySeq.get(tx.date) ?? 0;
    daySeq.set(tx.date, seq + 1);
    return {
      ...tx,
      externalId: makeExternalId(tx.accountRef, tx.date, tx.amount, tx.rawDescription, seq),
    };
  });
}
