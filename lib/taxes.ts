import { TAX_CONFIG, type TaxConfig } from "./tax-config";

export type UsTaxReserve = {
  target: number;
  dueDate: string;
  accrualStart: string;
  monthsTotal: number;
  monthsElapsed: number;
  monthsLeft: number;
  shouldBeReserved: number;
  monthlySetAside: number;
  remaining: number;
  progressPct: number;
  status: "on-track" | "behind";
  actualReserved: number | null;
  reserveCoverage: "covered" | "short" | null;
};

export type NpdTaxReserve = {
  monthly: number;
  ytdAccrued: number;
  nextDue: string;
  nextDueLabel: string;
};

export type TaxReserves = {
  us: UsTaxReserve;
  npd: NpdTaxReserve;
};

function atNoon(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthIndex(d: Date) {
  return d.getFullYear() * 12 + d.getMonth();
}

export function monthsBetweenInclusive(start: string, end: string) {
  return monthIndex(atNoon(end)) - monthIndex(atNoon(start)) + 1;
}

export function monthsElapsedInclusive(start: string, today: string) {
  const startDate = atNoon(start);
  const todayDate = atNoon(today);
  if (todayDate < startDate) return 0;
  return monthIndex(todayDate) - monthIndex(startDate) + 1;
}

export function nextNpdDueDate(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  let candidate = new Date(today.getFullYear(), today.getMonth(), 28, 12, 0, 0);
  if (candidate < today) {
    candidate = new Date(today.getFullYear(), today.getMonth() + 1, 28, 12, 0, 0);
  }
  return isoDate(candidate);
}

export function fmtDueShort(dateStr: string) {
  return atNoon(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ytdMonths(year: number, now: Date) {
  if (now.getFullYear() < year) return 0;
  if (now.getFullYear() > year) return 12;
  return now.getMonth() + 1;
}

export function findUsReserveBalance(
  accounts: { name: string; balance: number; currency: string }[],
  config: TaxConfig = TAX_CONFIG
): number | null {
  const re = new RegExp(config.US_RESERVE_ACCOUNT_PATTERN, "i");
  const match = accounts.find((a) => a.currency === "USD" && re.test(a.name));
  if (!match) return null;
  return Math.max(0, Number(match.balance));
}

export function taxReserves(
  today: string | Date = new Date(),
  config: TaxConfig = TAX_CONFIG,
  actualReservedUsd: number | null = null
): TaxReserves {
  const now = typeof today === "string" ? atNoon(today) : today;
  const todayStr = isoDate(now);

  const monthsTotal = monthsBetweenInclusive(config.US_ACCRUAL_START, config.US_DUE);
  const monthsElapsed = Math.min(monthsElapsedInclusive(config.US_ACCRUAL_START, todayStr), monthsTotal);
  const monthsLeft = Math.max(0, monthsTotal - monthsElapsed);

  const target = config.US_ANNUAL_TARGET;
  const shouldBeReserved = Math.round((target * monthsElapsed) / monthsTotal);
  const monthlySetAside = target / monthsTotal;
  const remaining = Math.max(0, target - shouldBeReserved);
  const progressPct = target > 0 ? Math.min(100, (shouldBeReserved / target) * 100) : 0;

  let status: UsTaxReserve["status"] = "on-track";
  let reserveCoverage: UsTaxReserve["reserveCoverage"] = null;
  if (actualReservedUsd != null) {
    reserveCoverage = actualReservedUsd >= shouldBeReserved ? "covered" : "short";
    status = reserveCoverage === "covered" ? "on-track" : "behind";
  }

  const monthly = Math.round(config.NPD_RENTAL_BASE * config.NPD_RATE);
  const ytdAccrued = monthly * ytdMonths(now.getFullYear(), now);
  const nextDue = nextNpdDueDate(now);

  return {
    us: {
      target,
      dueDate: config.US_DUE,
      accrualStart: config.US_ACCRUAL_START,
      monthsTotal,
      monthsElapsed,
      monthsLeft,
      shouldBeReserved,
      monthlySetAside,
      remaining,
      progressPct,
      status,
      actualReserved: actualReservedUsd,
      reserveCoverage,
    },
    npd: {
      monthly,
      ytdAccrued,
      nextDue,
      nextDueLabel: fmtDueShort(nextDue),
    },
  };
}
