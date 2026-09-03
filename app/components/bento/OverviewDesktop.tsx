"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { rub, toUsd } from "@/lib/format";
import {
  buildCompositionSegments,
  fmtCompactMoney,
  fxExposureLabel,
  pairMoney,
  sumZoneBalances,
  type BaseCurrency,
} from "@/lib/bento-overview";
import { computeSensitivity, type ExposureAccount, type ExposureObligation, type ExposureSnapshot } from "@/lib/exposure";
import type { AccountGroups } from "@/lib/liquidity";
import { tveFloatHint } from "@/lib/non-pnl";
import type { PaymentEvent } from "@/lib/payments";
import { useAddSheet } from "../AddSheetContext";
import AccountsTable from "./AccountsTable";
import PaymentCard from "./PaymentCard";
import Tile from "./Tile";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/convert", label: "Convert" },
  { href: "/debts", label: "Debts" },
  { href: "/plan", label: "Plan" },
  { href: "/import", label: "Import" },
] as const;

type Props = {
  spot: number;
  eff: number;
  assets: number;
  debt: number;
  net: number;
  liquid: number;
  accountCount: number;
  groups: AccountGroups;
  exposure: ExposureSnapshot;
  exposureAccounts: ExposureAccount[];
  exposureObligations: ExposureObligation[];
  upcoming: PaymentEvent[];
  shortByCurrency: Record<"RUB" | "USD", boolean>;
  accountByObligation: Record<string, string | null | undefined>;
  tveFloat: number;
  showTveFloat: boolean;
};

function paymentHref(event: PaymentEvent, accountByObligation: Record<string, string | null | undefined>) {
  const accountId = accountByObligation[event.obligationId];
  if (accountId) return `/account/${accountId}`;
  return `/payments#obl-${event.obligationId}`;
}

function monthLabel(events: PaymentEvent[]) {
  const raw = events[0]?.date;
  if (!raw) return new Date().toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return new Date(`${raw}T12:00:00`).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}

