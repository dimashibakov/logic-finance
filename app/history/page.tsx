import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import HistoryTerminal from "../components/terminal/HistoryTerminal";
import { parseTransactionRow, type AccountOption, type CategoryOption } from "@/lib/transactions";

type PageProps = { searchParams?: { account?: string; type?: string; month?: string; category?: string } };

export default async function HistoryPage({ searchParams }: PageProps) {
  const supabase = createClient();

  const [{ data: txData }, { data: accData }, { data: catData }, rates] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, ts, amount, currency, type, merchant, notes, fee, reconciled, account_id, category_id, source, accounts(name, zone), categories(name, kind)",
      )
      .order("ts", { ascending: false })
      .limit(5000),
    supabase.from("accounts").select("id, name, currency, zone").order("name"),
    supabase.from("categories").select("id, name, kind, zone").order("name"),
    fetchFxRates(),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);

  const transactions = (txData ?? []).map((r) => parseTransactionRow(r as Record<string, unknown>));
  const accounts = (accData ?? []) as AccountOption[];
  const categories = (catData ?? []) as CategoryOption[];

  const initialFilters = {
    accountId: searchParams?.account ?? "",
    type: (searchParams?.type as "all" | "income" | "expense" | "transfer" | "conversion") ?? "all",
    month: searchParams?.month ?? "",
    categoryId: searchParams?.category ?? "",
  };

  return (
    <HistoryTerminal
      initialTransactions={transactions}
      accounts={accounts}
      categories={categories}
      spot={spot}
      eff={eff}
      initialFilters={initialFilters}
    />
  );
}
