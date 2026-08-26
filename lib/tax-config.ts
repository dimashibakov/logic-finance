/** Tax reserve baselines — edit here when estimates change. */
export const TAX_CONFIG = {
  US_ANNUAL_TARGET: 4610,
  US_DUE: "2027-04-15",
  US_ACCRUAL_START: "2026-01-01",
  NPD_RATE: 0.04,
  NPD_RENTAL_BASE: 43_000,
  /** Optional: match USD account used as US tax reserve (HYSA). */
  US_RESERVE_ACCOUNT_PATTERN: "amex.*checking|hysa",
} as const;

export type TaxConfig = typeof TAX_CONFIG;
