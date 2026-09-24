import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import {
  listPlanMonths,
  monthEndIso,
  resolvePlanMonth,
  type PlanFactPlanInput,
  type PlanFactTxInput,
} from "@/lib/plan-fact";
import PlanFactTerminal from "../components/terminal/PlanFactTerminal";
import { parseTransactionRow, type AccountOption, type CategoryOption, type TransactionRecord } from "@/lib/transactions";

type CatJoin = { name: string; kind: string } | { name: string; kind: string }[] | null;

function relCat(c: CatJoin) {
  if (!c) return { name: "Uncategorized", kind: "expense" };
  return Array.isArray(c) ? { name: c[0]?.name ?? "Uncategorized", kind: c[0]?.kind ?? "expense" } : c;
}

type PageProps = { searchParams?: { month?: string } };

export default async function PlanPage({ searchParams }: PageProps) {
  const supabase = createClient();
  const [{ data: planMonthRows }, { data: txMonthRows }] = await Promise.all([
    supabase.from("plan").select("month"),
    supabase.from("transactions").select("ts").in("source", ["statement", "manual"]),
  ]);
  const months = listPlanMonths(
    (planMonthRows ?? []).map((p) => String(p.month)),
    (txMonthRows ?? []).map((t) => String(t.ts)),
  );
  const month = resolvePlanMonth(searchParams?.month, months);
  const monthEnd = monthEndIso(month);

  const [{ data: txData }, { data: planData }, { data: accData }, { data: catData }, rates] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, ts, amount, currency, type, category_id, merchant, notes, fee, reconciled, account_id, accounts(name, zone), categories(name, kind)",
      )
      .gte("ts", month)
      .lte("ts", monthEnd)
      .in("source", ["statement", "manual"]),
    supabase.from("plan").select("planned_amount, currency, category_id, categories(name, kind)").eq("month", month),
    supabase.from("accounts").select("id, name, currency, zone").order("name"),
    supabase.from("categories").select("id, name, kind, zone").order("name"),
    fetchFxRates(),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);

  const allTxs = (txData ?? []).map((r) => parseTransactionRow(r as Record<string, unknown>)) as TransactionRecord[];

  const txInputs: PlanFactTxInput[] = allTxs.map((tx) => ({
    id: tx.id,
    amount: tx.amount,
    currency: tx.currency,
    type: tx.type,
    ts: tx.ts,
    category_id: tx.category_id,
    categoryName: tx.category_name ?? "Uncategorized",
    categoryKind: tx.category_kind ?? "expense",
  }));

  const planInputs: PlanFactPlanInput[] = (planData ?? []).map((p) => {
    const cat = relCat(p.categories as CatJoin);
    return {
      category_id: String(p.category_id),
      planned_amount: Number(p.planned_amount),
      currency: String(p.currency),
      categoryName: cat.name,
      categoryKind: cat.kind,
    };
  });

  return (
    <PlanFactTerminal
      month={month}
      months={months}
      initialTxs={txInputs}
      initialPlans={planInputs}
      initialAllTxs={allTxs}
      accounts={(accData ?? []) as AccountOption[]}
      categories={(catData ?? []) as CategoryOption[]}
      spot={spot}
      eff={eff}
    />
  );
}
