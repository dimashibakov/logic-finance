export type Fund = {
  id: string;
  category: string;
  label: string;
  amount: number;
  currency: "RUB" | "USD";
  due_date: string | null;
  status: "planned" | "funded" | "paid";
  saved: number;
  monthly_contribution: number;
  notes: string | null;
};

export const EN_LOCALE = "en-US";

/** @deprecated use rubEn */
export const RU_LOCALE = EN_LOCALE;

export function rubEn(n: number) {
  return `₽${Math.round(n).toLocaleString(EN_LOCALE)}`;
}

/** @deprecated use rubEn */
export const rubRu = rubEn;

export function moneyEn(n: number, currency: string) {
  if (currency === "USD") {
    return `$${Math.round(n).toLocaleString(EN_LOCALE)}`;
  }
  return rubEn(n);
}

/** @deprecated use moneyEn */
export const moneyRu = moneyEn;

export function daysLeft(due: string | null): number | null {
  if (!due) return null;
  const d = new Date(`${due}T00:00:00`);
  return Math.round((d.getTime() - Date.now()) / 86_400_000);
}

export function dueUrgencyClass(days: number | null): string {
  if (days === null) return "lf-fund-due lf-fund-due--none";
  if (days < 14) return "lf-fund-due lf-fund-due--urgent";
  if (days < 30) return "lf-fund-due lf-fund-due--warn";
  return "lf-fund-due lf-fund-due--ok";
}

export function formatDueBadge(due: string | null, days: number | null): string {
  if (!due) return "no deadline";
  const date = new Date(`${due}T00:00:00`).toLocaleDateString(EN_LOCALE);
  if (days === null) return date;
  return `${date} · ${days}d`;
}

export function toRubAmount(n: number, currency: string, spot: number) {
  return currency === "USD" ? n * spot : n;
}

export function computeActiveTotals(funds: Fund[], spot: number) {
  const active = funds.filter((f) => f.status !== "paid");
  const need = active.reduce((s, f) => s + toRubAmount(Number(f.amount), f.currency, spot), 0);
  const saved = active.reduce((s, f) => s + toRubAmount(Number(f.saved), f.currency, spot), 0);
  return { need, saved, remaining: need - saved };
}

export function groupFundsByCategory(funds: Fund[]): [string, Fund[]][] {
  const map = new Map<string, Fund[]>();
  for (const f of funds) {
    if (!map.has(f.category)) map.set(f.category, []);
    map.get(f.category)!.push(f);
  }

  const nearestDueDays = (items: Fund[]) => {
    const days = items.map((f) => daysLeft(f.due_date)).filter((d): d is number => d !== null);
    return days.length ? Math.min(...days) : 1e9;
  };

  return [...map.entries()].sort((a, b) => nearestDueDays(a[1]) - nearestDueDays(b[1]));
}

export function parseFundRow(row: Record<string, unknown>): Fund {
  const status = row.status;
  return {
    id: String(row.id),
    category: String(row.category),
    label: String(row.label),
    amount: Number(row.amount),
    currency: row.currency === "USD" ? "USD" : "RUB",
    due_date: row.due_date ? String(row.due_date).slice(0, 10) : null,
    status: status === "funded" || status === "paid" ? status : "planned",
    saved: Number(row.saved ?? 0),
    monthly_contribution: Number(row.monthly_contribution ?? 0),
    notes: row.notes ? String(row.notes) : null,
  };
}
