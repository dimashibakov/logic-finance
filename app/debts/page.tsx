import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { parseObligationRow } from "@/lib/obligations";
import DebtsTerminal from "../components/terminal/DebtsTerminal";

export default async function DebtsPage() {
  const supabase = createClient();
  const [{ data: oblData }, rates] = await Promise.all([
    supabase.from("obligations").select("*").order("name"),
    fetchFxRates(),
  ]);
  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);
  const obligations = (oblData ?? []).map((r) => parseObligationRow(r as Record<string, unknown>));

  return <DebtsTerminal initialObligations={obligations} spot={spot} eff={eff} />;
}
