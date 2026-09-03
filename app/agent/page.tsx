import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { sortInsights, type AgentInsightRow } from "@/lib/agent/types";
import RateHeader from "../components/RateHeader";
import AgentFeedClient from "./AgentFeedClient";
import AgentDesktop from "../components/desktop/AgentDesktop";

export default async function AgentPage() {
  const supabase = createClient();
  const [{ data }, rates] = await Promise.all([
    supabase.from("agent_insights").select("*").eq("status", "active"),
    fetchFxRates(),
  ]);
  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);
  const insights = sortInsights((data ?? []) as AgentInsightRow[]);

  return (
    <div className="lf-wrap lf-wrap--desktop">
      <AgentDesktop spot={spot} eff={eff} insights={insights} />
      <div className="lf-phone lf-page-mobile">
        <RateHeader title="Agent" subtitle="read-only signals" />
        <div className="lf-sec-label">
          <span className="lf-sec-label__h">Active insights</span>
          <Link href="/" className="lf-sec-label__m">
            overview →
          </Link>
        </div>
        <AgentFeedClient insights={insights} />
        <div className="lf-hint" style={{ marginTop: 14, fontSize: 10 }}>
          monitoring & alerts · no money moves
        </div>
      </div>
    </div>
  );
}
