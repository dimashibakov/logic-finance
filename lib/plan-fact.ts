import { isNonPnlCategory } from "./non-pnl";
import { toRubEquiv } from "./terminal-money";

export type PlanFactTx = {
  amount: number;
  currency: "RUB" | "USD" | string;
  type: string;
  categoryName: string;
};

export type PlanFactPlanRow = {
  amount: number;
  currency: "RUB" | "USD" | string;
  categoryName: string;
  categoryKind: string;
};

export type CategoryLine = {
  name: string;
  fact: number;
  plan: number;
  currency: string;
};

export type PlanFactSnapshot = {
  incomeFact: { RUB: number; USD: number };
  incomePlan: { RUB: number; USD: number };
  rubExpenses: CategoryLine[];
  usdExpenses: CategoryLine[];
};

export type PlanFactCategoryRow = {
  categoryId: string;
  name: string;
  kind: "income" | "expense";
  currency: "RUB" | "USD";
  planned: number;
  actual: number;
  variance: number;
  pct: number;
  hasPlan: boolean;
  hasActual: boolean;
};

export type PlanFactMonthSnapshot = {
  month: string;
  monthEnd: string;
  income: PlanFactCategoryRow[];
  expenses: PlanFactCategoryRow[];
  unplanned: PlanFactCategoryRow[];
  totals: {
    plannedRub: number;
    actualRub: number;
    varianceRub: number;
  };
};

export type PlanFactTxInput = {
  id: string;
  amount: number;
  currency: string;
  type: string;
  ts: string;
  category_id: string | null;
  categoryName: string;
  categoryKind: string;
};

export type PlanFactPlanInput = {
  category_id: string;
  planned_amount: number;
  currency: string;
  categoryName: string;
  categoryKind: string;
};

export function monthEndIso(monthStart: string): string {
  const d = new Date(`${monthStart.slice(0, 10)}T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}

export function monthKeyFromTs(ts: string): string {
  return `${ts.slice(0, 7)}-01`;
}

export function listPlanMonths(planMonths: string[], txMonths: string[]): string[] {
  const months = new Set<string>();
  for (const m of planMonths) months.add(m.slice(0, 10));
  for (const t of txMonths) months.add(monthKeyFromTs(t));
  if (months.size === 0) {
    const now = new Date();
    return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`];
  }
  return [...months].sort().reverse();
}

export function resolvePlanMonth(requested: string | undefined, months: string[]): string {
  if (requested && /^\d{4}-\d{2}-01$/.test(requested) && months.includes(requested)) return requested;
  const nowKey = monthKeyFromTs(new Date().toISOString());
  if (months.includes(nowKey)) return nowKey;
  return months[0]!;
}

export function expenseVariance(planned: number, actual: number): number {
  return planned - actual;
}

export function incomeVariance(planned: number, actual: number): number {
  return actual - planned;
}

export function varianceTone(kind: "income" | "expense", variance: number): string | undefined {
  if (variance === 0) return undefined;
  if (kind === "expense") return variance < 0 ? "t-down" : "t-up";
  return variance < 0 ? "t-down" : "t-up";
}

export function progressPct(planned: number, actual: number): number {
  if (planned <= 0) return actual > 0 ? 100 : 0;
  return Math.min(100, Math.round((actual / planned) * 100));
}

