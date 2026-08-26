import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, toUsd } from "@/lib/fx";
import { groupAccounts, illiquidUsdTotal, liquidUsdTotal, type AccountRow } from "@/lib/liquidity";
import { computeNetWorth } from "@/lib/networth";
import {
  coverageByZone,
  fmtDueShort,
  upcomingPayments,
  urgentAlertEvent,
  type ObligationRow,
} from "@/lib/payments";
import { fmtNative, usd } from "@/lib/format";
import { V } from "@/lib/tokens";
import RateHeader from "./components/RateHeader";
import AccountGroup from "./components/AccountGroup";
import PaymentEventRow from "./components/PaymentEventRow";

export default async function Home() {
  const supabase = createClient();
  const [{ data: accData }, { data: oblData }, rates] = await Promise.all([
    supabase.from("accounts").select("*").eq("in_net_worth", true),
    supabase
      .from("obligations")
      .select("id, name, kind, currency, balance, apr, due_date, due_day, monthly_payment, status")
      .eq("status", "active"),
    fetchFxRates(),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const toUsdSpot = (n: number, c: string) => toUsd(n, c, spot);

  const accounts = (accData ?? []) as AccountRow[];
  const obligations = (oblData ?? []) as ObligationRow[];

  const { assets, debt, net } = computeNetWorth(accounts, obligations, toUsdSpot);

  const liquid = liquidUsdTotal(accounts, toUsdSpot);
  const illiquid = illiquidUsdTotal(accounts, toUsdSpot);
  const totalPos = liquid + illiquid;
  const liquidPct = totalPos > 0 ? Math.round((liquid / totalPos) * 100) : 0;
  const illiquidPct = 100 - liquidPct;

  const groups = groupAccounts(accounts);

  const { events } = upcomingPayments(obligations, 90);
  const coverage = coverageByZone(events, accounts, 30);
  const shortByCurrency = Object.fromEntries(coverage.map((c) => [c.currency, c.short])) as Record<"RUB" | "USD", boolean>;
  const upcoming = events.slice(0, 6);
  const alertEvent = urgentAlertEvent(events, coverage);

  return (
    <div className="lf-wrap">
      <div className="lf-phone">
        <RateHeader />

        <div style={{ marginTop: 6 }}>
          <div className="lf-eyebrow">Net worth</div>
          <div className="lf-net-worth lf-mono">{usd(net)}</div>
          <div className="lf-mono lf-text-faint" style={{ fontSize: 12, marginTop: 2 }}>
            assets {usd(assets)} − debt <span className="lf-text-danger">{usd(debt)}</span>
          </div>
        </div>

        <div className="lf-split">
          <div className="lf-card" style={{ padding: 14 }}>
            <div className="lf-label">Liquid</div>
            <div className="lf-split__v lf-mono">{usd(liquid)}</div>
            <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 3 }}>
              banks + cash − cards
            </div>
          </div>
          <div className="lf-card" style={{ padding: 14 }}>
            <div className="lf-label">Illiquid</div>
            <div className="lf-split__v lf-mono lf-text-faint">{usd(illiquid)}</div>
            <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 3 }}>
              real estate + vehicles
            </div>
          </div>
        </div>

        <div className="lf-asset-bar">
          <div style={{ width: `${liquidPct}%`, height: "100%", background: V.accent }} />
          <div style={{ width: `${illiquidPct}%`, height: "100%", background: V.illiquidBar }} />
        </div>
        <div className="lf-mono lf-hint" style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 10.5 }}>
          <span>liquid {liquidPct}%</span>
          <span>illiquid {illiquidPct}%</span>
        </div>

        {alertEvent && (
          <>
            <div className="lf-alert lf-only-terminal">
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1, color: V.warn }} />
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                <b>{alertEvent.name}</b> — due <span style={{ color: V.warn }}>{fmtDueShort(alertEvent.date)}</span>
                {alertEvent.highApr && alertEvent.apr != null && ` · APR ${alertEvent.apr.toFixed(0)}%`}.{" "}
                {shortByCurrency[alertEvent.currency] ? "Zone cash short for next 30d." : "High APR — don’t miss grace."}
              </div>
            </div>
            <div className="lf-alert lf-only-brutalist">
              <span className="lf-alert__big lf-mono">{fmtNative(alertEvent.amount, alertEvent.currency)}</span>
              <span className="lf-alert__txt">
                {alertEvent.name}
                <br />
                due {fmtDueShort(alertEvent.date)}
                {alertEvent.highApr ? " · high apr" : ""} — cover it
              </span>
            </div>
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <div className="lf-sec-label">
              <span className="lf-sec-label__h">Upcoming payments</span>
              <Link href="/payments" className="lf-sec-label__m">
                all →
              </Link>
            </div>
            <div className="lf-card lf-card--flush">
              {upcoming.map((e) => (
                <PaymentEventRow key={e.id} event={e} zoneShort={shortByCurrency[e.currency]} compact />
              ))}
            </div>
          </>
        )}

        <div className="lf-sec-label">
          <span className="lf-sec-label__h">Accounts & assets</span>
          <span className="lf-sec-label__m">{accounts.length} accounts</span>
        </div>
        <AccountGroup title="Liquid · RF banks" accounts={groups.liquidRf} spot={spot} />
        <AccountGroup title="Liquid · US banks" accounts={groups.liquidUs} spot={spot} defaultOpen={false} />
        <AccountGroup title="Cards · debt" accounts={groups.cardsDebt} spot={spot} defaultOpen={false} />
        <AccountGroup title="Illiquid · assets" accounts={groups.illiquid} spot={spot} defaultOpen={false} />
      </div>
    </div>
  );
}
