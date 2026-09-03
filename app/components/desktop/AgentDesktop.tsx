"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import DesktopPageBridge from "./DesktopPageBridge";
import InsightCard from "./InsightCard";
import type { AgentInsightRow } from "@/lib/agent/types";

type Props = {
  spot: number;
  eff: number;
  insights: AgentInsightRow[];
};

export default function AgentDesktop({ spot, eff, insights: initial }: Props) {
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

  return (
    <div className="lf-page-desktop">
      <DesktopPageBridge title="Agent" spot={spot} eff={eff}>
        <div className="lf-desktop-page">
          <div className="lf-desktop-pagehead">
            <span className="lf-bento-sub">read-only signals · no money moves</span>
          </div>

          {insights.length === 0 ? (
            <section className="lf-desktop-panel">
              <div className="lf-bento-lab">STATUS</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 10 }}>All clear</div>
              <p className="lf-bento-sub" style={{ marginTop: 8 }}>
                No active signals. Agent monitors only — it never moves money.
              </p>
            </section>
          ) : (
            <div className="lf-desktop-panel" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {insights.map((item) => (
                <InsightCard key={item.id} item={item} busy={busyId === item.id} onDismiss={dismiss} />
              ))}
            </div>
          )}
        </div>
      </DesktopPageBridge>
    </div>
  );
}
