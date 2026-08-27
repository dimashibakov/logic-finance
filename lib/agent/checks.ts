import { getRubPerUsd, type FxRate } from "@/lib/fx";
import { computeFxTiming } from "@/lib/fx-timing";
import { computeExposure } from "@/lib/exposure";
import type { AccountRow } from "@/lib/liquidity";
import { projectRubBalance, safeToLock } from "@/lib/liquidity-planner";
import {
  coverageByZone,
  daysUntil,
  upcomingPayments,
  type ObligationRow,
  type PaymentEvent,
} from "@/lib/payments";
import { rub, usd } from "@/lib/format";
import { taxReserves } from "@/lib/taxes";
import { daysToDeadline, windDownSummary, type WindDownItem } from "@/lib/winddown";
import type { AgentInsightInput } from "./types";

export type AgentDataSnapshot = {
  accounts: Pick<AccountRow, "currency" | "type" | "balance" | "zone">[];
  obligations: ObligationRow[];
  fxRates: FxRate[];
  winddownItems: WindDownItem[];
  usTaxReserveBalance: number | null;
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoToday(d: Date) {
  return d.toISOString().slice(0, 10);
}

function paymentChecks(
  events: PaymentEvent[],
  shortByCurrency: Record<"RUB" | "USD", boolean>
): AgentInsightInput[] {
  const out: AgentInsightInput[] = [];
  for (const e of events) {
    if (e.daysUntil > 14) continue;
    const uncovered = shortByCurrency[e.currency];
    if (!e.highApr && !uncovered) continue;
    const severity = e.highApr && e.daysUntil <= 14 ? "urgent" : "warn";
    out.push({
      dedupe_key: `payment:${e.obligationId}:${e.date}`,
      kind: "payment",
      severity,
      title: `${e.name} · ${e.daysUntil === 0 ? "today" : `${e.daysUntil}d`}`,
      body: [
        e.highApr && e.apr != null ? `APR ${e.apr.toFixed(0)}%` : null,
        uncovered ? `${e.currency} zone short for 30d` : "High APR — don’t miss grace",
      ]
        .filter(Boolean)
        .join(" · "),
      action_route: "/payments",
    });
  }
  return out;
}

function coverageChecks(coverage: ReturnType<typeof coverageByZone>, today: Date): AgentInsightInput[] {
  const ym = monthKey(today);
  return coverage
    .filter((z) => z.short)
    .map((z) => ({
      dedupe_key: `coverage:${z.currency}:${ym}`,
      kind: "coverage" as const,
      severity: "warn" as const,
      title: `${z.currency} coverage short · 30d`,
      body: `Due ${z.currency === "USD" ? usd(z.due30) : rub(z.due30)} vs liquid ${z.currency === "USD" ? usd(z.liquid) : rub(z.liquid)} in the next 30 days.`,
      action_route: "/payments",
    }));
}

function fxChecks(fxRates: FxRate[], today: Date): AgentInsightInput[] {
  const spotRows = fxRates.filter((r) => r.kind === "spot");
  if (spotRows.length === 0) return [];
  const timing = computeFxTiming(spotRows);
  if (timing.avg30 <= 0) return [];

  const diffPct = ((timing.current - timing.avg30) / timing.avg30) * 100;
  if (Math.abs(diffPct) < 5) return [];

  const favorable = diffPct < 0;
  const ym = monthKey(today);
  return [
    {
      dedupe_key: `fx:${favorable ? "favorable" : "expensive"}:${ym}`,
      kind: "fx",
      severity: "info",
      title: favorable ? "Spot below 30d average" : "Spot above 30d average",
      body: `${Math.abs(diffPct).toFixed(1)}% vs 30d avg · spot ${timing.current.toFixed(2)} ₽/$`,
      action_route: "/convert",
    },
  ];
}

function taxChecks(reserves: ReturnType<typeof taxReserves>, today: Date): AgentInsightInput[] {
  const ym = monthKey(today);
  const out: AgentInsightInput[] = [];

  if (reserves.us.status === "behind") {
    out.push({
      dedupe_key: `tax:us:${ym}`,
      kind: "tax",
      severity: "warn",
      title: "US tax reserve behind accrual",
      body: `Target ${reserves.us.shouldBeReserved.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} reserved by now.`,
      action_route: "/plan",
    });
  }

  const npdDays = daysUntil(reserves.npd.nextDue, today);
  if (npdDays <= 14) {
    out.push({
      dedupe_key: `tax:npd:${ym}`,
      kind: "tax",
      severity: "warn",
      title: `Rental tax (NPD) due ${reserves.npd.nextDueLabel}`,
      body: `${rub(reserves.npd.monthly)}/mo rental tax · due in ${npdDays}d`,
      action_route: "/plan",
    });
  }

  return out;
}

function liquidityChecks(
  accounts: AgentDataSnapshot["accounts"],
  obligations: ObligationRow[],
  today: Date
): AgentInsightInput[] {
  const projection = projectRubBalance(accounts, obligations, 90, today);
  const lock30 = safeToLock(projection, 30);
  const daysToStress = daysUntil(projection.stressDate, today);
  if (lock30.safeAmount < 50_000 || daysToStress <= 30) return [];

  return [
    {
      dedupe_key: `liquidity:${monthKey(today)}`,
      kind: "liquidity",
      severity: "info",
      title: "Short deposit window before stress node",
      body: `Safe to lock ~${rub(lock30.safeAmount)} for 30d before ${projection.stressDate.slice(5)} node.`,
      action_route: "/cash",
    },
  ];
}

function exposureChecks(accounts: AgentDataSnapshot["accounts"], obligations: ObligationRow[], spot: number): AgentInsightInput[] {
  const exposure = computeExposure(accounts, obligations, spot);
  if (exposure.conversionSharePct <= 25) return [];

  const today = new Date();
  return [
    {
      dedupe_key: `exposure:${monthKey(today)}`,
      kind: "exposure",
      severity: "info",
      title: "USD costs weigh on RUB income",
      body: `Conversion load ~${exposure.conversionSharePct.toFixed(0)}% of monthly RUB income at spot ${spot.toFixed(2)}.`,
      action_route: "/convert",
    },
  ];
}

function winddownChecks(items: WindDownItem[], today: Date): AgentInsightInput[] {
  const daysLeft = daysToDeadline(today);
  const summary = windDownSummary(items);
  const pending = summary.total - summary.movedCount;
  if (daysLeft > 60 || pending <= 0) return [];

  return [
    {
      dedupe_key: "winddown:pending",
      kind: "winddown",
      severity: "warn",
      title: `5927 wind-down · ${daysLeft}d left`,
      body: `${pending} autopay item${pending === 1 ? "" : "s"} not moved yet.`,
      action_route: "/winddown",
    },
  ];
}

export function runAllChecks(snapshot: AgentDataSnapshot, today = new Date()): AgentInsightInput[] {
  const { events } = upcomingPayments(snapshot.obligations, 90, today);
  const coverage = coverageByZone(events, snapshot.accounts, 30, today);
  const shortByCurrency = Object.fromEntries(coverage.map((c) => [c.currency, c.short])) as Record<
    "RUB" | "USD",
    boolean
  >;
  const spot = getRubPerUsd(snapshot.fxRates, "spot");
  const reserves = taxReserves(today, undefined, snapshot.usTaxReserveBalance);

  return [
    ...paymentChecks(events, shortByCurrency),
    ...coverageChecks(coverage, today),
    ...fxChecks(snapshot.fxRates, today),
    ...taxChecks(reserves, today),
    ...liquidityChecks(snapshot.accounts, snapshot.obligations, today),
    ...exposureChecks(snapshot.accounts, snapshot.obligations, spot),
    ...winddownChecks(snapshot.winddownItems, today),
  ];
}
