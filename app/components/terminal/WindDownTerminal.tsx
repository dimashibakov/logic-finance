"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { fmtCompactMoney } from "@/lib/bento-overview";
import {
  dimaShareOfAmount,
  statusLabel,
  type WindDownItem,
  type WindDownStatus,
} from "@/lib/winddown";
import { fmtNative } from "@/lib/format";
import DetailDrawer from "./DetailDrawer";
import TerminalFxSync from "./TerminalFxSync";
import TerminalPanel from "./TerminalPanel";
import TerminalTable from "./TerminalTable";
import { useTerminalShell } from "./TerminalShellContext";

type Props = {
  initialItems: WindDownItem[];
  spot: number;
  eff: number;
};

const WINDDOWN_DRAWER_FIELDS = [
  { key: "label", label: "Label", type: "text" as const },
  { key: "amount", label: "Amount", type: "number" as const, step: "0.01" },
  {
    key: "currency",
    label: "Currency",
    type: "select" as const,
    options: [
      { value: "USD", label: "USD" },
      { value: "RUB", label: "RUB" },
    ],
  },
  {
    key: "split",
    label: "Split",
    type: "select" as const,
    options: [
      { value: "50/50", label: "50/50" },
      { value: "100% Dima", label: "100% Dima" },
    ],
  },
  { key: "target_account", label: "Target account", type: "text" as const },
  {
    key: "status",
    label: "Status",
    type: "select" as const,
    options: [
      { value: "todo", label: "todo" },
      { value: "moved", label: "moved" },
      { value: "na", label: "n/a" },
    ],
  },
  { key: "moved_on", label: "Moved on", type: "date" as const },
  { key: "note", label: "Note", type: "textarea" as const },
];

function itemDimaShare(item: WindDownItem): number {
  return dimaShareOfAmount(Math.abs(Number(item.amount) || 0), item.split);
}

