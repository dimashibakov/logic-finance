"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { fmtNative } from "@/lib/format";
import {
  amortizationSeries,
  OBLIGATION_DRAWER_FIELDS,
  obligationDrawerTitle,
  parseObligationRow,
  type ObligationRecord,
} from "@/lib/obligations";
import {
  coverageByZone,
  groupEventsByMonth,
  monthDividerLabel,
  PAYMENTS_HOT_DAYS,
  PAYMENTS_MONTHS_AHEAD,
  paymentHorizonDays,
  upcomingPayments,
  type ObligationRow,
  type PaymentEvent,
} from "@/lib/payments";
import { loadPaidEventIds, markEventPaid, persistPaidEventIds } from "@/lib/paid-events";
import { fmtDisplayMoney } from "@/lib/terminal-money";
import type { AccountRow } from "@/lib/liquidity";
import AmortChart from "./AmortChart";
import DetailDrawer from "./DetailDrawer";
import TerminalFxSync from "./TerminalFxSync";
import TerminalPanel from "./TerminalPanel";
import { matchesZone, useTerminalShell } from "./TerminalShellContext";

type AccountPick = Pick<AccountRow, "id" | "name" | "currency" | "type" | "balance">;

type Props = {
  initialObligations: ObligationRecord[];
  initialAccounts: AccountPick[];
  spot: number;
  eff: number;
};

function monthOptions(events: PaymentEvent[]): { value: string; label: string }[] {
  const keys = [...new Set(events.map((e) => e.date.slice(0, 7)))].sort();
  return [{ value: "all", label: "All months" }, ...keys.map((k) => ({ value: k, label: monthDividerLabel(k) }))];
}

