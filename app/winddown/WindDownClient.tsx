"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { usd } from "@/lib/format";
import {
  dimaShareOfAmount,
  statusLabel,
  type ProvisionalSettlement,
  type WindDownItem,
  type WindDownSummary,
} from "@/lib/winddown";

type Props = {
  items: WindDownItem[];
  summary: WindDownSummary;
  daysLeft: number;
  provisional: ProvisionalSettlement;
};

function StatusButton({ item, onUpdated }: { item: WindDownItem; onUpdated: (item: WindDownItem) => void }) {
  const [busy, setBusy] = useState(false);
  const cls =
    item.status === "moved"
      ? "lf-wd-status lf-wd-status--moved"
      : item.status === "na"
        ? "lf-wd-status lf-wd-status--na"
        : "lf-wd-status";

  async function cycle() {
    setBusy(true);
    try {
      const res = await fetch("/api/winddown", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, cycle: true }),
      });
      const json = await res.json();
      if (res.ok && json.item) onUpdated(json.item as WindDownItem);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={cls} onClick={cycle} disabled={busy} aria-label={`Status ${item.status}`}>
      {statusLabel(item.status)}
    </button>
  );
}

export default function WindDownClient({ items: initialItems, summary: initialSummary, daysLeft, provisional }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);

  function replaceItem(next: WindDownItem) {
    setItems((prev) => prev.map((i) => (i.id === next.id ? next : i)));
    router.refresh();
  }

  const actionable = items.filter((i) => i.status !== "na");
  const moved = items.filter((i) => i.status === "moved");
  const progressPct = actionable.length > 0 ? Math.round((moved.length / actionable.length) * 100) : 0;
  const monthlyDima = actionable.reduce(
    (s, i) => s + dimaShareOfAmount(Math.abs(Number(i.amount) || 0), i.split),
    0
  );
  const monthlyMoved = moved.reduce(
    (s, i) => s + dimaShareOfAmount(Math.abs(Number(i.amount) || 0), i.split),
    0
  );

  return (
    <>
      <div className="lf-card lf-card--pad lf-card--shadow">
        <div className="lf-eyebrow">5927 wind-down</div>
        <div className="lf-mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>
          {daysLeft} days
        </div>
        <div className="lf-hint" style={{ marginTop: 4 }}>
          until Dec 2026 close · move autopays before shutdown
        </div>
        <div className="lf-progress" style={{ marginTop: 14 }}>
          <div className="lf-progress__fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="lf-mono lf-hint" style={{ fontSize: 11, marginTop: 8 }}>
          {moved.length} of {actionable.length} moved
        </div>
      </div>

      <div className="lf-sec-label">
        <span className="lf-sec-label__h">Autopay checklist</span>
        <span className="lf-sec-label__m">tap status</span>
      </div>

      <div className="lf-card lf-card--flush">
        {items.map((item) => {
          const amt = Math.abs(Number(item.amount) || 0);
          const dima = dimaShareOfAmount(amt, item.split);
          return (
            <div key={item.id} className="lf-row lf-wd-row">
              <div className="lf-wd-row__main">
                <div style={{ fontSize: 14, fontWeight: 550 }}>{item.label}</div>
                <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, marginTop: 3, lineHeight: 1.4 }}>
                  {usd(amt)} joint · {usd(dima)} Dima · {item.split}
                  {item.target_account && (
                    <>
                      <br />→ {item.target_account}
                    </>
                  )}
                  {item.moved_on && <> · moved {item.moved_on}</>}
                </div>
              </div>
              <StatusButton item={item} onUpdated={replaceItem} />
            </div>
          );
        })}
      </div>

      <div className="lf-callout">
        <div className="lf-eyebrow">After wind-down · 8541 load</div>
        <div className="lf-mono" style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>
          {usd(monthlyDima)}/mo <span className="lf-text-faint">Dima share</span>
        </div>
        {monthlyMoved > 0 && (
          <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 6 }}>
            already moved: {usd(monthlyMoved)}/mo
          </div>
        )}
        <div className="lf-note" style={{ marginTop: 10 }}>
          update <code>lib/exposure-config.ts</code> after rent share moves (8541 rent load changes)
        </div>
      </div>

      <div className="lf-sec-label">
        <span className="lf-sec-label__h">Provisional settlement</span>
        <Link href="/plan" className="lf-sec-label__m">
          plan →
        </Link>
      </div>

      <div className="lf-card lf-card--pad">
        <div className="lf-mono" style={{ fontSize: 13, lineHeight: 1.5 }}>
          {provisional.monthsLoaded > 0 ? (
            <>
              {provisional.monthsLoaded} mo loaded · joint {usd(provisional.jointExpensesTotal)} · Dima {usd(provisional.dimaShareTotal)}
            </>
          ) : (
            <span className="lf-text-faint">No 5927 statement data loaded yet</span>
          )}
        </div>
        {provisional.accountBalance != null && (
          <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 8 }}>
            5927 balance now {usd(provisional.accountBalance)}
          </div>
        )}
        <div className="lf-hint" style={{ marginTop: 12, fontSize: 10 }}>
          {provisional.note}
        </div>
      </div>
    </>
  );
}
