/** Maps parser accountRef keys to Supabase account name substrings. */
export const ACCOUNT_REF_MAP: Record<string, string> = {
  "sber-5623": "5623",
  "alfa-1916": "1916",
  "rshb-4421": "4421",
  "tbank-4321": "4321",
  "amex-bcp": "amex",
  "bofa-5927": "5927",
  "coinbase-usdc": "coinbase",
};

export function accountLookupHint(ref: string): string {
  return ACCOUNT_REF_MAP[ref] ?? ref.split("-").pop() ?? ref;
}