export default function PaymentsTerminal({ initialObligations, initialAccounts, spot: initialSpot, eff }: Props) {
  const { zone, displayCurrency, searchQuery } = useTerminalShell();
  const [obligations, setObligations] = useState(initialObligations);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [spot, setSpot] = useState(initialSpot);
  const [paidIds, setPaidIds] = useState<Set<string>>(() => loadPaidEventIds());
  const [monthFilter, setMonthFilter] = useState("all");
  const [selectedObl, setSelectedObl] = useState<ObligationRecord | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PaymentEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const horizon = paymentHorizonDays(PAYMENTS_MONTHS_AHEAD);
  const { events: allEvents } = useMemo(
    () => upcomingPayments(obligations as ObligationRow[], horizon, new Date(), PAYMENTS_HOT_DAYS),
    [obligations, horizon],
  );

  const coverage = useMemo(() => coverageByZone(allEvents, accounts, 30), [allEvents, accounts]);
  const shortByCurrency = Object.fromEntries(coverage.map((c) => [c.currency, c.short])) as Record<
    "RUB" | "USD",
    boolean
  >;

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allEvents.filter((e) => {
      if (paidIds.has(e.id)) return false;
      const z = e.zone === "RUB" ? "RF" : "US";
      if (!matchesZone(z, zone)) return false;
      if (monthFilter !== "all" && !e.date.startsWith(monthFilter)) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allEvents, paidIds, zone, monthFilter, searchQuery]);

  const grouped = useMemo(() => groupEventsByMonth(filteredEvents), [filteredEvents]);
  const nextDate = filteredEvents[0]?.date;
  const months = useMemo(() => monthOptions(allEvents), [allEvents]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: oblRows, error: oblErr }, { data: accRows }, { data: fxRows }] = await Promise.all([
      supabase
        .from("obligations")
        .select(
          "id, name, kind, currency, balance, apr, due_date, due_day, monthly_payment, min_payment, payoff_date, status, notes, account_id",
        )
        .order("name"),
      supabase.from("accounts").select("id, name, currency, type, balance").eq("in_net_worth", true),
      supabase.from("fx_rates").select("rub_per_usd").eq("kind", "spot").order("rate_date", { ascending: false }).limit(1),
    ]);
    if (oblErr) {
      setError(oblErr.message);
      return;
    }
    if (fxRows?.[0]?.rub_per_usd) setSpot(Number(fxRows[0].rub_per_usd));
    setObligations((oblRows ?? []).map((r) => parseObligationRow(r as Record<string, unknown>)));
    setAccounts((accRows ?? []) as AccountPick[]);
    if (selectedObl) {
      const next = (oblRows ?? []).find((r) => String(r.id) === selectedObl.id);
      if (next) setSelectedObl(parseObligationRow(next as Record<string, unknown>));
    }
  }, [selectedObl]);

  const openEvent = (event: PaymentEvent) => {
    const obl = obligations.find((o) => o.id === event.obligationId) ?? null;
    setSelectedEvent(event);
    setSelectedObl(obl);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedEvent(null);
    setSelectedObl(null);
  };

  const saveObligation = async (patch: Partial<ObligationRecord>) => {
    if (!selectedObl) return;
    const supabase = createClient();
    const { error: updErr } = await supabase.from("obligations").update(patch).eq("id", selectedObl.id);
    if (updErr) throw new Error(updErr.message);
    await load();
  };

  const deleteObligation = async () => {
    if (!selectedObl) return;
    const supabase = createClient();
    const { error: delErr } = await supabase.from("obligations").delete().eq("id", selectedObl.id);
    if (delErr) throw new Error(delErr.message);
    closeDrawer();
    await load();
  };

  const resolveAccountId = (event: PaymentEvent, obl: ObligationRecord): string | null => {
    if (obl.account_id) return obl.account_id;
    const liquid = accounts.filter(
      (a) => a.currency === event.currency && ["checking", "cash"].includes(a.type),
    );
    return liquid[0]?.id ?? accounts.find((a) => a.currency === event.currency)?.id ?? null;
  };

  const handleMarkPaid = async () => {
    if (!selectedEvent || !selectedObl) return;
    const accountId = resolveAccountId(selectedEvent, selectedObl);
    if (!accountId) {
      setError("No account linked — assign account_id on this obligation.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          type: "expense",
          amount: selectedEvent.amount,
          currency: selectedEvent.currency,
          ts: selectedEvent.date,
          merchant: selectedObl.name,
          notes: `Payment: ${selectedObl.name}`,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Failed to record payment");

      if (["loan", "credit_card"].includes(selectedObl.kind) && Number(selectedObl.balance) > 0) {
        const supabase = createClient();
        const newBal = Math.max(0, Number(selectedObl.balance) - selectedEvent.amount);
        await supabase.from("obligations").update({ balance: newBal }).eq("id", selectedObl.id);
      }

      const nextPaid = markEventPaid(selectedEvent.id);
      setPaidIds(nextPaid);
      await load();
      closeDrawer();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mark paid failed");
    } finally {
      setBusy(false);
    }
  };

  const clearPaidMarks = () => {
    persistPaidEventIds(new Set());
    setPaidIds(new Set());
  };

  const summaryText =
    filteredEvents.length === 0
      ? "No upcoming payments"
      : `${filteredEvents.length} upcoming · next ${nextDate ? new Date(`${nextDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}`;

  return (
    <div className="t-page">
      <TerminalFxSync spot={initialSpot} eff={eff} />

      {error ? <div className="t-page__error">{error}</div> : null}

      <div className="t-page__head">
        <div>
          <h1 className="t-page__title">Payments</h1>
          <div className="t-page__sub num">{summaryText}</div>
        </div>
        {paidIds.size > 0 ? (
          <button type="button" className="t-chip" onClick={clearPaidMarks}>
            Reset paid marks
          </button>
        ) : null}
      </div>

      <div className="t-page__filters">
        <label className="t-page__filter-label">
          <span className="t-lbl">Month</span>
          <select className="t-drawer__input" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <TerminalPanel title="Upcoming" subtitle={`· ${PAYMENTS_MONTHS_AHEAD} mo horizon`} flush>
        {filteredEvents.length === 0 ? (
          <div className="t-pay-empty">No upcoming payments in this filter</div>
        ) : (
          grouped.map(([ym, monthEvents]) => (
            <div key={ym}>
              <div className="t-month-divider">{monthDividerLabel(ym)}</div>
              {monthEvents.map((event) => {
                const d = new Date(`${event.date}T12:00:00`);
                const covered = !shortByCurrency[event.currency];
                return (
                  <button key={event.id} type="button" className="t-pay-row t-pay-row--btn" onClick={() => openEvent(event)}>
                    <span className="num t-pay-day">{d.getDate()}</span>
                    <span className="t-pay-mon">{d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</span>
                    <span className="t-pay-name">{event.name}</span>
                    <span className="t-tag t-tag--cov">{event.zone === "RUB" ? "RF" : "US"}</span>
                    <span className="num t-pay-amt">
                      {fmtDisplayMoney(event.amount, event.currency, displayCurrency, spot)}
                    </span>
                    <span className="t-pay-tags">
                      {event.hot ? <span className="t-tag t-tag--hot">HOT</span> : null}
                      {event.highApr && event.apr != null ? (
                        <span className="t-tag t-tag--down">APR {Math.round(event.apr)}%</span>
                      ) : null}
                      {covered ? <span className="t-tag t-tag--cov">COVERED</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </TerminalPanel>

      <DetailDrawer
        open={drawerOpen}
        title={selectedObl ? obligationDrawerTitle(selectedObl) : selectedEvent?.name ?? ""}
        subtitle={
          selectedEvent ? (
            <>
              <span className="num">{fmtNative(selectedEvent.amount, selectedEvent.currency)}</span>
              {" · "}
              {new Date(`${selectedEvent.date}T12:00:00`).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </>
          ) : null
        }
        record={selectedObl}
        fields={OBLIGATION_DRAWER_FIELDS}
        onClose={closeDrawer}
        onSave={saveObligation}
        onDelete={deleteObligation}
        footerExtra={
          selectedEvent && selectedObl ? (
            <button type="button" className="t-btn t-btn--primary" disabled={busy} onClick={() => void handleMarkPaid()}>
              {busy ? "Recording…" : "Mark paid"}
            </button>
          ) : null
        }
        extra={
          selectedObl && Math.abs(Number(selectedObl.balance)) > 0 ? (
            <AmortChart series={amortizationSeries(selectedObl)} currency={selectedObl.currency} />
          ) : null
        }
      />
    </div>
  );
}
