"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AgentInsightRow } from "@/lib/agent/types";

function severityClass(severity: string) {
  if (severity === "urgent") return "lf-agent-sev lf-agent-sev--urgent";
  if (severity === "warn") return "lf-agent-sev lf-agent-sev--warn";
  return "lf-agent-sev lf-agent-sev--info";
}

export default function AgentFeedClient({ insights: initial }: { insights: AgentInsightRow[] }) {
  const router = useRouter();
  const [insights, setInsights] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function dismiss(id: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/agent/insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "dismissed" }),
      });
      if (res.ok) {
        setInsights((prev) => prev.filter((i) => i.id !== id));
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  if (insights.length === 0) {
    return (
      <div className="lf-card lf-card--pad lf-card--shadow">
        <div className="lf-eyebrow">Status</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 10 }}>Всё под контролем</div>
        <div className="lf-hint" style={{ marginTop: 8 }}>
          Активных сигналов нет. Агент только наблюдает — денег не двигает.
        </div>
      </div>
    );
  }

  return (
    <div className="lf-card lf-card--flush">
      {insights.map((item) => (
        <div key={item.id} className="lf-row lf-agent-row">
          <div className="lf-agent-row__main">
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className={severityClass(item.severity)}>{item.severity}</span>
              <span style={{ fontSize: 10, opacity: 0.5 }}>{item.kind}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{item.title}</div>
            {item.body && (
              <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 4, lineHeight: 1.45 }}>
                {item.body}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {item.action_route && (
                <Link href={item.action_route} className="lf-btn lf-btn--sm">
                  Сделать
                </Link>
              )}
              <button
                type="button"
                className="lf-btn lf-btn--ghost lf-btn--sm"
                disabled={busyId === item.id}
                onClick={() => dismiss(item.id)}
              >
                Скрыть
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
