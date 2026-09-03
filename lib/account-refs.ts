/** Stable parser accountRef → Supabase accounts.name (exact match required on commit). */
export const RSHB_ACCOUNT_ID = "a155caa6-1103-4403-9f25-6e62522adfd2";

export const ACCOUNT_REF_MAP: Record<string, string> = {
  "sber-5623": "Sberbank - 5623",
  "sber-0335": "Sberbank - 0335",
  "sber-0685": "Sberbank - 0685",
  "alfa-1916": "Alfabank - 1916",
  "alfa-3883": "Alfabank",
  "alfa-3505": "Alfabank — 3505 (dividends)",
  rshb: "RSHB",
  "tbank-5120": "T-Bank — 5120",
  "amex-23009": "AMEX - 7997",
  "bofa-8541": "Bank of America — 8541",
  "bofa-5927": "Bank of America — 5927",
  "bofa-3155": "Bank of America — 3155",
  coinbase: "Coinbase - USD",
};

/** Statement requisites / bank labels → canonical accountRef in ACCOUNT_REF_MAP. */
const ACCOUNT_REF_ALIASES: Record<string, string> = {
  "40817810135450008526": "rshb",
  "россельхозбанк": "rshb",
  "рсхб": "rshb",
  rshb: "rshb",
  RSHB: "rshb",
};

/** Canonical accountRef → Supabase accounts.id */
export const ACCOUNT_REF_ID_MAP: Record<string, string> = {
  rshb: RSHB_ACCOUNT_ID,
};

export function normalizeAccountRef(ref: string): string {
  const trimmed = ref.trim();
  if (!trimmed) return trimmed;
  const alias = ACCOUNT_REF_ALIASES[trimmed] ?? ACCOUNT_REF_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;
  if (trimmed in ACCOUNT_REF_MAP) return trimmed;
  const lower = trimmed.toLowerCase();
  if (lower in ACCOUNT_REF_MAP) return lower;
  return trimmed;
}

export function isKnownAccountRef(ref: string): boolean {
  return normalizeAccountRef(ref) in ACCOUNT_REF_MAP;
}

export function accountNameForRef(ref: string): string | null {
  return ACCOUNT_REF_MAP[normalizeAccountRef(ref)] ?? null;
}

export function accountIdForRef(ref: string): string | null {
  return ACCOUNT_REF_ID_MAP[normalizeAccountRef(ref)] ?? null;
}

/** @deprecated Use accountNameForRef — kept for any legacy callers. */
export function accountLookupHint(ref: string): string {
  const name = accountNameForRef(ref);
  if (!name) throw new Error(`Unknown accountRef: ${ref}`);
  return name;
}