export function buildPlanFactMonth(
  month: string,
  txs: PlanFactTxInput[],
  plans: PlanFactPlanInput[],
  spot: number,
  zoneFilter: "RF" | "US" | "ALL" = "ALL",
): PlanFactMonthSnapshot {
  const monthEnd = monthEndIso(month);
  const actualByCat = new Map<string, number>();
  const planByCat = new Map<string, { planned: number; currency: string; name: string; kind: string }>();
  const meta = new Map<string, { name: string; kind: string; currency: string }>();

  for (const p of plans) {
    if (isNonPnlCategory(p.categoryName)) continue;
    meta.set(p.category_id, { name: p.categoryName, kind: p.categoryKind, currency: p.currency });
    const cur = planByCat.get(p.category_id) ?? { planned: 0, currency: p.currency, name: p.categoryName, kind: p.categoryKind };
    cur.planned += Number(p.planned_amount);
    planByCat.set(p.category_id, cur);
  }

  for (const tx of txs) {
    if (tx.ts < month || tx.ts > monthEnd) continue;
    if (isNonPnlCategory(tx.categoryName)) continue;
    if (!tx.category_id) continue;
    if (zoneFilter !== "ALL") {
      const cur = tx.currency === "USD" ? "US" : "RF";
      if (cur !== zoneFilter) continue;
    }
    meta.set(tx.category_id, { name: tx.categoryName, kind: tx.categoryKind, currency: tx.currency });
    const catKind = tx.categoryKind === "income" ? "income" : "expense";
    if (tx.type === "income" && catKind === "income") {
      const amt = Math.abs(Number(tx.amount));
      actualByCat.set(tx.category_id, (actualByCat.get(tx.category_id) ?? 0) + amt);
    } else if (tx.type === "expense" && catKind === "expense") {
      const amt = Math.abs(Number(tx.amount));
      actualByCat.set(tx.category_id, (actualByCat.get(tx.category_id) ?? 0) + amt);
    }
  }

  const income: PlanFactCategoryRow[] = [];
  const expenses: PlanFactCategoryRow[] = [];
  const unplanned: PlanFactCategoryRow[] = [];

  const allIds = new Set([...planByCat.keys(), ...actualByCat.keys()]);
  for (const categoryId of allIds) {
    const plan = planByCat.get(categoryId);
    const m = meta.get(categoryId) ?? plan;
    if (!m) continue;
    const kind = (m.kind === "income" ? "income" : "expense") as "income" | "expense";
    const currency = (plan?.currency ?? m.currency) as "RUB" | "USD";
    const planned = plan?.planned ?? 0;
    const actual = actualByCat.get(categoryId) ?? 0;
    const variance = kind === "expense" ? expenseVariance(planned, actual) : incomeVariance(planned, actual);
    const row: PlanFactCategoryRow = {
      categoryId,
      name: m.name,
      kind,
      currency,
      planned,
      actual,
      variance,
      pct: progressPct(planned, actual),
      hasPlan: planned > 0,
      hasActual: actual > 0,
    };
    if (kind === "income") income.push(row);
    else expenses.push(row);
    if (!row.hasPlan && row.hasActual) unplanned.push(row);
  }

  income.sort((a, b) => b.actual - a.actual);
  expenses.sort((a, b) => b.variance - a.variance);
  unplanned.sort((a, b) => b.actual - a.actual);

  let plannedRub = 0;
  let actualRub = 0;
  for (const row of [...income, ...expenses]) {
    plannedRub += toRubEquiv(row.planned, row.currency, spot);
    actualRub += toRubEquiv(row.actual, row.currency, spot);
  }

  return {
    month,
    monthEnd,
    income,
    expenses,
    unplanned,
    totals: {
      plannedRub,
      actualRub,
      varianceRub: plannedRub - actualRub,
    },
  };
}

export function buildPlanFactSnapshot(txs: PlanFactTx[], plans: PlanFactPlanRow[]): PlanFactSnapshot {
  const incomeFact = { RUB: 0, USD: 0 };
  const incomePlan = { RUB: 0, USD: 0 };
  const factByKey = new Map<string, number>();
  const planByKey = new Map<string, number>();

  for (const tx of txs) {
    if (isNonPnlCategory(tx.categoryName)) continue;
    const cur = tx.currency as "RUB" | "USD";
    const amt = Math.abs(Number(tx.amount));
    if (tx.type === "income") {
      incomeFact[cur] += amt;
    } else if (tx.type === "expense") {
      const key = `${cur}:${tx.categoryName}`;
      factByKey.set(key, (factByKey.get(key) ?? 0) + amt);
    }
  }

  for (const p of plans) {
    if (isNonPnlCategory(p.categoryName)) continue;
    const cur = p.currency as "RUB" | "USD";
    const amt = Number(p.amount);
    if (p.categoryKind === "income") {
      incomePlan[cur] += amt;
    } else {
      const key = `${cur}:${p.categoryName}`;
      planByKey.set(key, (planByKey.get(key) ?? 0) + amt);
    }
  }

  const expenseKeys = [...new Set([...factByKey.keys(), ...planByKey.keys()])].sort((a, b) => {
    return (factByKey.get(b) ?? 0) - (factByKey.get(a) ?? 0);
  });

  const rubExpenses: CategoryLine[] = [];
  const usdExpenses: CategoryLine[] = [];
  for (const key of expenseKeys) {
    const [cur, ...nameParts] = key.split(":");
    const name = nameParts.join(":");
    const line = { name, fact: factByKey.get(key) ?? 0, plan: planByKey.get(key) ?? 0, currency: cur };
    if (cur === "USD") usdExpenses.push(line);
    else rubExpenses.push(line);
  }

  return { incomeFact, incomePlan, rubExpenses, usdExpenses };
}
