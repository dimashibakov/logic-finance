/** Monthly income / outflow baselines (edit here when plan changes). */
export const EXPOSURE_CONFIG = {
  /** Dividends ₽600k + rent ₽43k */
  monthlyIncomeRub: 643_000,
  monthlyIncomeUsd: 0,

  /** RSHB mortgage + Alfa consumer + Rosbank */
  monthlyRubOutflow: 34_033 + 164_400 + 20_917,

  /** Plan · September: rent½ + insurance + subs + Bridgecrest + Apple */
  monthlyUsdOutflow:
    1_020 + 193 + 113 + 60 + 120 + 40 + 491 + 115,
} as const;

export type ExposureConfig = typeof EXPOSURE_CONFIG;