export default function OverviewDesktop({
  spot,
  eff,
  assets,
  debt,
  net,
  liquid,
  accountCount,
  groups,
  exposure,
  exposureAccounts,
  exposureObligations,
  upcoming,
  shortByCurrency,
  accountByObligation,
  tveFloat,
  showTveFloat,
}: Props) {
  const pathname = usePathname();
  const { openView } = useAddSheet();
  const [baseCurrency, setBaseCurrency] = useState<BaseCurrency>("RUB");

  const rf = sumZoneBalances(groups.liquidRf);
  const us = sumZoneBalances(groups.liquidUs);
  const liquidRubBasis = useMemo(() => {
    let total = 0;
    for (const a of [...groups.liquidRf, ...groups.liquidUs]) {
      const b = Number(a.balance);
      if (b <= 0) continue;
      total += a.currency === "RUB" ? b : b * spot;
    }
    return total;
  }, [groups.liquidRf, groups.liquidUs, spot]);

  const netPair = pairMoney(net, spot, baseCurrency, { approx: true });
  const liquidPair = pairMoney(liquid, spot, baseCurrency);
  const debtPair = pairMoney(debt, spot, baseCurrency);
  const rfUsdTotal = toUsd(rf.rub, "RUB", spot) + rf.usd;
  const usUsdTotal = toUsd(us.rub, "RUB", spot) + us.usd;
  const rfPrimary =
    baseCurrency === "RUB" ? fmtCompactMoney(rfUsdTotal * spot, "RUB") : fmtCompactMoney(rfUsdTotal, "USD");
  const usPrimary =
    baseCurrency === "RUB" ? fmtCompactMoney(usUsdTotal * spot, "RUB") : fmtCompactMoney(usUsdTotal, "USD");

  const composition = buildCompositionSegments(groups, spot);
  const compositionTotal = composition.reduce((s, c) => s + c.valueUsd, 0);

  const rateShockOneRub = 1 / spot;
  const sensitivity = useMemo(
    () => computeSensitivity(exposureAccounts, exposureObligations, spot, rateShockOneRub),
    [exposureAccounts, exposureObligations, spot]
  );

  const tableGroups = [
    { title: "LIQUID · RF BANKS", accounts: groups.liquidRf },
    { title: "LIQUID · US BANKS", accounts: groups.liquidUs },
    { title: "CARDS · DEBT", accounts: groups.cardsDebt },
    { title: "ILLIQUID · ASSETS", accounts: groups.illiquid },
  ];

  const rfBanks = new Set(groups.liquidRf.map((a) => a.name.split(/[\s—-]/)[0])).size;
  const payMonth = monthLabel(upcoming);
  const paySummary =
    upcoming.length > 0
      ? `${upcoming.length} due · next ${upcoming[0] ? new Date(`${upcoming[0].date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}`
      : "none due";

  return (
    <div className="lf-overview-desktop">
      <header className="lf-bento-top">
        <div className="lf-bento-wordmark">LOGIC FINANCE</div>
        <nav className="lf-bento-nav" aria-label="Main">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`lf-bento-nav__link${active ? " lf-bento-nav__link--on" : ""}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="lf-bento-top__spacer" />
        <div className="lf-bento-ccy lf-bento-pressable" role="group" aria-label="Base currency">
          <button
            type="button"
            className={baseCurrency === "RUB" ? "lf-bento-ccy__btn lf-bento-ccy__btn--on" : "lf-bento-ccy__btn"}
            onClick={() => setBaseCurrency("RUB")}
          >
            ₽
          </button>
          <button
            type="button"
            className={baseCurrency === "USD" ? "lf-bento-ccy__btn lf-bento-ccy__btn--on" : "lf-bento-ccy__btn"}
            onClick={() => setBaseCurrency("USD")}
          >
            $
          </button>
        </div>
        <div className="lf-bento-fx lf-mono">
          SPOT {spot.toFixed(2)}
          <br />
          EFF {eff.toFixed(2)} ₽/$
        </div>
        <button type="button" className="lf-bento-add lf-bento-pressable lf-mono" onClick={() => openView("operation")}>
          + Add operation
        </button>
      </header>

      <main className="lf-bento-grid">
        <Tile label="NET WORTH" hero>
          <div className="lf-bento-hero__big lf-mono">{netPair.primary}</div>
          <div className="lf-bento-hero__alt lf-mono">{netPair.secondary}</div>
          <div className="lf-bento-hero__row">
            <div>
              <div className="lf-bento-lab">LIQUID</div>
              <div className="lf-bento-hero__num lf-mono">{liquidPair.primary}</div>
            </div>
            <div>
              <div className="lf-bento-lab">DEBT</div>
              <div className="lf-bento-hero__num lf-mono lf-text-danger">{debtPair.primary}</div>
            </div>
            <div>
              <div className="lf-bento-lab">ACCOUNTS</div>
              <div className="lf-bento-hero__num lf-mono">{accountCount}</div>
            </div>
          </div>
          <div className="lf-bento-compose">
            <div className="lf-bento-lab" style={{ marginBottom: 8 }}>
              COMPOSITION
            </div>
            <div className="lf-bento-bar" aria-hidden>
              {composition.map((seg) => (
                <i
                  key={seg.label}
                  style={{
                    background: seg.color,
                    width: `${compositionTotal > 0 ? (seg.valueUsd / compositionTotal) * 100 : 0}%`,
                  }}
                />
              ))}
            </div>
            <div className="lf-bento-legend">
              {composition.map((seg) => (
                <span key={seg.label}>
                  <b style={{ background: seg.color }} />
                  {seg.label}
                </span>
              ))}
            </div>
            <div className="lf-bento-sub" style={{ marginTop: 10 }}>
              assets {pairMoney(assets, spot, baseCurrency).primary}
            </div>
          </div>
        </Tile>

        <Tile label="LIQUID · RF">
          <div className="lf-bento-val lf-mono">{rfPrimary}</div>
          <div className="lf-bento-foot lf-bento-sub">
            {groups.liquidRf.length} accounts · {rfBanks} banks
          </div>
        </Tile>

        <Tile label="LIQUID · US">
          <div className="lf-bento-val lf-mono">{usPrimary}</div>
          <div className="lf-bento-foot lf-bento-sub">{groups.liquidUs.length} accounts</div>
        </Tile>

        <Tile label="FX EXPOSURE">
          <div className="lf-bento-val lf-mono">{fxExposureLabel(exposure.income.rubPct, exposure.outflow.usdPct)}</div>
          <div className="lf-bento-foot">
            <div className="lf-bento-mini">
              <span className="lf-bento-sub">income</span>
              <span className="lf-mono" style={{ fontSize: 13 }}>
                ~{Math.round(exposure.income.rubPct)}% ₽
              </span>
            </div>
            <div className="lf-bento-mini">
              <span className="lf-bento-sub">outflow</span>
              <span className="lf-mono" style={{ fontSize: 13 }}>
                ~{Math.round(exposure.outflow.usdPct)}% $
              </span>
            </div>
            <div className="lf-bento-mini">
              <span className="lf-bento-sub">+1 ₽/$ →</span>
              <span className="lf-mono" style={{ fontSize: 13 }}>
                ≈ {sensitivity.usdLoadRubDelta >= 0 ? "+" : "−"}
                {rub(Math.abs(sensitivity.usdLoadRubDelta))}/mo
              </span>
            </div>
          </div>
        </Tile>

        {showTveFloat && (
          <Tile label="TVE FLOAT">
            <div className={`lf-bento-val lf-mono${tveFloat < 0 ? " lf-text-danger" : ""}`}>
              {tveFloat < 0 ? "−" : ""}
              {rub(Math.abs(tveFloat))}
            </div>
            <div className="lf-bento-foot lf-bento-sub">
              {tveFloatHint(tveFloat)} · reimbursable
            </div>
          </Tile>
        )}

        {upcoming.length > 0 && (
          <Tile
            label={`UPCOMING PAYMENTS · ${payMonth}`}
            wide
            headExtra={<span className="lf-bento-sub">{paySummary}</span>}
          >
            <div className="lf-bento-pays">
              {upcoming.map((event) => (
                <PaymentCard
                  key={event.id}
                  event={event}
                  zoneShort={shortByCurrency[event.currency]}
                  href={paymentHref(event, accountByObligation)}
                />
              ))}
            </div>
          </Tile>
        )}

        <Tile label="ACCOUNTS & ASSETS" wide headExtra={<span className="lf-bento-sub">balances as of latest statement</span>}>
          <AccountsTable
            groups={tableGroups}
            spot={spot}
            baseCurrency={baseCurrency}
            liquidRubBasis={liquidRubBasis}
          />
        </Tile>
      </main>
    </div>
  );
}