export default function WindDownTerminal({ initialItems, spot: initialSpot, eff }: Props) {
  const { displayCurrency } = useTerminalShell();
  const [items, setItems] = useState(initialItems);
  const [spot, setSpot] = useState(initialSpot);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<WindDownItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data, error: qErr }, { data: fxRows }] = await Promise.all([
      supabase.from("joint_winddown").select("*").order("created_at", { ascending: true }),
      supabase.from("fx_rates").select("rub_per_usd").eq("kind", "spot").order("rate_date", { ascending: false }).limit(1),
    ]);
    if (qErr) {
      setError(qErr.message);
      return;
    }
    if (fxRows?.[0]?.rub_per_usd) setSpot(Number(fxRows[0].rub_per_usd));
    const parsed = (data ?? []) as WindDownItem[];
    setItems(parsed);
    if (selected) setSelected(parsed.find((i) => i.id === selected.id) ?? null);
  }, [selected]);

  const kpis = useMemo(() => {
    const actionable = items.filter((i) => i.status !== "na");
    const moved = items.filter((i) => i.status === "moved");
    const totalRub = actionable.reduce((s, i) => {
      const share = itemDimaShare(i);
      return s + (i.currency === "USD" ? share * spot : share);
    }, 0);
    const movedRub = moved.reduce((s, i) => {
      const share = itemDimaShare(i);
      return s + (i.currency === "USD" ? share * spot : share);
    }, 0);
    return { totalRub, movedRub, remainingRub: totalRub - movedRub };
  }, [items, spot]);

  const fmtKpi = (rub: number) =>
    displayCurrency === "USD" ? fmtCompactMoney(rub / spot, "USD") : fmtCompactMoney(rub, "RUB");

  const markMoved = async (item: WindDownItem) => {
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/winddown", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: "moved" }),
      });
      const json = (await res.json()) as { error?: string; item?: WindDownItem };
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const saveItem = async (patch: Partial<WindDownItem>) => {
    if (!selected) return;
    const res = await fetch("/api/winddown", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        label: patch.label ?? selected.label,
        amount: patch.amount != null ? Number(patch.amount) : selected.amount,
        currency: patch.currency ?? selected.currency,
        split: patch.split ?? selected.split,
        target_account: patch.target_account ?? selected.target_account,
        status: patch.status ?? selected.status,
        moved_on: patch.moved_on ?? selected.moved_on,
        note: patch.note ?? selected.note,
      }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(json.error ?? "Save failed");
    await load();
  };

  return (
    <div className="t-page t-page--fill">
      <TerminalFxSync spot={initialSpot} eff={eff} />

      <div className="t-page__head">
        <div>
          <h1 className="t-page__title">BoFA Wind-down</h1>
          <div className="t-page__sub">Joint 5927 autopays — move to 8541 before close</div>
        </div>
      </div>

      {error ? <div className="t-page__error">{error}</div> : null}

      <div className="t-summary-grid">
        <div className="t-summary-cell">
          <span className="t-lbl">Total to move</span>
          <div className="t-summary-val num">{fmtKpi(kpis.totalRub)}</div>
          <div className="t-summary-sub">Dima share · monthly</div>
        </div>
        <div className="t-summary-cell">
          <span className="t-lbl">Moved</span>
          <div className="t-summary-val num t-up">{fmtKpi(kpis.movedRub)}</div>
        </div>
        <div className="t-summary-cell">
          <span className="t-lbl">Remaining</span>
          <div className="t-summary-val num">{fmtKpi(kpis.remainingRub)}</div>
        </div>
      </div>

      <TerminalPanel title="Autopay checklist" flush className="t-panel--fill">
        <div className="t-scroll-fill">
          <TerminalTable
            columns={[
              { key: "label", label: "Label", sortValue: (i) => i.label, render: (i) => i.label },
              {
                key: "amount",
                label: "Amount",
                align: "right",
                sortValue: (i) => Number(i.amount ?? 0),
                render: (i) => <span className="num">{fmtNative(Math.abs(Number(i.amount) || 0), i.currency === "USD" ? "USD" : "RUB")}</span>,
              },
              { key: "currency", label: "Cur.", sortValue: (i) => i.currency, render: (i) => i.currency },
              { key: "split", label: "Split", sortValue: (i) => i.split, render: (i) => i.split },
              {
                key: "target",
                label: "Target account",
                sortValue: (i) => i.target_account ?? "",
                render: (i) => i.target_account ?? "—",
              },
              {
                key: "status",
                label: "Status",
                sortValue: (i) => i.status,
                render: (i) => (
                  <span className={`t-tag ${i.status === "moved" ? "t-tag--up" : i.status === "na" ? "t-tag--cov" : "t-tag--hot"}`}>
                    {statusLabel(i.status)}
                  </span>
                ),
              },
              {
                key: "moved_on",
                label: "Moved on",
                sortValue: (i) => i.moved_on ?? "",
                render: (i) => <span className="num">{i.moved_on ?? "—"}</span>,
              },
              {
                key: "actions",
                label: "",
                render: (i) =>
                  i.status === "todo" ? (
                    <button type="button" className="t-btn t-btn--ghost" disabled={busyId === i.id} onClick={(e) => { e.stopPropagation(); void markMoved(i); }}>
                      Mark moved
                    </button>
                  ) : null,
              },
            ]}
            rows={items}
            rowKey={(i) => i.id}
            onRowClick={(i) => { setSelected(i); setDrawerOpen(true); }}
            empty="No wind-down items"
          />
        </div>
      </TerminalPanel>

      <DetailDrawer
        open={drawerOpen}
        title={selected?.label ?? "Wind-down item"}
        subtitle={selected ? `${selected.split} · ${selected.currency}` : null}
        record={selected ? { ...selected, amount: selected.amount ?? 0, note: selected.note ?? "", target_account: selected.target_account ?? "", moved_on: selected.moved_on ?? "" } : null}
        fields={WINDDOWN_DRAWER_FIELDS}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        onSave={saveItem}
      />
    </div>
  );
}
