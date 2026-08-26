export type AgentInsightKind =
  | "payment"
  | "coverage"
  | "fx"
  | "tax"
  | "liquidity"
  | "exposure"
  | "winddown";

export type AgentInsightSeverity = "info" | "warn" | "urgent";

export type AgentInsightInput = {
  dedupe_key: string;
  kind: AgentInsightKind;
  severity: AgentInsightSeverity;
  title: string;
  body: string | null;
  action_route: string | null;
};

export type AgentInsightRow = AgentInsightInput & {
  id: string;
  status: "active" | "resolved" | "dismissed";
  created_at: string;
  updated_at: string;
};

export const SEVERITY_RANK: Record<AgentInsightSeverity, number> = {
  urgent: 0,
  warn: 1,
  info: 2,
};

export function sortInsights<T extends { severity: AgentInsightSeverity; updated_at?: string; created_at?: string }>(
  rows: T[]
) {
  return [...rows].sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (s !== 0) return s;
    const ad = a.updated_at ?? a.created_at ?? "";
    const bd = b.updated_at ?? b.created_at ?? "";
    return bd.localeCompare(ad);
  });
}

export function staleActiveKeys(activeKeys: string[], freshKeys: string[]) {
  const fresh = new Set(freshKeys);
  return activeKeys.filter((k) => !fresh.has(k));
}
