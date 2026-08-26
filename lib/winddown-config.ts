/** Joint 5927 wind-down settings. */
export const WINDDOWN_CONFIG = {
  DEADLINE: "2026-12-31",
  JOINT_ACCOUNT_NAME: "Bank of America — 5927",
  TARGET_ACCOUNT_DEFAULT: "Bank of America — 8541",
  DOG_WALKING_PATTERN: "oliinyk|dog walk",
} as const;

export type WindDownConfig = typeof WINDDOWN_CONFIG;
