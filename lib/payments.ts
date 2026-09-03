import type { AccountRow } from "./liquidity";
import { fmtDateShort } from "./format";

export type ObligationRow = {
  id: string;
  name: string;
  kind: string;
  currency: string;
  balance: number;
  apr: number | null;
  monthly_payment: number | null;
  due_date: string | null;
  due_day: number | null;
  account_id?: string | null;
  status?: string;
};

export type PaymentEvent = {
  id: string;
  obligationId: string;
  date: string;
  name: string;
  amount: number;
  currency: "RUB" | "USD";
  apr: number | null;
  kind: string;
  oneOff: boolean;
  recurring: boolean;
  estimated?: boolean;
  daysUntil: number;
  hot: boolean;
  highApr: boolean;
  zone: "RUB" | "USD";
};

export type UndatedObligation = {
  id: string;
  name: string;
  amount: number;
  currency: "RUB" | "USD";
  balance: number;
  apr: number | null;
  kind: string;
};

export type ZoneCoverage = {
  currency: "RUB" | "USD";
  due30: number;
  liquid: number;
  short: boolean;
};

const LIQUID_TYPES = new Set(["cash", "checking"]);
const NPD_RENT_PLAN_RUB = 43_000;
const NPD_RENT_RATE = 0.04;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function atNoon(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

export function daysUntil(dateStr: string, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const target = atNoon(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function eventFlags(dateStr: string, apr: number | null, now = new Date()) {
  const d = daysUntil(dateStr, now);
  return {
    daysUntil: d,
    hot: d <= 14,
    highApr: apr != null && apr >= 25,
  };
}

function currencyZone(currency: string): "RUB" | "USD" {
  return currency === "USD" ? "USD" : "RUB";
}

function isNpdRent(name: string, kind: string) {
  return kind === "tax_rf" || /нпд|аренд/i.test(name);
}

function oneOffAmount(o: ObligationRow): { amount: number; estimated: boolean } {
  if (isNpdRent(o.name, o.kind)) {
    const explicit = Number(o.monthly_payment) || Number(o.balance);
    if (explicit > 0) return { amount: Math.abs(explicit), estimated: false };
    return { amount: Math.round(NPD_RENT_PLAN_RUB * NPD_RENT_RATE), estimated: true };
  }
  const bal = Math.abs(Number(o.balance));
  if (bal > 0) return { amount: bal, estimated: false };
  const mp = Number(o.monthly_payment);
  if (mp > 0) return { amount: Math.abs(mp), estimated: false };
  return { amount: 0, estimated: false };
}

function projectMonthlyDates(dueDay: number, horizonDays: number, now = new Date()): string[] {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + horizonDays);

  const dates: string[] = [];
  let y = start.getFullYear();
  let m = start.getMonth();

  while (true) {
    const lastDay = new Date(y, m + 1, 0).getDate();
    const day = Math.min(dueDay, lastDay);
    const candidate = new Date(y, m, day, 12, 0, 0);
    if (candidate > end) break;
    if (candidate >= start) dates.push(isoDate(candidate));
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    if (y > end.getFullYear() + 1) break;
  }

  return dates;
}

function isUndated(o: ObligationRow) {
  return !o.due_date && !o.due_day && Math.abs(Number(o.balance)) > 0;
}

export function upcomingPayments(
  obligations: ObligationRow[],
  horizonDays = 90,
  now = new Date()
): { events: PaymentEvent[]; undated: UndatedObligation[] } {
  const active = obligations.filter((o) => o.status !== "inactive");
  const todayStr = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const horizonEnd = new Date(now);
  horizonEnd.setDate(horizonEnd.getDate() + horizonDays);
  const horizonEndStr = isoDate(horizonEnd);

  const events: PaymentEvent[] = [];
  const undated: UndatedObligation[] = [];

  for (const o of active) {
    if (isUndated(o)) {
      undated.push({
        id: o.id,
        name: o.name,
        amount: Math.abs(Number(o.balance)),
        currency: currencyZone(o.currency),
        balance: Number(o.balance),
        apr: o.apr != null ? Number(o.apr) : null,
        kind: o.kind,
      });
      continue;
    }

    if (o.due_date && o.due_date >= todayStr && o.due_date <= horizonEndStr) {
      const { amount, estimated } = oneOffAmount(o);
      if (amount > 0) {
        const flags = eventFlags(o.due_date, o.apr != null ? Number(o.apr) : null, now);
        events.push({
          id: `${o.id}:${o.due_date}`,
          obligationId: o.id,
          date: o.due_date,
          name: o.name,
          amount,
          currency: currencyZone(o.currency),
          apr: o.apr != null ? Number(o.apr) : null,
          kind: o.kind,
          oneOff: true,
          recurring: false,
          estimated,
          zone: currencyZone(o.currency),
          ...flags,
        });
      }
    }

    const monthly = Number(o.monthly_payment);
    if (monthly > 0 && o.due_day != null && o.due_day >= 1 && o.due_day <= 31) {
      for (const date of projectMonthlyDates(o.due_day, horizonDays, now)) {
        const flags = eventFlags(date, o.apr != null ? Number(o.apr) : null, now);
        events.push({
          id: `${o.id}:${date}`,
          obligationId: o.id,
          date,
          name: o.name,
          amount: Math.abs(monthly),
          currency: currencyZone(o.currency),
          apr: o.apr != null ? Number(o.apr) : null,
          kind: o.kind,
          oneOff: false,
          recurring: true,
          zone: currencyZone(o.currency),
          ...flags,
        });
      }
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  undated.sort((a, b) => a.name.localeCompare(b.name));

  return { events, undated };
}

export function liquidByCurrency(accounts: Pick<AccountRow, "currency" | "type" | "balance">[]) {
  const rub = accounts
    .filter((a) => a.currency === "RUB" && LIQUID_TYPES.has(a.type))
    .reduce((s, a) => s + Math.max(0, Number(a.balance)), 0);
  const usd = accounts
    .filter((a) => a.currency === "USD" && LIQUID_TYPES.has(a.type))
    .reduce((s, a) => s + Math.max(0, Number(a.balance)), 0);
  return { RUB: rub, USD: usd };
}

export function coverageByZone(
  events: PaymentEvent[],
  accounts: Pick<AccountRow, "currency" | "type" | "balance">[],
  windowDays = 30,
  now = new Date()
): ZoneCoverage[] {
  const liquid = liquidByCurrency(accounts);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + windowDays);
  const cutoffStr = isoDate(cutoff);

  const due30 = { RUB: 0, USD: 0 };
  for (const e of events) {
    if (e.date <= cutoffStr) due30[e.currency] += e.amount;
  }

  return (["RUB", "USD"] as const).map((currency) => ({
    currency,
    due30: due30[currency],
    liquid: liquid[currency],
    short: due30[currency] > liquid[currency],
  }));
}

export function urgentAlertEvent(events: PaymentEvent[], coverage: ZoneCoverage[]): PaymentEvent | null {
  const shortCurrencies = new Set(coverage.filter((c) => c.short).map((c) => c.currency));
  const candidates = events.filter((e) => e.hot && (e.highApr || shortCurrencies.has(e.currency)));
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.daysUntil - b.daysUntil || a.date.localeCompare(b.date))[0];
}

export function groupEventsByMonth(events: PaymentEvent[]) {
  const groups = new Map<string, PaymentEvent[]>();
  for (const e of events) {
    const key = e.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** Split upcoming events into this calendar week vs later (grouped by month). */
export function groupEventsTimeline(events: PaymentEvent[], now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const thisWeek: PaymentEvent[] = [];
  const later: PaymentEvent[] = [];
  for (const e of events) {
    if (e.date >= today && e.date < weekEndStr) thisWeek.push(e);
    else later.push(e);
  }
  return { thisWeek, laterByMonth: groupEventsByMonth(later) };
}

export function monthLabel(ym: string) {
  const d = new Date(`${ym}-01T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function fmtDueShort(dateStr: string) {
  return fmtDateShort(dateStr);
}
