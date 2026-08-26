"use client";

import { useMemo, useState } from "react";
import { rub, usd } from "@/lib/format";
import {
  computeSensitivity,
  type ExposureAccount,
  type ExposureObligation,
  type ExposureSnapshot,
} from "@/lib/exposure";

type Props = {
  exposure: ExposureSnapshot;
  accounts: ExposureAccount[];
  obligations: ExposureObligation[];
};

function SplitBar({ rubPct, usdPct, labelRub = "RUB", labelUsd = "USD" }: { rubPct: number; usdPct: number; labelRub?: string; labelUsd?: string }) {
  return (
    <>
      <div className="lf-exposure-bar" aria-hidden>
        <div className="lf-exposure-bar__rub" style={{ width: `${rubPct}%` }} />
        <div className="lf-exposure-bar__usd" style={{ width: `${usdPct}%` }} />
      </div>
      <div className="lf-mono lf-hint" style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 10.5 }}>
        <span>
          {labelRub} {Math.round(rubPct)}%
        </span>
        <span>
          {labelUsd} {Math.round(usdPct)}%
        </span>
      </div>
    </>
  );
}

function ValueRow({
  label,
  rubUsd,
  usdUsd,
  rubPct,
  usdPct,
  splitLabel,
  splitLabelUsd,
}: {
  label: string;
  rubUsd: number;
  usdUsd: number;
  rubPct: number;
  usdPct: number;
  splitLabel: string;
  splitLabelUsd: string;
}) {
  return (
    <div className="lf-row">
      <div>
        <div style={{ fontSize: 13.5 }}>{label}</div>
        <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, marginTop: 2 }}>
          {splitLabel} {Math.round(rubPct)}% · {splitLabelUsd} {Math.round(usdPct)}%
        </div>
      </div>
      <div className="lf-mono" style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>
        {usd(rubUsd + usdUsd)}
        <span className="lf-text-faint" style={{ display: "block", fontSize: 10, fontWeight: 500, marginTop: 2 }}>
          {usd(rubUsd)} + {usd(usdUsd)}
        </span>
      </div>
    </div>
  );
}

export default function FxExposureBlock({ exposure, accounts, obligations }: Props) {
  const [rateShockPct, setRateShockPct] = useState(-0.1);
  const shockLabel = `${rateShockPct >= 0 ? "+" : ""}${Math.round(rateShockPct * 100)}%`;

  const sensitivity = useMemo(
    () => computeSensitivity(accounts, obligations, exposure.spot, rateShockPct),
    [accounts, obligations, exposure.spot, rateShockPct]
  );

  return (
    <>
      <div className="lf-sec-label">
        <span className="lf-sec-label__h">FX exposure</span>
        <span className="lf-verdict lf-verdict--hold" style={{ maxWidth: "none", fontSize: 8, padding: "5px 8px" }}>
          {exposure.verdict}
        </span>
      </div>

      <div className="lf-card lf-card--pad lf-card--shadow">
        <div className="lf-eyebrow">Income · monthly</div>
        <SplitBar rubPct={exposure.income.rubPct} usdPct={exposure.income.usdPct} />
        <div className="lf-mono" style={{ fontSize: 12, marginTop: 8 }}>
          {rub(exposure.income.rub)} / mo · USD {exposure.income.usd}
        </div>

        <div className="lf-eyebrow" style={{ marginTop: 18 }}>
          Monthly outflow
        </div>
        <SplitBar rubPct={exposure.outflow.rubPct} usdPct={exposure.outflow.usdPct} />
        <div className="lf-mono" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.45 }}>
          {rub(exposure.outflow.rubMonthly)} + {usd(exposure.outflow.usdMonthly)} (≈ {rub(exposure.outflow.usdInRubAtSpot)} at spot)
        </div>

        <div className="lf-sec-label" style={{ marginTop: 18, marginBottom: 0 }}>
          <span className="lf-sec-label__h" style={{ fontSize: 11 }}>
            Assets / debt
          </span>
        </div>
        <div className="lf-card lf-card--flush" style={{ marginTop: 8 }}>
          <ValueRow
            label="Assets"
            rubUsd={exposure.assets.rubUsd}
            usdUsd={exposure.assets.usdUsd}
            rubPct={exposure.assets.rubPct}
            usdPct={exposure.assets.usdPct}
            splitLabel="RUB-zone"
            splitLabelUsd="USD-zone"
          />
          <ValueRow
            label="Debt"
            rubUsd={exposure.debt.rubUsd}
            usdUsd={exposure.debt.usdUsd}
            rubPct={exposure.debt.rubPct}
            usdPct={exposure.debt.usdPct}
            splitLabel="RUB-debt"
            splitLabelUsd="USD-debt"
          />
        </div>

        <div className="lf-mono" style={{ fontSize: 12, marginTop: 14 }}>
          Conversion load ≈ {rub(exposure.conversionLoadRub)}/mo · {exposure.conversionSharePct.toFixed(1)}% of RUB income
        </div>
      </div>

      <div className="lf-callout">
        <div className="lf-eyebrow">Sensitivity · rate shock {shockLabel}</div>
        <div className="lf-mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 8, lineHeight: 1.45 }}>
          USD load {sensitivity.usdLoadRubDelta >= 0 ? "+" : "−"}
          {rub(Math.abs(sensitivity.usdLoadRubDelta))}/mo
          <span className="lf-text-faint" style={{ display: "block", fontSize: 11, fontWeight: 500, marginTop: 4 }}>
            → {rub(sensitivity.usdLoadRub)}/mo ({sensitivity.conversionSharePct.toFixed(1)}% of income) at {sensitivity.newSpot.toFixed(2)} ₽/$
          </span>
        </div>
        <div className="lf-mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>
          Net worth {sensitivity.netWorthDeltaUsd >= 0 ? "+" : "−"}
          {usd(Math.abs(Math.round(sensitivity.netWorthDeltaUsd)))}
          <span className={sensitivity.netWorthDeltaUsd >= 0 ? " lf-text-success" : " lf-text-danger"} style={{ fontSize: 11, marginLeft: 6 }}>
            ({sensitivity.netWorthDeltaPct >= 0 ? "+" : ""}
            {sensitivity.netWorthDeltaPct.toFixed(1)}%)
          </span>
        </div>
        <div className="lf-note" style={{ marginTop: 10 }}>
          {sensitivity.note}
        </div>
        <input
          type="range"
          className="lf-range"
          min={-20}
          max={20}
          value={Math.round(rateShockPct * 100)}
          onChange={(e) => setRateShockPct(Number(e.target.value) / 100)}
        />
        <div className="lf-hint" style={{ marginTop: 8, fontSize: 10 }}>
          оценка чувствительности, не рекомендация
        </div>
      </div>
    </>
  );
}
