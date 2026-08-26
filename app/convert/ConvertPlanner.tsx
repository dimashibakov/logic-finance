"use client";

import { useMemo, useState } from "react";
import { useAddSheet } from "@/app/components/AppChrome";
import { fmtRate, rub, usd } from "@/lib/format";
import type { FxTimingStats } from "@/lib/fx-timing";
import type { ExposureAccount, ExposureObligation, ExposureSnapshot } from "@/lib/exposure";
import FxTimingBlock from "./FxTimingBlock";
import FxExposureBlock from "./FxExposureBlock";

type Props = {
  timing: FxTimingStats;
  spot: number;
  eff: number;
  usdNeeds30d: number;
  usdCash: number;
  shortfall: number;
  rubRecommendation: number;
  costOverSpot: number;
  exposure: ExposureSnapshot;
  exposureAccounts: ExposureAccount[];
  exposureObligations: ExposureObligation[];
};

export default function ConvertPlanner({
  timing,
  spot,
  eff,
  usdNeeds30d,
  usdCash,
  shortfall,
  rubRecommendation,
  costOverSpot,
  exposure,
  exposureAccounts,
  exposureObligations,
}: Props) {
  const { openView } = useAddSheet();
  const premiumPct = spot > 0 ? (((eff - spot) / spot) * 100).toFixed(1) : "0";
  const minUsd = Math.max(50, Math.round(shortfall * 0.25) || 50);
  const maxUsd = Math.max(minUsd, Math.round(shortfall * 2) || 2000);
  const [usdAmount, setUsdAmount] = useState(shortfall > 0 ? shortfall : minUsd);

  const rubAmount = useMemo(() => Math.round(usdAmount * eff), [usdAmount, eff]);
  const costRub = useMemo(() => Math.round(usdAmount * (eff - spot)), [usdAmount, eff, spot]);

  return (
    <>
      <FxTimingBlock stats={timing} />
      <FxExposureBlock exposure={exposure} accounts={exposureAccounts} obligations={exposureObligations} />

      <div className="lf-sec-label">
        <span className="lf-sec-label__h">RUB → USD conversion</span>
      </div>
      <div className="lf-card lf-card--pad lf-card--shadow">
        <div className="lf-eyebrow">Effective rate</div>
        <div className="lf-big-figure lf-mono" style={{ marginTop: 6 }}>
          {fmtRate(eff)} <span className="lf-text-faint" style={{ fontSize: 14 }}>₽/$</span>
        </div>
        <div className="lf-hint" style={{ marginTop: 4 }}>
          spot {fmtRate(spot)} + rule 1.5% + 3₽ · premium ≈ {premiumPct}%
        </div>
      </div>

      <div className="lf-sec-label">
        <span className="lf-sec-label__h">Planner · 30 days</span>
      </div>
      <div className="lf-card lf-card--flush">
        <div className="lf-row">
          <div>
            <div style={{ fontSize: 13.5 }}>USD needs</div>
            <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, marginTop: 2 }}>
              rent share + cards + bills
            </div>
          </div>
          <div className="lf-mono" style={{ fontSize: 14, fontWeight: 600 }}>
            {usd(usdNeeds30d)}
          </div>
        </div>
        <div className="lf-row">
          <div>
            <div style={{ fontSize: 13.5 }}>USD cash</div>
            <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, marginTop: 2 }}>
              checking + crypto
            </div>
          </div>
          <div className="lf-mono" style={{ fontSize: 14, fontWeight: 600 }}>
            {usd(usdCash)}
          </div>
        </div>
        <div className="lf-row">
          <div className="lf-text-danger" style={{ fontSize: 13.5 }}>
            Shortfall
          </div>
          <div className="lf-mono lf-text-danger" style={{ fontSize: 14, fontWeight: 600 }}>
            {usd(shortfall)}
          </div>
        </div>
      </div>

      {shortfall > 0 && (
        <div className="lf-callout">
          <div className="lf-eyebrow">Convert this month</div>
          <div className="lf-mono" style={{ fontSize: 19, fontWeight: 600, margin: "10px 0 6px" }}>
            {rub(rubAmount)} → {usd(usdAmount)}
          </div>
          <div className="lf-hint">cost over spot ≈ {rub(costRub)}</div>
          <input
            type="range"
            className="lf-range"
            min={minUsd}
            max={maxUsd}
            value={usdAmount}
            onChange={(e) => setUsdAmount(Number(e.target.value))}
          />
          <div className="lf-note">drag to size the tranche</div>
          <button
            type="button"
            className="lf-btn"
            onClick={() =>
              openView("operation", {
                type: "conversion",
                amount: rubAmount,
                currency: "RUB",
                notes: "FX conversion plan",
              })
            }
          >
            Record conversion
          </button>
        </div>
      )}

      {shortfall <= 0 && rubRecommendation > 0 && (
        <div className="lf-callout">
          <div className="lf-hint">USD cash covers 30-day needs. No conversion required.</div>
        </div>
      )}
    </>
  );
}
