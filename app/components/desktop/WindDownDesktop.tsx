"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DesktopPageBridge from "./DesktopPageBridge";
import Tile from "../bento/Tile";
import { usd } from "@/lib/format";
import {
  dimaShareOfAmount,
  statusLabel,
  type ProvisionalSettlement,
  type WindDownItem,
  type WindDownSummary,
} from "@/lib/winddown";

type Props = {
  spot: number;
  eff: number;
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

export default function WindDownDesktop({ spot, eff, items: initialItems, summary, daysLeft, provisional }: Props) {
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
    <div className="lf-page-desktop">
      <DesktopPageBridge title="5927 wind-down" spot={spot} eff={eff}>
        <div className="lf-desktop-page">
          <div className="lf-bento-grid lf-desktop-debt-tiles">
            <Tile label="DAYS LEFT">
              <div className="lf-bento-val lf-mono">{daysLeft}</div>
              <div className="lf-bento-foot lf-bento-sub">until Dec 2026 close</div>
            </Tile>
            <Tile label="PROGRESS">
              <div className="lf-bento-val lf-mono">{progressPct}%</div>
              <div className="lf-bento-foot lf-bento-sub">
                {moved.length} of {actionable.length} moved
              </div>
            </Tile>
            <Tile label="DIMA SHARE · 8541">
              <div className="lf-bento-val lf-mono">{usd(monthlyDima)}/mo</div>
              {monthlyMoved > 0 && (
                <div className="lf-bento-foot lf-bento-sub">moved {usd(monthlyMoved)}/mo</div>
              )}
            </Tile>
            <Tile label="JOINT TOTAL">
              <div className="lf-bento-val lf-mono">{usd(summary.monthlyJointTotal)}/mo</div>
            </Tile>
          </div>

          <div className="lf-sec-label">
            <span className="lf-sec-label__h">Autopay checklist</span>
            <span className="lf-sec-label__m">tap status</span>
          </div>
          <div className="lf-desktop-panel lf-desktop-panel--flush">
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

          <div className="lf-sec-label" style={{ marginTop: 18 }}>
            <span className="lf-sec-label__h">Provisional settlement</span>
            <Link href="/plan" className="lf-sec-label__m">
              plan →
            </Link>
          </div>
          <section className="lf-desktop-panel">
            <div className="lf-mono" style={{ fontSize: 13, lineHeight: 1.5 }}>
              {provisional.monthsLoaded > 0 ? (
                <>
                  {provisional.monthsLoaded} mo loaded · joint {usd(provisional.jointExpensesTotal)} · Dima{" "}
                  {usd(provisional.dimaShareTotal)}
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
            <p className="lf-bento-sub" style={{ marginTop: 12 }}>
              {provisional.note}
            </p>
          </section>
        </div>
      </DesktopPageBridge>
    </div>
  );
}
