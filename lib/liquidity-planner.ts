import type { AccountRow } from "./liquidity";
import { fmtDateShort } from "./format";
import { LIQUIDITY_CONFIG, type LiquidityConfig } from "./liquidity-config";
import { upcomingPayments, type ObligationRow, type PaymentEvent } from "./payments";

export type DailyBalance = {
  date: string;
  balance: number;
  income: number;
  payments: number;
  household: number;
};

export type RubBalanceProjection = {
  days: DailyBalance[];
  startBalance: number;
  minBalance: number;
  minDate: string;
  stressDate: string;
  stressBalance: number;
  horizonDays: number;
};

export type DepositScenario = {
  termDays: number;
  maturityDate: string;
  safeAmount: number;
  minBalanceInTerm: number;
  minDateInTerm: string;
  illustrativeIncome: number | null;
  overlapsMajorOutflow: boolean;
  riskNote: string | null;
};

const RUB_LIQUID_TYPES = new Set(["cash", "checking"]);

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function atNoon(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

function addDays(base: Date, days: number) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function rubLiquid(accounts: Pick<AccountRow, "currency" | "type" | "balance">[]) {
  return accounts
    .filter((a) => a.currency === "RUB" && RUB_LIQUID_TYPES.has(a.type))
    .reduce((s, a) => s + Math.max(0, Number(a.balance)), 0);
}

function incomeForDate(dateStr: string, config: LiquidityConfig) {
  const d = atNoon(dateStr);
  const day = d.getDate();
  return config.INCOME.filter((i) => i.day === day).reduce((s, i) => s + i.amount, 0);
}

function rubPaymentsByDate(events: PaymentEvent[]) {
  const map = new Map<string, number>();
  for (const e of events) {
    if (e.currency !== "RUB") continue;
    map.set(e.date, (map.get(e.date) ?? 0) + e.amount);
  }
  return map;
}

function majorOutflowsInHorizon(events: PaymentEvent[], config: LiquidityConfig) {
  return events.filter((e) => e.currency === "RUB" && e.amount >= config.MAJOR_OUTFLOW_RUB);
}

export function liquidityBottleneckDate(projection: RubBalanceProjection, majorOutflows: PaymentEvent[]) {
  if (majorOutflows.length > 0) {
    return majorOutflows.reduce((a, b) => (a.amount >= b.amount ? a : b)).date;
  }
  return projection.minDate;
}

function householdForDate(dateStr: string, config: LiquidityConfig) {
  const d = atNoon(dateStr);
  return config.MONTHLY_RUB_EXPENSES / daysInMonth(d.getFullYear(), d.getMonth());
}

function daysFromFirstIncome(days: DailyBalance[]) {
  const idx = days.findIndex((d) => d.income > 0);
  return idx >= 0 ? days.slice(idx) : days;
}

function minOnDays(days: DailyBalance[]) {
  if (days.length === 0) return { minBalance: 0, minDate: "" };
  let minBalance = days[0]!.balance;
  let minDate = days[0]!.date;
  for (const d of days) {
    if (d.balance < minBalance) {
      minBalance = d.balance;
      minDate = d.date;
    }
  }
  return { minBalance, minDate };
}

export function projectRubBalance(
  accounts: Pick<AccountRow, "currency" | "type" | "balance">[],
  obligations: ObligationRow[],
  horizonDays = 90,
  now = new Date(),
  config: LiquidityConfig = LIQUIDITY_CONFIG
): RubBalanceProjection {
  const startBalance = rubLiquid(accounts);
  const { events } = upcomingPayments(obligations, horizonDays, now);
  const paymentsByDate = rubPaymentsByDate(events);
  const majorOutflows = majorOutflowsInHorizon(events, config);

  const days: DailyBalance[] = [];
  let balance = startBalance;

  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const date = isoDate(addDays(now, offset));
    const income = incomeForDate(date, config);
    const payments = paymentsByDate.get(date) ?? 0;
    const household = householdForDate(date, config);
    balance = balance + income - payments - household;
    days.push({ date, balance, income, payments, household });
  }

  const afterIncome = daysFromFirstIncome(days);
  const { minBalance, minDate } = minOnDays(afterIncome);
  const stressDate = liquidityBottleneckDate({ days, startBalance, minBalance, minDate, stressDate: "", stressBalance: 0, horizonDays }, majorOutflows);
  const stressDay = days.find((d) => d.date === stressDate);

  return {
    days,
    startBalance,
    minBalance,
    minDate,
    stressDate,
    stressBalance: stressDay?.balance ?? minBalance,
    horizonDays,
  };
}

export function safeToLock(
  projection: RubBalanceProjection,
  termDays: number,
  bufferRub = LIQUIDITY_CONFIG.SAFETY_BUFFER_RUB
) {
  const slice = projection.days.slice(0, termDays + 1);
  const relevant = daysFromFirstIncome(slice);
  const { minBalance: minInTerm, minDate: minDay } = minOnDays(relevant);
  return {
    safeAmount: Math.max(0, Math.round(minInTerm - bufferRub)),
    minBalanceInTerm: minInTerm,
    minDateInTerm: minDay,
  };
}

export function idleRubAboveBuffer(
  projection: RubBalanceProjection,
  bufferRub = LIQUIDITY_CONFIG.SAFETY_BUFFER_RUB
) {
  return Math.max(0, Math.round(projection.startBalance - bufferRub));
}

export function depositScenarios(
  projection: RubBalanceProjection,
  obligations: ObligationRow[],
  ratePct = 0,
  now = new Date(),
  config: LiquidityConfig = LIQUIDITY_CONFIG
): DepositScenario[] {
  const { events } = upcomingPayments(obligations, projection.horizonDays, now);
  const majorOutflows = majorOutflowsInHorizon(events, config);
  const nodeDate = liquidityBottleneckDate(projection, majorOutflows);

  return config.DEPOSIT_TERMS.map((termDays) => {
    const { safeAmount, minBalanceInTerm, minDateInTerm } = safeToLock(projection, termDays);
    const maturityDate = isoDate(addDays(now, termDays));
    const overlapsMajorOutflow = atNoon(maturityDate) > atNoon(nodeDate);
    const illustrativeIncome =
      ratePct > 0 && safeAmount > 0 ? Math.round(safeAmount * (ratePct / 100) * (termDays / 365)) : null;

    let riskNote: string | null = null;
    if (overlapsMajorOutflow) {
      const node = majorOutflows.find((e) => e.date === nodeDate);
      riskNote = node
        ? `maturity after bottleneck ${fmtDueShort(nodeDate)} — locked funds unavailable for payment`
        : `maturity after projected minimum ${fmtDueShort(nodeDate)}`;
    } else if (minBalanceInTerm <= config.SAFETY_BUFFER_RUB * 1.05) {
      riskNote = "projected minimum close to buffer";
    }

    return {
      termDays,
      maturityDate,
      safeAmount,
      minBalanceInTerm,
      minDateInTerm,
      illustrativeIncome,
      overlapsMajorOutflow,
      riskNote,
    };
  });
}

export function fmtDueShort(dateStr: string) {
  return fmtDateShort(dateStr);
}
