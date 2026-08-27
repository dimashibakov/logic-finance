"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { rub } from "@/lib/format";
import {
  depositScenarios,
  fmtDueShort,
  idleRubAboveBuffer,
  type RubBalanceProjection,
} from "@/lib/liquidity-planner";
import { LIQUIDITY_CONFIG } from "@/lib/liquidity-config";
import type { ObligationRow } from "@/lib/payments";

type Props = {
  projection: RubBalanceProjection;
  obligations: ObligationRow[];
};

function BalanceSparkline({ projection }: { projection: RubBalanceProjection }) {
  const series = projection.days;
  if (series.length < 2) return null;

  const w = 300;
  const h = 52;
  const values = series.map((s) => s.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = series
    .map((s, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((s.balance - min) / range) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  const minIdx = series.findIndex((s) => s.date === projection.minDate);
  const stressIdx = series.findIndex((s) => s.date === projection.stressDate);
  const dot = (idx: number) => {
    if (idx < 0) return null;
    const x = (idx / (series.length - 1)) * w;
    const y = h - ((series[idx]!.balance - min) / range) * (h - 8) - 4;
    return { x, y };
  };
  const minDot = dot(minIdx);
  const stressDot = dot(stressIdx);

  return (
    <svg className="lf-sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
      {minDot && <circle cx={minDot.x} cy={minDot.y} r="3.5" fill="var(--accent)" />}
      {stressDot && stressDot.x !== minDot?.x && (
        <circle cx={stressDot.x} cy={stressDot.y} r="3.5" fill="var(--danger)" />
      )}
    </svg>
  );
}

export default function CashPlannerClient({ projection, obligations }: Props) {
  const [ratePct, setRatePct] = useState("");
  const rate = Number(ratePct) || 0;
  const idle = idleRubAboveBuffer(projection);
  const scenarios = useMemo(
    () => depositScenarios(projection, obligations, rate),
    [projection, obligations, rate]
  );

  return (
    <>
      <div className="lf-card lf-card--pad lf-card--shadow">
        <div className="lf-eyebrow">RUB balance forecast · 90 days</div>
        <div className="lf-sparkline-wrap">
          <BalanceSparkline projection={projection} />
        </div>
        <div className="lf-mono lf-hint" style={{ fontSize: 10.5, marginTop: 8, lineHeight: 1.45 }}>
          min {rub(Math.round(projection.minBalance))} · {fmtDueShort(projection.minDate)}
          {" · "}
          stress {rub(Math.round(projection.stressBalance))} · {fmtDueShort(projection.stressDate)}
        </div>
      </div>

      <div className="lf-card lf-card--flush" style={{ marginTop: 10 }}>
        <div className="lf-row">
          <div>
            <div style={{ fontSize: 13.5 }}>Idle now</div>
            <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, marginTop: 2 }}>
              RUB liquid − {rub(LIQUIDITY_CONFIG.SAFETY_BUFFER_RUB)} buffer
            </div>
          </div>
          <div className="lf-mono" style={{ fontSize: 14, fontWeight: 600 }}>
            {rub(idle)}
          </div>
        </div>
      </div>

      <div className="lf-sec-label">
        <span className="lf-sec-label__h">Deposit scenarios</span>
      </div>

      <div className="lf-card lf-card--pad">
        <label className="lf-eyebrow" htmlFor="deposit-rate">
          Deposit rate, % APR
        </label>
        <input
          id="deposit-rate"
          className="lf-input lf-mono"
          type="number"
          min={0}
          step={0.1}
          placeholder="0"
          value={ratePct}
          onChange={(e) => setRatePct(e.target.value)}
          style={{ marginTop: 8, width: "100%" }}
        />
        <div className="lf-hint" style={{ marginTop: 6, fontSize: 10 }}>
          confirm the rate with your bank; calculation is illustrative
        </div>
      </div>

      <div className="lf-card lf-card--flush">
        {scenarios.map((s) => (
          <div key={s.termDays} className={`lf-row${s.overlapsMajorOutflow ? " lf-wd-row--risk" : ""}`}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 550 }}>
                {s.termDays} days
                {s.overlapsMajorOutflow && <span className="lf-hot">risk</span>}
              </div>
              <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, marginTop: 3, lineHeight: 1.4 }}>
                matures {fmtDueShort(s.maturityDate)}
                {s.illustrativeIncome != null && <> · +{rub(s.illustrativeIncome)} est.</>}
                {s.riskNote && (
                  <>
                    <br />
                    {s.riskNote}
                  </>
                )}
              </div>
            </div>
            <div className="lf-mono" style={{ fontSize: 14, fontWeight: 600, textAlign: "right" }}>
              {rub(s.safeAmount)}
              <span className="lf-text-faint" style={{ display: "block", fontSize: 10, fontWeight: 500, marginTop: 2 }}>
                safe lock
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="lf-hint" style={{ marginTop: 14, fontSize: 10 }}>
        liquidity planning, not investment advice; rates and terms — check with your bank
      </div>

      <div className="lf-sec-label" style={{ marginTop: 16 }}>
        <Link href="/" className="lf-sec-label__m">
          ← overview
        </Link>
      </div>
    </>
  );
}
