import type { ParsedTx } from "./types";

const INTERNAL_PATTERNS = [
  /перевод для ш\.?/i,
  /перевод от ш\.?/i,
  /перевод сбп.*russian agricultural bank/i,
  /внутрибанковский перевод между счетами/i,
  /online banking transfer/i,
  /online scheduled transfer/i,
  /mobile banking payment to crd/i,
  /applecard gsbank des:payment/i,
  /перевод через сбп от.*сбер/i,
  /перевод через сбп.*из сбер/i,
];

const UTILITIES_PATTERNS = [/квартплата\s*24/i, /mapp_sberbank/i, /mapp.*sber/i, /коммунал/i, /ркс/i];

const CARD_PAYMENT_PATTERNS = [
  /погашение од/i,
  /погашение срочн\.?\s*осн\.?\s*долга/i,
  /mobile payment - thank you/i,
  /payment.*thank you/i,
];

const INCOME_PATTERNS = [/дивиденды/i, /выплата кешбэка/i, /cash reward/i, /cashback/i];

const BANK_FEE_PATTERNS = [
  /комиссия за пакет услуг/i,
  /плата за обслуживание/i,
  /service fees/i,
];

const ZENLO_PATTERNS = [/anthropic/i, /digitalocean/i, /corporate filings/i];

const RENT_COINBASE_AMBIGUOUS = [/received usdc/i, /sold usdc/i];

export function applyCommonRules(tx: ParsedTx): ParsedTx {
  const desc = tx.rawDescription;
  let next = { ...tx };

  if (INCOME_PATTERNS.some((p) => p.test(desc)) && !next.excluded) {
    next.type = "income";
    next.excluded = false;
    next.statementSign = 1;
  }

  if (INTERNAL_PATTERNS.some((p) => p.test(desc))) {
    next.type = "transfer";
    next.excluded = true;
    next.excludeReason = "internal transfer between own accounts";
  }

  if (UTILITIES_PATTERNS.some((p) => p.test(desc))) {
    next.type = "transfer";
    next.excluded = true;
    next.excludeReason = "utilities RF — net-zero (reimbursed by tenant)";
  }

  if (CARD_PAYMENT_PATTERNS.some((p) => p.test(desc))) {
    next.type = "transfer";
    next.excluded = true;
    next.excludeReason = "loan/card payment — obligation, not expense";
  }

  if (/погашение % за срочн/i.test(desc)) {
    next.type = "expense";
    next.excluded = false;
    next.categoryGuess = next.categoryGuess ?? "Bank fees (RF)";
    next.statementSign = -1;
  }

  if (BANK_FEE_PATTERNS.some((p) => p.test(desc))) {
    next.type = "expense";
    next.categoryGuess = next.categoryGuess ?? "Bank fees (RF)";
    next.statementSign = -1;
  }

  if (ZENLO_PATTERNS.some((p) => p.test(desc))) {
    next.categoryGuess = "Investment in Zenlo LLC";
  }

  if (/предоставление транша/i.test(desc)) {
    next.skipControl = true;
    next.excluded = true;
    next.excludeReason = "credit tranche mechanics — ignore";
  }

  if (/неподтвержденная операция/i.test(desc)) {
    next.pending = true;
    next.skipControl = true;
    next.excludeReason = "pending hold";
  }

  if (RENT_COINBASE_AMBIGUOUS.some((p) => p.test(desc)) && next.type === "conversion") {
    next.excludeReason = next.excludeReason ?? "USDC conversion channel — not income";
  }

  return next;
}

/** BofA joint account 5927 — 50% share except dog walking Zelle. */
export function applyBofaSplit(tx: ParsedTx, accountRef: string): ParsedTx {
  if (accountRef !== "bofa-5927") return tx;
  if (/zelle payment to oleksandra oliinyk/i.test(tx.rawDescription)) return tx;
  if (tx.excluded || tx.type === "transfer") return tx;
  return {
    ...tx,
    amount: Math.round(tx.amount * 50) / 100,
    rawDescription: `${tx.rawDescription} [50% Dim share]`,
  };
}
