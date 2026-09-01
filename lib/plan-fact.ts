import { isNonPnlCategory } from "./non-pnl";

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
