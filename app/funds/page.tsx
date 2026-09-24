import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { parseFundRow } from "@/lib/funds";
import FundsTerminal from "../components/terminal/FundsTerminal";

export default async function FundsPage() {
  const supabase = createClient();
  const [{ data: fundRows, error: fundError }, rates] = await Promise.all([
    supabase.from("funds").select("*").order("due_date", { ascending: true, nullsFirst: false }),
    fetchFxRates(),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);
  const funds = (fundRows ?? []).map((row) => parseFundRow(row as Record<string, unknown>));

  return <FundsTerminal initialFunds={funds} spot={spot} eff={eff} initialError={fundError?.message ?? null} />;
}
