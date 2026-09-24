import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { sortInsights, type AgentInsightRow } from "@/lib/agent/types";
import AgentTerminal from "../components/terminal/AgentTerminal";

export default async function AgentPage() {
  const supabase = createClient();
  const [{ data }, rates] = await Promise.all([
    supabase.from("agent_insights").select("*").order("updated_at", { ascending: false }),
    fetchFxRates(),
  ]);
  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);
  const insights = sortInsights((data ?? []) as AgentInsightRow[]);

  return <AgentTerminal initialInsights={insights} spot={spot} eff={eff} />;
}
