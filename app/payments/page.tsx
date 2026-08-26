import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtNative } from "@/lib/format";
import {
  coverageByZone,
  groupEventsByMonth,
  monthLabel,
  upcomingPayments,
  type ObligationRow,
} from "@/lib/payments";
import type { AccountRow } from "@/lib/liquidity";
import RateHeader from "../components/RateHeader";
import PaymentEventRow from "../components/PaymentEventRow";

export default async function PaymentsPage() {
  const supabase = createClient();
  const [{ data: oblData }, { data: accData }] = await Promise.all([
    supabase.from("obligations").select("id, name, kind, currency, balance, apr, due_date, due_day, monthly_payment, status").eq("status", "active"),
    supabase.from("accounts").select("currency, type, balance").eq("in_net_worth", true),
  ]);

  const obligations = (oblData ?? []) as ObligationRow[];
  const accounts = (accData ?? []) as Pick<AccountRow, "currency" | "type" | "balance">[];
  const { events, undated } = upcomingPayments(obligations, 90);
  const coverage = coverageByZone(events, accounts, 30);
  const shortByCurrency = Object.fromEntries(coverage.map((c) => [c.currency, c.short])) as Record<"RUB" | "USD", boolean>;
  const grouped = groupEventsByMonth(events);

  return (
    <div className="lf-wrap">
      <div className="lf-phone">
        <RateHeader title="Payments" />

        <div className="lf-sec-label">
          <span className="lf-sec-label__h">Next 30 days</span>
          <Link href="/" className="lf-sec-label__m">
            overview →
          </Link>
        </div>

        <div className="lf-zone-grid">
          {coverage.map((z) => (
            <div key={z.currency} className="lf-card lf-zone-card">
              <div className="lf-label">{z.currency} zone</div>
              <div className="lf-mono" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>
                <span className="lf-text-faint">due </span>
                {fmtNative(z.due30, z.currency)}
                <span className="lf-text-faint"> / liquid </span>
                {fmtNative(z.liquid, z.currency)}
              </div>
              <span className={`lf-zone-badge${z.short ? " lf-zone-badge--short" : " lf-zone-badge--ok"}`}>
                {z.short ? "short" : "ok"}
              </span>
            </div>
          ))}
        </div>

        {events.length === 0 && undated.length === 0 && (
          <div className="lf-hint" style={{ marginTop: 16 }}>
            No upcoming payments in the next 90 days.
          </div>
        )}

        {grouped.map(([ym, monthEvents]) => (
          <div key={ym}>
            <div className="lf-sec-label">
              <span className="lf-sec-label__h">{monthLabel(ym)}</span>
              <span className="lf-sec-label__m">{monthEvents.length} due</span>
            </div>
            <div className="lf-card lf-card--flush">
              {monthEvents.map((e) => (
                <PaymentEventRow key={e.id} event={e} zoneShort={shortByCurrency[e.currency]} />
              ))}
            </div>
          </div>
        ))}

        {undated.length > 0 && (
          <>
            <div className="lf-sec-label">
              <span className="lf-sec-label__h">Без даты — задайте срок</span>
            </div>
            <div className="lf-card lf-card--flush">
              {undated.map((o) => (
                <div key={o.id} className="lf-row lf-pay-row">
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 550 }}>{o.name}</div>
                    <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 3 }}>
                      дата не задана · balance due
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
    </div>
  );
}
