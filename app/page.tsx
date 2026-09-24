import { createClient } from "@/lib/supabase/server";
import { sortInsights, type AgentInsightRow } from "@/lib/agent/types";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { groupAccounts, illiquidUsdTotal, liquidUsdTotal, type AccountRow } from "@/lib/liquidity";
import { computeNetWorth } from "@/lib/networth";
import { computeExposure } from "@/lib/exposure";
import {
  coverageByZone,
  MONTHS_AHEAD,
  paymentHorizonDays,
  upcomingPayments,
  type ObligationRow,
} from "@/lib/payments";
import { toUsd } from "@/lib/format";
import { computeTveFloatBalance, TVE_FLOAT_CATEGORY } from "@/lib/non-pnl";
import { parseFundRow } from "@/lib/funds";
import OverviewTerminal from "./components/terminal/OverviewTerminal";

export default async function Home() {
  const supabase = createClient();
  const [{ data: accData }, { data: oblData }, rates, { data: insightData }, { data: floatTxData }, { data: fundData }] =
    await Promise.all([
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
      supabase.from("funds").select("*").order("due_date", { ascending: true, nullsFirst: false }),
    ]);

  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);
  const toUsdSpot = (n: number, c: string) => toUsd(n, c, spot);

  const accounts = (accData ?? []) as AccountRow[];
  const obligations = (oblData ?? []) as ObligationRow[];

  const { assets, debt, net } = computeNetWorth(accounts, obligations, toUsdSpot);
  const liquid = liquidUsdTotal(accounts, toUsdSpot);
  const groups = groupAccounts(accounts);

  const paymentHorizon = paymentHorizonDays(MONTHS_AHEAD);
  const { events } = upcomingPayments(obligations, paymentHorizon);
  const coverage = coverageByZone(events, accounts, 30);
  const shortByCurrency = Object.fromEntries(coverage.map((c) => [c.currency, c.short])) as Record<
    "RUB" | "USD",
    boolean
  >;
  const accountByObligation = Object.fromEntries(obligations.map((o) => [o.id, o.account_id ?? null]));

  type FloatCat = { name: string } | { name: string }[] | null;
  const tveFloat = computeTveFloatBalance(
    (floatTxData ?? []).map((tx) => {
      const c = tx.categories as FloatCat;
      const categoryName = !c ? null : Array.isArray(c) ? c[0]?.name ?? null : c.name;
      return { amount: Number(tx.amount), type: String(tx.type), categoryName };
    }),
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
  const insights = sortInsights((insightData ?? []) as AgentInsightRow[]);
  const funds = (fundData ?? []).map((row) => parseFundRow(row as Record<string, unknown>));

  return (
    <OverviewTerminal
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
        upcoming={events}
        allEvents={events}
        shortByCurrency={shortByCurrency}
        accountByObligation={accountByObligation}
        obligations={obligations}
        tveFloat={tveFloat}
        showTveFloat={showTveFloat}
        funds={funds}
        insights={insights}
      />
  );
}
