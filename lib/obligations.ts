import { displayDebtName } from "@/lib/debts-summary";
import type { DrawerFieldConfig } from "@/lib/drawer-fields";
import { fmtDateShort } from "@/lib/format";
import { obligationZone, toRubEquiv } from "@/lib/terminal-money";

export type { DrawerFieldConfig } from "@/lib/drawer-fields";
export { obligationZone } from "@/lib/terminal-money";

export type ObligationRecord = {
  id: string;
  name: string;
  kind: string;
  currency: string;
  balance: number;
  apr: number | null;
  min_payment: number | null;
  monthly_payment: number | null;
  due_date: string | null;
  due_day: number | null;
  payoff_date: string | null;
  status: string;
  notes: string | null;
  account_id?: string | null;
};

export const OBLIGATION_DRAWER_FIELDS: DrawerFieldConfig[] = [
  { key: "balance", label: "Balance", type: "number", step: "0.01" },
  { key: "apr", label: "APR %", type: "number", step: "0.01" },
  { key: "monthly_payment", label: "Monthly payment", type: "number", step: "0.01" },
  { key: "min_payment", label: "Min payment", type: "number", step: "0.01" },
  { key: "due_date", label: "Due date", type: "date" },
  { key: "due_day", label: "Due day (1–31)", type: "number", step: "1" },
  { key: "payoff_date", label: "Payoff date", type: "date" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Closed" },
    ],
  },
  { key: "notes", label: "Notes", type: "textarea" },
];

export function parseObligationRow(row: Record<string, unknown>): ObligationRecord {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    kind: String(row.kind ?? "other"),
    currency: String(row.currency ?? "RUB"),
    balance: Number(row.balance ?? 0),
    apr: row.apr != null ? Number(row.apr) : null,
    min_payment: row.min_payment != null ? Number(row.min_payment) : null,
    monthly_payment: row.monthly_payment != null ? Number(row.monthly_payment) : null,
    due_date: row.due_date ? String(row.due_date) : null,
    due_day: row.due_day != null ? Number(row.due_day) : null,
    payoff_date: row.payoff_date ? String(row.payoff_date) : null,
    status: String(row.status ?? "active"),
    notes: row.notes != null ? String(row.notes) : null,
    account_id: row.account_id != null ? String(row.account_id) : null,
  };
}

export function kindLabel(kind: string): string {
  if (kind === "loan") return "Loan";
  if (kind === "credit_card") return "Credit card";
  if (kind === "tax_rf") return "Tax (RF)";
  if (kind === "tax_us") return "Tax (US)";
  return "Other";
}

export function matchesKindFilter(kind: string, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "tax") return kind === "tax_rf" || kind === "tax_us";
  return kind === filter;
}

export function fmtDue(o: Pick<ObligationRecord, "due_date" | "due_day">): string {
  if (o.due_date) return fmtDateShort(o.due_date);
  if (o.due_day != null) return `Day ${o.due_day}`;
  return "—";
}

export function aprTone(apr: number | null): "hot" | "cheap" | "mid" {
  const v = Number(apr ?? 0);
  if (v >= 25) return "hot";
  if (v <= 10 && v > 0) return "cheap";
  return "mid";
}

export function aprClass(apr: number | null): string | undefined {
  const t = aprTone(apr);
  if (t === "hot") return "t-down";
  if (t === "cheap") return "t-up";
  return undefined;
}

export type DebtKpis = {
  totalDebtRub: number;
  monthlyInterestRub: number;
  monthlyPaymentsRub: number;
  weightedApr: number;
};

export function computeDebtKpis(obligations: ObligationRecord[], spot: number): DebtKpis {
  let totalDebtRub = 0;
  let monthlyInterestRub = 0;
  let monthlyPaymentsRub = 0;
  let weightedAprSum = 0;
  let weightSum = 0;

  for (const o of obligations) {
    const bal = Math.abs(Number(o.balance));
    if (bal <= 0) continue;
    const rubW = toRubEquiv(bal, o.currency, spot);
    totalDebtRub += rubW;
    if (o.apr != null) {
      monthlyInterestRub += (rubW * Number(o.apr)) / 100 / 12;
      weightedAprSum += rubW * Number(o.apr);
      weightSum += rubW;
    }
    const mp = Number(o.monthly_payment);
    if (mp > 0) monthlyPaymentsRub += toRubEquiv(mp, o.currency, spot);
  }

  return {
    totalDebtRub,
    monthlyInterestRub,
    monthlyPaymentsRub,
    weightedApr: weightSum > 0 ? weightedAprSum / weightSum : 0,
  };
}

/** Illustrative amortization: balance declining by monthly_payment over 12 steps. */
export function amortizationSeries(o: ObligationRecord, steps = 12): number[] {
  let bal = Math.abs(Number(o.balance));
  const pay = Number(o.monthly_payment) || Number(o.min_payment) || bal / steps;
  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    out.push(bal);
    bal = Math.max(0, bal - pay);
  }
  return out;
}

export function obligationDrawerTitle(o: ObligationRecord): string {
  return displayDebtName(o.name);
}
