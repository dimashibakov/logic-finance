"use client";

import { useMemo } from "react";
import DesktopPageBridge from "./DesktopPageBridge";
import DataTable from "./DataTable";
import Tile from "../bento/Tile";
import PaymentEventRow from "../PaymentEventRow";
import { fmtNative } from "@/lib/format";
import {
  groupEventsTimeline,
  monthLabel,
  type PaymentEvent,
  type UndatedObligation,
  type ZoneCoverage,
} from "@/lib/payments";

type Props = {
  spot: number;
  eff: number;
  coverage: ZoneCoverage[];
  events: PaymentEvent[];
  undated: UndatedObligation[];
  shortByCurrency: Record<"RUB" | "USD", boolean>;
  accountByObligation: Record<string, string | null | undefined>;
};

function paymentHref(event: PaymentEvent, accountByObligation: Record<string, string | null | undefined>) {
  const accountId = accountByObligation[event.obligationId];
  if (accountId) return `/account/${accountId}`;
  return `/payments#obl-${event.obligationId}`;
}

function due30Total(events: PaymentEvent[]) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  let rub = 0;
  let usd = 0;
  for (const e of events) {
    if (e.date > cutoffStr) continue;
    if (e.currency === "USD") usd += e.amount;
    else rub += e.amount;
  }
  return { rub, usd, count: events.filter((e) => e.date <= cutoffStr).length };
}

export default function PaymentsDesktop({
  spot,
  eff,
  coverage,
  events,
  undated,
  shortByCurrency,
  accountByObligation,
}: Props) {
  const { thisWeek, laterByMonth } = useMemo(() => groupEventsTimeline(events), [events]);
  const due30 = useMemo(() => due30Total(events), [events]);
  const rfCoverage = coverage.find((c) => c.currency === "RUB");
  const usCoverage = coverage.find((c) => c.currency === "USD");
  const nextDue = events[0] ?? null;

  const due30Label =
    due30.rub > 0 && due30.usd > 0
      ? `${fmtNative(due30.rub, "RUB")} + ${fmtNative(due30.usd, "USD")}`
      : due30.usd > 0
        ? fmtNative(due30.usd, "USD")
        : fmtNative(due30.rub, "RUB");

  function coverageTile(z: ZoneCoverage | undefined) {
    if (!z) return "—";
    return (
      <>
        <div className="lf-bento-val lf-mono" style={{ fontSize: 17 }}>
          {fmtNative(z.due30, z.currency)}
          <span className="lf-bento-sub" style={{ fontSize: 12 }}>
            {" "}
            / {fmtNative(z.liquid, z.currency)}
          </span>
        </div>
        <div className="lf-bento-foot">
          <span className={`lf-zone-badge${z.short ? " lf-zone-badge--short" : " lf-zone-badge--ok"}`}>
            {z.short ? "short" : "ok"}
          </span>
        </div>
      </>
    );
  }

  function eventRows(list: PaymentEvent[]) {
    return list.map((event) => (
      <tr key={event.id}>
        <td colSpan={3} style={{ padding: 0, border: "none" }}>
          <PaymentEventRow
            event={event}
            zoneShort={shortByCurrency[event.currency]}
            compact
            href={paymentHref(event, accountByObligation)}
          />
        </td>
      </tr>
    ));
  }

  return (
    <div className="lf-page-desktop">
      <DesktopPageBridge title="Payments" spot={spot} eff={eff}>
        <div className="lf-desktop-page">
          <div className="lf-bento-grid lf-desktop-debt-tiles">
            <Tile label="NEXT 30 DAYS">
              <div className="lf-bento-val lf-mono" style={{ fontSize: 17 }}>
                {due30Label}
              </div>
              <div className="lf-bento-foot lf-bento-sub">{due30.count} due</div>
            </Tile>
            <Tile label="RF COVERAGE">{coverageTile(rfCoverage)}</Tile>
            <Tile label="US COVERAGE">{coverageTile(usCoverage)}</Tile>
            <Tile label="NEXT DUE">
              {nextDue ? (
                <>
                  <div className="lf-bento-val lf-mono" style={{ fontSize: 17 }}>
                    {fmtNative(nextDue.amount, nextDue.currency)}
                  </div>
                  <div className="lf-bento-foot lf-bento-sub">
                    {nextDue.name} · {nextDue.date}
                  </div>
                </>
              ) : (
                <div className="lf-bento-val lf-mono" style={{ fontSize: 17 }}>
                  —
                </div>
              )}
            </Tile>
          </div>

          {thisWeek.length > 0 && (
            <>
              <div className="lf-sec-label">
                <span className="lf-sec-label__h">This week</span>
                <span className="lf-sec-label__m">{thisWeek.length} due</span>
              </div>
              <DataTable flush className="lf-data-table--dense">
                <thead>
                  <tr>
                    <th>PAYMENT</th>
                    <th className="lf-bento-r">DATE</th>
                    <th className="lf-bento-r">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>{eventRows(thisWeek)}</tbody>
              </DataTable>
            </>
          )}

          {laterByMonth.map(([ym, monthEvents]) => (
            <div key={ym} style={{ marginTop: 18 }}>
              <div className="lf-sec-label">
                <span className="lf-sec-label__h">{monthLabel(ym)}</span>
                <span className="lf-sec-label__m">{monthEvents.length} due</span>
              </div>
              <DataTable flush className="lf-data-table--dense">
                <tbody>{eventRows(monthEvents)}</tbody>
              </DataTable>
            </div>
          ))}

          {events.length === 0 && undated.length === 0 && (
            <p className="lf-bento-sub">No upcoming payments in the next 90 days.</p>
          )}

          {undated.length > 0 && (
            <>
              <div className="lf-sec-label" style={{ marginTop: 18 }}>
                <span className="lf-sec-label__h">No due date</span>
              </div>
              <div className="lf-desktop-panel lf-desktop-panel--flush">
                {undated.map((o) => (
                  <div key={o.id} id={`obl-${o.id}`} className="lf-row lf-pay-row">
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 550 }}>{o.name}</div>
                      <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 3 }}>
                        no date set · balance due
                      </div>
                    </div>
                    <div className="lf-mono" style={{ fontSize: 14, fontWeight: 600, textAlign: "right" }}>
                      {fmtNative(o.amount, o.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DesktopPageBridge>
    </div>
  );
}
