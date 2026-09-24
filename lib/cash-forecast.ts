import type { BaseCurrency } from "@/lib/bento-overview";
import { displayMoneyValue } from "@/lib/terminal-money";
import type { Fund } from "@/lib/funds";
import { upcomingPayments, paymentHorizonDays, type ObligationRow, type PaymentEvent } from "@/lib/payments";
import type { ZoneFilter } from "@/lib/terminal-money";

export type PlanRowInput = {
  month: string;
  planned_amount: number;
  currency: string;
  categoryName: string;
  categoryKind: string;
};

export type CashLineItem = {
  id: string;
  name: string;
  amount: number;
  currency: "RUB" | "USD";
  date?: string;
};

export type CashForecastMonth = {
  key: string;
  label: string;
  income: number;
  loans: number;
  funds: number;
  living: number;
  outflow: number;
  buffer: number;
  breakdown: {
    income: CashLineItem[];
    loans: CashLineItem[];
    funds: CashLineItem[];
    living: CashLineItem[];
  };
};

export type CashForecastKpis = {
  avgIncome: number;
  avgOutflow: number;
  avgBuffer: number;
  tightestMonth: { label: string; buffer: number } | null;
};

function monthStart(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function monthKeyFromDate(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

function monthLabelShort(key: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}

function monthEndIso(monthStartKey: string): string {
  const d = new Date(`${monthStartKey}T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}

function inMonth(dateStr: string | null | undefined, monthKey: string): boolean {
  if (!dateStr) return false;
  return dateStr >= monthKey && dateStr <= monthEndIso(monthKey);
}

function zoneOfCurrency(currency: string): "RF" | "US" {
  return currency === "USD" ? "US" : "RF";
}

function passesZone(currency: string, zone: ZoneFilter): boolean {
  if (zone === "ALL") return true;
  return zoneOfCurrency(currency) === zone;
}

function toDisplay(amount: number, currency: string, display: BaseCurrency, spot: number): number {
  return displayMoneyValue(amount, currency === "USD" ? "USD" : "RUB", display, spot);
}

function sumItems(items: CashLineItem[], display: BaseCurrency, spot: number): number {
  return items.reduce((s, i) => s + toDisplay(i.amount, i.currency, display, spot), 0);
}

export function forecastMonthKeys(monthsAhead: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    keys.push(monthStart(d));
  }
  return keys;
}

export function buildCashForecast(
  monthKeys: string[],
  plans: PlanRowInput[],
  obligations: ObligationRow[],
  funds: Fund[],
  spot: number,
  displayCurrency: BaseCurrency,
  zone: ZoneFilter = "ALL",
  now = new Date(),
): { months: CashForecastMonth[]; kpis: CashForecastKpis } {
  const horizonDays = paymentHorizonDays(monthKeys.length, now);
  const { events } = upcomingPayments(obligations, horizonDays, now);

  const plansByMonth = new Map<string, PlanRowInput[]>();
  for (const p of plans) {
    const k = p.month.slice(0, 10);
    if (!monthKeys.includes(k)) continue;
    if (!plansByMonth.has(k)) plansByMonth.set(k, []);
    plansByMonth.get(k)!.push(p);
  }

  const months: CashForecastMonth[] = monthKeys.map((key) => {
    const planRows = plansByMonth.get(key) ?? [];
    const incomeItems: CashLineItem[] = [];
    const livingItems: CashLineItem[] = [];

    for (const p of planRows) {
      if (!passesZone(p.currency, zone)) continue;
      const item: CashLineItem = {
        id: `${key}:${p.categoryName}:${p.categoryKind}`,
        name: p.categoryName,
        amount: Number(p.planned_amount),
        currency: p.currency === "USD" ? "USD" : "RUB",
      };
      if (p.categoryKind === "income") incomeItems.push(item);
      else livingItems.push(item);
    }

    const loanItems: CashLineItem[] = events
      .filter((e) => monthKeyFromDate(e.date) === key && passesZone(e.currency, zone))
      .map((e: PaymentEvent) => ({
        id: e.id,
        name: e.name,
        amount: e.amount,
        currency: e.currency,
        date: e.date,
      }));

    const fundItems: CashLineItem[] = funds
      .filter((f) => f.status !== "paid" && inMonth(f.due_date, key) && passesZone(f.currency, zone))
      .map((f) => ({
        id: f.id,
        name: f.label,
        amount: Number(f.amount),
        currency: f.currency,
        date: f.due_date ?? undefined,
      }));

    const income = sumItems(incomeItems, displayCurrency, spot);
    const loans = sumItems(loanItems, displayCurrency, spot);
    const fundOut = sumItems(fundItems, displayCurrency, spot);
    const living = sumItems(livingItems, displayCurrency, spot);
    const outflow = loans + fundOut + living;
    const buffer = income - outflow;

    return {
      key,
      label: monthLabelShort(key),
      income,
      loans,
      funds: fundOut,
      living,
      outflow,
      buffer,
      breakdown: { income: incomeItems, loans: loanItems, funds: fundItems, living: livingItems },
    };
  });

  const n = months.length || 1;
  const avgIncome = months.reduce((s, m) => s + m.income, 0) / n;
  const avgOutflow = months.reduce((s, m) => s + m.outflow, 0) / n;
  const avgBuffer = months.reduce((s, m) => s + m.buffer, 0) / n;
  const tightest = months.length
    ? months.reduce((a, b) => (a.buffer < b.buffer ? a : b))
    : null;

  return {
    months,
    kpis: {
      avgIncome,
      avgOutflow,
      avgBuffer,
      tightestMonth: tightest ? { label: tightest.label, buffer: tightest.buffer } : null,
    },
  };
}
