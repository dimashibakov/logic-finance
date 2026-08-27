/** RUB liquidity planner baselines — edit when plan changes. */
export const LIQUIDITY_CONFIG = {
  SAFETY_BUFFER_RUB: 100_000,
  MONTHLY_RUB_EXPENSES: 95_000,
  DEPOSIT_TERMS: [14, 30, 60, 90] as const,
  MAJOR_OUTFLOW_RUB: 100_000,
  INCOME: [
    { label: "Dividends", amount: 300_000, day: 3 },
    { label: "Dividends", amount: 300_000, day: 20 },
    { label: "Rent", amount: 43_000, day: 5 },
  ],
} as const;

export type LiquidityConfig = typeof LIQUIDITY_CONFIG;
export type PlannedIncome = (typeof LIQUIDITY_CONFIG.INCOME)[number];
