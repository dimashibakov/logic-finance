import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, fetchSpotHistory, getRubPerUsd, effRate } from "@/lib/fx";
import ConvertTerminal from "../components/terminal/ConvertTerminal";
import { parseTransactionRow, type AccountOption, type CategoryOption } from "@/lib/transactions";

export default async function ConvertPage() {
  const supabase = createClient();
  const [{ data: accData }, { data: catData }, { data: txData }, rates, spotHistory] = await Promise.all([
    supabase.from("accounts").select("id, name, currency, zone").eq("in_net_worth", true).order("name"),
    supabase.from("categories").select("id, name, kind, zone").order("name"),
    supabase
      .from("transactions")
      .select(
        "id, ts, amount, currency, type, merchant, notes, fee, reconciled, account_id, category_id, fx_rate, accounts(name, zone), categories(name, kind)",
      )
      .eq("type", "conversion")
      .order("ts", { ascending: false })
      .limit(100),
    fetchFxRates(),
    fetchSpotHistory(90),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);

  return (
    <ConvertTerminal
      accounts={(accData ?? []) as AccountOption[]}
      categories={(catData ?? []) as CategoryOption[]}
      initialConversions={(txData ?? []).map((r) => parseTransactionRow(r as Record<string, unknown>))}
      spot={spot}
      eff={eff}
      spotHistory={spotHistory.map((r) => ({ rate_date: r.rate_date, rub_per_usd: Number(r.rub_per_usd) }))}
    />
  );
}
