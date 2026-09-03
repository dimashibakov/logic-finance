"use client";

import Link from "next/link";
import type { AgentInsightRow } from "@/lib/agent/types";

type Props = {
  item: AgentInsightRow;
  busy: boolean;
  onDismiss: (id: string) => void;
};

function severityDot(severity: string) {
  if (severity === "urgent") return "lf-insight__dot lf-insight__dot--urgent";
  if (severity === "warn") return "lf-insight__dot lf-insight__dot--warn";
  return "lf-insight__dot";
}

export default function InsightCard({ item, busy, onDismiss }: Props) {
  return (
    <article className="lf-insight">
      <span className={severityDot(item.severity)} aria-hidden />
      <div className="lf-insight__body">
        <div className="lf-insight__kind lf-mono">{item.severity} · {item.kind}</div>
        <div className="lf-insight__title">{item.title}</div>
        {item.body && <p className="lf-insight__text lf-mono">{item.body}</p>}
        {item.action_route && (
          <Link href={item.action_route} className="lf-desktop-btn lf-desktop-btn--sm">
            Open
          </Link>
        )}
      </div>
      <button
        type="button"
        className="lf-insight__dismiss lf-bento-pressable lf-mono"
        disabled={busy}
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </article>
  );
}
