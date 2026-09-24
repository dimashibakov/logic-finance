"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import {
  sortInsights,
  type AgentInsightKind,
  type AgentInsightRow,
  type AgentInsightSeverity,
} from "@/lib/agent/types";
import { formatTxDate } from "@/lib/format";
import DetailDrawer from "./DetailDrawer";
import TerminalFxSync from "./TerminalFxSync";
import TerminalPanel from "./TerminalPanel";
import { useTerminalShell } from "./TerminalShellContext";

type Props = {
  initialInsights: AgentInsightRow[];
  spot: number;
  eff: number;
};

const SEVERITIES: Array<AgentInsightSeverity | "all"> = ["all", "urgent", "warn", "info"];
const STATUSES: Array<"all" | "active" | "resolved"> = ["all", "active", "resolved"];
const KINDS: Array<AgentInsightKind | "all"> = [
  "all",
  "payment",
  "coverage",
  "fx",
  "tax",
  "liquidity",
  "exposure",
  "winddown",
];

const AGENT_DRAWER_FIELDS = [
  { key: "severity", label: "Severity", type: "select" as const, options: [
    { value: "info", label: "info" },
    { value: "warn", label: "warn" },
    { value: "urgent", label: "urgent" },
  ]},
  { key: "kind", label: "Kind", type: "text" as const },
  { key: "status", label: "Status", type: "select" as const, options: [
    { value: "active", label: "active" },
    { value: "resolved", label: "resolved" },
  ]},
  { key: "title", label: "Title", type: "text" as const },
  { key: "body", label: "Body", type: "textarea" as const },
  { key: "updated_at", label: "Updated", type: "text" as const },
];

function severityTag(sev: string) {
  if (sev === "urgent") return "t-tag t-tag--down";
  if (sev === "warn") return "t-tag t-tag--hot";
  return "t-tag t-tag--cov";
}

export default function AgentTerminal({ initialInsights, spot: initialSpot, eff }: Props) {
  useTerminalShell();
  const [insights, setInsights] = useState(initialInsights);
  const [severity, setSeverity] = useState<AgentInsightSeverity | "all">("all");
  const [status, setStatus] = useState<"all" | "active" | "resolved">("active");
  const [kind, setKind] = useState<AgentInsightKind | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AgentInsightRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: qErr } = await supabase.from("agent_insights").select("*").order("updated_at", { ascending: false });
    if (qErr) {
      setError(qErr.message);
      return;
    }
    setInsights(sortInsights((data ?? []) as AgentInsightRow[]));
    if (selected) setSelected(((data ?? []) as AgentInsightRow[]).find((i) => i.id === selected.id) ?? null);
  }, [selected]);

  const activeCounts = useMemo(() => {
    const active = insights.filter((i) => i.status === "active");
    return {
      urgent: active.filter((i) => i.severity === "urgent").length,
      warn: active.filter((i) => i.severity === "warn").length,
      info: active.filter((i) => i.severity === "info").length,
    };
  }, [insights]);

  const filtered = useMemo(() => {
    return insights.filter((i) => {
      if (status !== "all" && i.status !== status) return false;
      if (severity !== "all" && i.severity !== severity) return false;
      if (kind !== "all" && i.kind !== kind) return false;
      return true;
    });
  }, [insights, severity, status, kind]);

  const setStatusRemote = async (item: AgentInsightRow, next: "active" | "resolved") => {
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/agent/insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: next }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const saveInsight = async (patch: Partial<AgentInsightRow>) => {
    if (!selected) return;
    const res = await fetch("/api/agent/insights", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        status: patch.status ?? selected.status,
        title: patch.title ?? selected.title,
        body: patch.body ?? selected.body,
        severity: patch.severity ?? selected.severity,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Save failed");
    await load();
  };

  return (
    <div className="t-page t-page--fill">
      <TerminalFxSync spot={initialSpot} eff={eff} />

      <div className="t-page__head">
        <div>
          <h1 className="t-page__title">Agent</h1>
          <div className="t-page__sub">Monitoring signals — read-only, no money moves</div>
        </div>
      </div>

      {error ? <div className="t-page__error">{error}</div> : null}

      <div className="t-summary-grid">
        <div className="t-summary-cell">
          <span className="t-lbl">Active urgent</span>
          <div className="t-summary-val num t-down">{activeCounts.urgent}</div>
        </div>
        <div className="t-summary-cell">
          <span className="t-lbl">Active warn</span>
          <div className="t-summary-val num">{activeCounts.warn}</div>
        </div>
        <div className="t-summary-cell">
          <span className="t-lbl">Active info</span>
          <div className="t-summary-val num">{activeCounts.info}</div>
        </div>
      </div>

      <div className="t-filter-row">
        <label className="t-drawer__field">
          <span className="t-lbl">Severity</span>
          <select className="t-drawer__input t-select" value={severity} onChange={(e) => setSeverity(e.target.value as AgentInsightSeverity | "all")}>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="t-drawer__field">
          <span className="t-lbl">Status</span>
          <select className="t-drawer__input t-select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="t-drawer__field">
          <span className="t-lbl">Kind</span>
          <select className="t-drawer__input t-select" value={kind} onChange={(e) => setKind(e.target.value as AgentInsightKind | "all")}>
            {KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
      </div>

      <TerminalPanel title="Signals" subtitle={`· ${filtered.length} shown`} flush className="t-panel--fill">
        <div className="t-scroll-fill t-agent-feed">
          {filtered.length === 0 ? (
            <div className="t-pay-empty">No signals match filters</div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className={`t-agent-row t-agent-row--${item.severity}`}>
                <button type="button" className="t-agent-row__main" onClick={() => { setSelected(item); setDrawerOpen(true); }}>
                  <span className={severityTag(item.severity)}>{item.severity}</span>
                  <span className="t-tag t-tag--cov">{item.kind}</span>
                  <span className="t-tag">{item.status}</span>
                  <span className="t-agent-row__title">{item.title}</span>
                  {item.body ? <span className="t-agent-row__body">{item.body}</span> : null}
                  <span className="t-agent-row__date num">{formatTxDate(String(item.updated_at).slice(0, 10))}</span>
                </button>
                <div className="t-agent-row__actions">
                  {item.status === "active" ? (
                    <button type="button" className="t-btn t-btn--ghost" disabled={busyId === item.id} onClick={() => void setStatusRemote(item, "resolved")}>
                      Resolve
                    </button>
                  ) : item.status === "resolved" ? (
                    <button type="button" className="t-btn t-btn--ghost" disabled={busyId === item.id} onClick={() => void setStatusRemote(item, "active")}>
                      Reopen
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </TerminalPanel>

      <DetailDrawer
        open={drawerOpen}
        title={selected?.title ?? "Signal"}
        subtitle={selected ? `${selected.kind} · ${selected.status}` : null}
        record={
          selected
            ? {
                ...selected,
                body: selected.body ?? "",
                updated_at: formatTxDate(String(selected.updated_at).slice(0, 10)),
              }
            : null
        }
        fields={AGENT_DRAWER_FIELDS}
        readOnlyKeys={["kind", "updated_at"]}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        onSave={saveInsight}
      />
    </div>
  );
}
