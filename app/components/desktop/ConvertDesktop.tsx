"use client";

import { useMemo, useState } from "react";
import { useAddSheet } from "../AddSheetContext";
import DesktopPageBridge from "./DesktopPageBridge";
import { fmtRate, rub, usd } from "@/lib/format";
import type { FxTimingStats } from "@/lib/fx-timing";

const CONVERSION_ROUTE = "SBP → transfer → Coinbase USD";

type Props = {
  spot: number;
  eff: number;
  timing: FxTimingStats;
  rubRecommendation: number;
};

function SparkBars({ series }: { series: FxTimingStats["series"] }) {
  const bars = series.slice(-30);
  if (bars.length === 0) return null;
  const min = Math.min(...bars.map((b) => b.value));
  const max = Math.max(...bars.map((b) => b.value));
  const range = max - min || 1;
  return (
    <div className="lf-desktop-spark" aria-hidden>
      {bars.map((b) => (
        <i key={b.date} style={{ height: `${Math.max(8, ((b.value - min) / range) * 100)}%` }} />
      ))}
    </div>
  );
}

export default function ConvertDesktop({ spot, eff, timing, rubRecommendation }: Props) {
  const { openView } = useAddSheet();
  const defaultRub = rubRecommendation > 0 ? rubRecommendation : 85000;
  const [rubAmount, setRubAmount] = useState(defaultRub);

  const receivedUsd = useMemo(() => (eff > 0 ? rubAmount / eff : 0), [rubAmount, eff]);
  const premiumPct = spot > 0 ? (((eff - spot) / spot) * 100).toFixed(1) : "0";
  const vs90 = timing.avg90 > 0 ? (((timing.current - timing.avg90) / timing.avg90) * 100).toFixed(1) : "0";

  const verdictClass =
    timing.verdict === "favorable"
      ? "lf-desktop-verdict lf-desktop-verdict--fav"
      : timing.verdict === "hold"
        ? "lf-desktop-verdict lf-desktop-verdict--hold"
        : "lf-desktop-verdict";

  return (
    <div className="lf-page-desktop">
      <DesktopPageBridge title="Convert ₽ → $" spot={spot} eff={eff}>
      <div className="lf-desktop-page">
        <div className="lf-desktop-pagehead">
          <span className="lf-bento-sub">route: {CONVERSION_ROUTE}</span>
        </div>
        <div className="lf-desktop-two">
          <section className="lf-desktop-panel">
            <div className="lf-desktop-field">
              <label>Amount to convert (₽)</label>
              <input
                className="lf-desktop-input lf-desktop-input--big lf-mono"
                inputMode="numeric"
                value={rubAmount.toLocaleString("en-US")}
                onChange={(e) => {
                  const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                  setRubAmount(Number.isFinite(n) ? n : 0);
                }}
              />
            </div>
            <div className="lf-desktop-field">
              <label>You receive (≈ $, at effective rate)</label>
              <input className="lf-desktop-input lf-desktop-input--big lf-mono" readOnly value={usd(receivedUsd)} />
            </div>
            <div className="lf-desktop-field">
              <label>Route</label>
              <input className="lf-desktop-input lf-mono" readOnly value={CONVERSION_ROUTE} />
            </div>
            <div className="lf-desktop-meta lf-mono">
              <span>
                spot {fmtRate(spot)} · effective {fmtRate(eff)} (~{premiumPct}% cost)
              </span>
              <span>
                −{rub(rubAmount)} → +{usd(receivedUsd)}
              </span>
            </div>
            <button
              type="button"
              className="lf-desktop-btn lf-desktop-btn--green lf-bento-pressable lf-mono"
              onClick={() =>
                openView("operation", {
                  type: "conversion",
                  amount: rubAmount,
                  currency: "RUB",
                  notes: "Conversion RUB to USD",
                })
              }
            >
              CONFIRM CONVERSION
            </button>
            <p className="lf-bento-sub" style={{ marginTop: 10 }}>
              Recorded as transfer «Conversion RUB to USD» plus USD leg on Coinbase for matching.
            </p>
          </section>

          <section className="lf-desktop-panel">
            <div className="lf-bento-lab" style={{ marginBottom: 10 }}>
              MARKET TIMING
            </div>
            <div className={verdictClass}>{timing.verdict === "favorable" ? "FAVORABLE" : timing.verdict === "hold" ? "HOLD" : "NEUTRAL"}</div>
            <div className="lf-desktop-mini-list">
              <div className="lf-bento-mini">
                <span className="lf-bento-sub">spot now</span>
                <span className="lf-mono">{fmtRate(timing.current)}</span>
              </div>
              <div className="lf-bento-mini">
                <span className="lf-bento-sub">30-day avg</span>
                <span className="lf-mono">{fmtRate(timing.avg30)}</span>
              </div>
              <div className="lf-bento-mini">
                <span className="lf-bento-sub">90-day avg</span>
                <span className="lf-mono">{fmtRate(timing.avg90)}</span>
              </div>
              <div className="lf-bento-mini">
                <span className="lf-bento-sub">vs 90d</span>
                <span className={`lf-mono${Number(vs90) <= 0 ? " lf-text-success" : ""}`}>
                  {Number(vs90) >= 0 ? "+" : ""}
                  {vs90}% {Number(vs90) <= 0 ? "(cheaper $)" : ""}
                </span>
              </div>
            </div>
            <div className="lf-bento-lab" style={{ margin: "14px 0 6px" }}>
              SPOT · 30d
            </div>
            <SparkBars series={timing.series} />
            <p className="lf-bento-sub" style={{ marginTop: 10 }}>
              {timing.positionNote}
            </p>
          </section>
        </div>
      </div>
      </DesktopPageBridge>
    </div>
  );
}
