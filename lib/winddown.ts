import { WINDDOWN_CONFIG, type WindDownConfig } from "./winddown-config";

export type WindDownStatus = "todo" | "moved" | "na";

export type WindDownItem = {
  id: string;
  label: string;
  amount: number | null;
  currency: string;
  split: string;
  target_account: string | null;
  status: WindDownStatus;
  moved_on: string | null;
  note: string | null;
};

export type WindDownSummary = {
  total: number;
  movedCount: number;
  progressPct: number;
  monthlyJointTotal: number;
  monthlyDimaShare: number;
  monthlyDimaOn8541: number;
  monthlyDimaMoved: number;
};

export type ProvisionalSettlement = {
  monthsLoaded: number;
  monthLabels: string[];
  jointExpensesTotal: number;
  dimaShareTotal: number;
  accountBalance: number | null;
  note: string;
};

export type WindDownTx = {
  amount: number;
  type: string;
  ts: string;
  notes: string | null;
};

function atNoon(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function daysToDeadline(today: string | Date = new Date(), deadline = WINDDOWN_CONFIG.DEADLINE) {
  const t = typeof today === "string" ? atNoon(today) : today;
  const end = atNoon(deadline);
  const start = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

export function dimaShareOfAmount(amount: number, split: string) {
  if (split === "100% Dima") return amount;
  if (split === "50/50") return amount / 2;
  return amount / 2;
}

export function nextWindDownStatus(status: WindDownStatus): WindDownStatus {
  if (status === "todo") return "moved";
  if (status === "moved") return "na";
  return "todo";
}

export function windDownSummary(items: WindDownItem[]): WindDownSummary {
  const actionable = items.filter((i) => i.status !== "na");
  const moved = items.filter((i) => i.status === "moved");

  const monthlyJointTotal = actionable.reduce((s, i) => s + Math.abs(Number(i.amount) || 0), 0);
  const monthlyDimaShare = actionable.reduce(
    (s, i) => s + dimaShareOfAmount(Math.abs(Number(i.amount) || 0), i.split),
    0
  );
  const monthlyDimaMoved = moved.reduce(
    (s, i) => s + dimaShareOfAmount(Math.abs(Number(i.amount) || 0), i.split),
    0
  );

  return {
    total: actionable.length,
    movedCount: moved.length,
    progressPct: actionable.length > 0 ? (moved.length / actionable.length) * 100 : 0,
    monthlyJointTotal,
    monthlyDimaShare,
    monthlyDimaOn8541: monthlyDimaShare,
    monthlyDimaMoved,
  };
}

function isDogWalking(text: string, config: WindDownConfig) {
  return new RegExp(config.DOG_WALKING_PATTERN, "i").test(text);
}

function isFiftyFiftyStored(text: string) {
  return /\[50% Dim share\]/i.test(text);
}

export function provisionalSettlement(
  txs: WindDownTx[],
  accountBalance: number | null,
  config: WindDownConfig = WINDDOWN_CONFIG
): ProvisionalSettlement {
  const expenseTxs = txs.filter((t) => t.type === "expense");
  const months = new Set(expenseTxs.map((t) => t.ts.slice(0, 7)));
  const monthLabels = [...months].sort();

  let jointExpensesTotal = 0;
  let dimaShareTotal = 0;

  for (const tx of expenseTxs) {
    const amt = Math.abs(Number(tx.amount));
    const meta = `${tx.notes ?? ""}`;
    if (isDogWalking(meta, config)) {
      jointExpensesTotal += amt;
      dimaShareTotal += amt;
    } else if (isFiftyFiftyStored(meta)) {
      jointExpensesTotal += amt * 2;
      dimaShareTotal += amt;
    } else {
      jointExpensesTotal += amt * 2;
      dimaShareTotal += amt;
    }
  }

  return {
    monthsLoaded: monthLabels.length,
    monthLabels,
    jointExpensesTotal,
    dimaShareTotal,
    accountBalance,
    note: "estimate from loaded months; final split — coordinate directly with Dina",
  };
}

export function windDownItems(items: WindDownItem[]) {
  return {
    items,
    summary: windDownSummary(items),
  };
}

export function statusLabel(status: WindDownStatus) {
  if (status === "moved") return "moved";
  if (status === "na") return "n/a";
  return "todo";
}
