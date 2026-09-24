import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { parseFundRow } from "@/lib/funds";
import { forecastMonthKeys } from "@/lib/cash-forecast";
import type { PlanRowInput } from "@/lib/cash-forecast";
import type { ObligationRow } from "@/lib/payments";
import CashPlannerTerminal from "../components/terminal/CashPlannerTerminal";

type CatJoin = { name: string; kind: string } | { name: string; kind: string }[] | null;

function relCat(c: CatJoin) {
  if (!c) return { name: "Uncategorized", kind: "expense" };
  return Array.isArray(c) ? { name: c[0]?.name ?? "Uncategorized", kind: c[0]?.kind ?? "expense" } : c;
}

function monthEndIso(monthStart: string): string {
  const d = new Date(`${monthStart.slice(0, 10)}T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}

export default async function CashPlannerPage() {
  const supabase = createClient();
  const monthKeys = forecastMonthKeys(12);
  const rangeEnd = monthEndIso(monthKeys[monthKeys.length - 1]!);

  const [{ data: planData }, { data: oblData }, { data: fundData }, rates] = await Promise.all([
    supabase
      .from("plan")
      .select("month, planned_amount, currency, categories(name, kind)")
      .lte("month", rangeEnd)
      .order("month", { ascending: true }),
    supabase
      .from("obligations")
      .select("id, name, kind, currency, balance, apr, due_date, due_day, monthly_payment, min_payment, status, account_id")
      .eq("status", "active"),
    supabase.from("funds").select("*").order("due_date", { ascending: true, nullsFirst: false }),
    fetchFxRates(),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);

  const plans: PlanRowInput[] = (planData ?? []).map((p) => {
    const cat = relCat(p.categories as CatJoin);
    return {
      month: String(p.month).slice(0, 10),
      planned_amount: Number(p.planned_amount),
      currency: String(p.currency),
      categoryName: cat.name,
      categoryKind: cat.kind,
    };
  });

  const obligations = (oblData ?? []) as ObligationRow[];
  const funds = (fundData ?? []).map((r) => parseFundRow(r as Record<string, unknown>));

  return <CashPlannerTerminal plans={plans} obligations={obligations} funds={funds} spot={spot} eff={eff} />;
}
