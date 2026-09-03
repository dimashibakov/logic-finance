import { fmtDateShort } from "./format";

export type DebtObligation = {
  id: string;
  name: string;
  kind: string;
  currency: string;
  balance: number;
  apr: number | null;
  monthly_payment: number | null;
  due_date: string | null;
};

export function displayDebtName(name: string) {
  return name.replace(/\s*\(карта\)\s*$/i, "");
}

function weightRub(o: DebtObligation, spot: number) {
  const bal = Math.abs(Number(o.balance));
  return o.currency === "USD" ? bal * spot : bal;
}

export function computeDebtSummary(obligations: DebtObligation[], spot: number) {
  const active = obligations.filter((o) => Number(o.balance) !== 0 || o.apr != null);
  const sorted = [...active].sort((a, b) => Number(b.apr ?? 0) - Number(a.apr ?? 0));

  let totalRub = 0;
  let weightedAprSum = 0;
  let weightSum = 0;

  for (const o of active) {
    const w = weightRub(o, spot);
    if (Math.abs(Number(o.balance)) <= 0) continue;
    totalRub += w;
    if (o.apr != null) {
      weightedAprSum += w * Number(o.apr);
      weightSum += w;
    }
  }

  const target = sorted.find((o) => Number(o.balance) !== 0) ?? null;

  let nextDue: { date: string; name: string; amount: number; currency: string } | null = null;
  for (const o of active) {
    if (!o.due_date || Number(o.balance) === 0) continue;
    const amt = Number(o.monthly_payment ?? o.balance);
    if (!nextDue || o.due_date < nextDue.date) {
      nextDue = { date: o.due_date, name: displayDebtName(o.name), amount: Math.abs(amt), currency: o.currency };
    }
  }

  return {
    sorted,
    target,
    totalRub,
    weightedApr: weightSum > 0 ? weightedAprSum / weightSum : 0,
    nextDue,
  };
}

export function fmtDueLabel(date: string) {
  return fmtDateShort(date);
}
