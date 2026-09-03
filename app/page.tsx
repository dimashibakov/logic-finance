import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sortInsights, type AgentInsightRow } from "@/lib/agent/types";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { groupAccounts, illiquidUsdTotal, liquidUsdTotal, type AccountRow } from "@/lib/liquidity";
import { computeNetWorth } from "@/lib/networth";
import { computeExposure } from "@/lib/exposure";
import {
  coverageByZone,
  fmtDueShort,
  upcomingPayments,
  urgentAlertEvent,
  type ObligationRow,
} from "@/lib/payments";
import { fmtNative, rub, toUsd, usd } from "@/lib/format";
import { computeTveFloatBalance, tveFloatHint, TVE_FLOAT_CATEGORY } from "@/lib/non-pnl";
import { V } from "@/lib/tokens";
import RateHeader from "./components/RateHeader";
import AccountGroup from "./components/AccountGroup";
import UpcomingPaymentsSection from "./components/UpcomingPaymentsSection";
import OverviewDesktop from "./components/bento/OverviewDesktop";

export default async function Home() {
  const supabase = createClient();
  const [{ data: accData }, { data: oblData }, rates, { data: insightData }, { data: floatTxData }] = await Promise.all([
    supabase.from("accounts").select("*").eq("in_net_worth", true),
    supabase
      .from("obligations")
      .select("id, name, kind, currency, balance, apr, due_date, due_day, monthly_payment, status, account_id")
      .eq("status", "active"),
    fetchFxRates(),
    supabase.from("agent_insights").select("*").eq("status", "active"),
    supabase
      .from("transactions")
      .select("amount, type, categories(name)")
      .in("source", ["statement", "manual"]),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);
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
  const activeInsights = sortInsights((insightData ?? []) as AgentInsightRow[]);
  const urgentInsight = activeInsights.find((i) => i.severity === "urgent") ?? activeInsights[0] ?? null;
  const bannerInsight = urgentInsight?.severity === "urgent" ? urgentInsight : null;

  const accountByObligation = Object.fromEntries(obligations.map((o) => [o.id, o.account_id ?? null]));

  type FloatCat = { name: string } | { name: string }[] | null;
  const tveFloat = computeTveFloatBalance(
    (floatTxData ?? []).map((tx) => {
      const c = tx.categories as FloatCat;
      const categoryName = !c ? null : Array.isArray(c) ? c[0]?.name ?? null : c.name;
      return { amount: Number(tx.amount), type: String(tx.type), categoryName };
    })
  );
  const showTveFloat = (floatTxData ?? []).some((tx) => {
    const c = tx.categories as FloatCat;
    const name = !c ? null : Array.isArray(c) ? c[0]?.name ?? null : c.name;
    return name === TVE_FLOAT_CATEGORY;
  });

  const exposureAccounts = accounts.map((a) => ({
    balance: Number(a.balance),
    currency: a.currency,
    type: a.type,
    zone: a.zone,
  }));
  const exposureObligations = obligations.map((o) => ({
    balance: Number(o.balance),
    currency: o.currency,
    kind: o.kind,
  }));
  const exposure = computeExposure(exposureAccounts, exposureObligations, spot, eff);

  return (
    <div className="lf-wrap lf-wrap--overview">
      <OverviewDesktop
        spot={spot}
        eff={eff}
        assets={assets}
        debt={debt}
        net={net}
        liquid={liquid}
        accountCount={accounts.length}
        groups={groups}
        exposure={exposure}
        exposureAccounts={exposureAccounts}
        exposureObligations={exposureObligations}
        upcoming={upcoming}
        shortByCurrency={shortByCurrency}
        accountByObligation={accountByObligation}
        tveFloat={tveFloat}
        showTveFloat={showTveFloat}
      />
      <div className="lf-phone lf-overview-mobile">
        <RateHeader />

        {activeInsights.length > 0 && (
          <Link href="/agent" className="lf-agent-cta">
            <span className="lf-agent-cta__badge">⚡ {activeInsights.length}</span>
            <span className="lf-agent-cta__label">Agent</span>
            <span className="lf-agent-cta__arrow">→</span>
          </Link>
        )}

        <div style={{ marginTop: 6 }}>
          <div className="lf-eyebrow">Net worth</div>
          <div className="lf-net-worth lf-mono">{usd(net)}</div>
          <div className="lf-mono lf-text-faint" style={{ fontSize: 12, marginTop: 2 }}>
            assets {usd(assets)} − debt <span className="lf-text-danger">{usd(debt)}</span>
          </div>
        </div>

        <div className="lf-split">
          <Link href="/cash" className="lf-card" style={{ padding: 14, textDecoration: "none", color: "inherit" }}>
            <div className="lf-label">Liquid</div>
            <div className="lf-split__v lf-mono">{usd(liquid)}</div>
            <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 3 }}>
              banks + cash − cards · <span className="lf-sec-label__m">cash →</span>
            </div>
          </Link>
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

        {showTveFloat && (
          <div className="lf-card" style={{ padding: 14, marginTop: 10 }}>
            <div className="lf-label">TVE float</div>
            <div
              className={`lf-mono${tveFloat < 0 ? " lf-text-danger" : tveFloat > 0 ? " lf-text-success" : ""}`}
              style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}
            >
              {tveFloat < 0 ? "−" : ""}
              {rub(Math.abs(tveFloat))}
            </div>
            <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, marginTop: 4 }}>
              {tveFloatHint(tveFloat)} · reimbursable
            </div>
          </div>
        )}

        {bannerInsight && (
          <>
            <div className="lf-alert lf-only-terminal">
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1, color: V.warn }} />
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                <b>{bannerInsight.title}</b>
                {bannerInsight.body && <> — {bannerInsight.body}</>}
              </div>
            </div>
            <div className="lf-alert lf-only-brutalist">
              <span className="lf-alert__big lf-mono">{bannerInsight.severity.toUpperCase()}</span>
              <span className="lf-alert__txt">
                {bannerInsight.title}
                <br />
                {bannerInsight.body ?? "agent signal"} —{" "}
                {bannerInsight.action_route && (
                  <Link href={bannerInsight.action_route} style={{ color: "inherit" }}>
                    open
                  </Link>
                )}
              </span>
            </div>
          </>
        )}

        {!bannerInsight && alertEvent && (
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
          <UpcomingPaymentsSection
            events={upcoming}
            shortByCurrency={shortByCurrency}
            accountByObligation={accountByObligation}
          />
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
