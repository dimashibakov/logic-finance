import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentInsightInput } from "./types";
import { staleActiveKeys } from "./types";

export async function syncAgentInsights(supabase: SupabaseClient, insights: AgentInsightInput[]) {
  const now = new Date().toISOString();
  const freshKeys = insights.map((i) => i.dedupe_key);

  if (insights.length > 0) {
    const { error: upsertErr } = await supabase.from("agent_insights").upsert(
      insights.map((i) => ({
        dedupe_key: i.dedupe_key,
        kind: i.kind,
        severity: i.severity,
        title: i.title,
        body: i.body,
        action_route: i.action_route,
        status: "active",
        updated_at: now,
      })),
      { onConflict: "dedupe_key" }
    );
    if (upsertErr) throw new Error(upsertErr.message);
  }

  const { data: activeRows, error: readErr } = await supabase
    .from("agent_insights")
    .select("dedupe_key")
    .eq("status", "active");
  if (readErr) throw new Error(readErr.message);

  const toResolve = staleActiveKeys((activeRows ?? []).map((r) => r.dedupe_key), freshKeys);
  if (toResolve.length > 0) {
    const { error: resolveErr } = await supabase
      .from("agent_insights")
      .update({ status: "resolved", updated_at: now })
      .in("dedupe_key", toResolve)
      .eq("status", "active");
    if (resolveErr) throw new Error(resolveErr.message);
  }

  return { upserted: insights.length, resolved: toResolve.length };
}
