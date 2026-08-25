"use client";

import { useAddSheet } from "@/app/components/AppChrome";
import { fmtRate, rub, usd } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

type Props = {
  spot: number;
  eff: number;
  usdNeeds30d: number;
  usdCash: number;
  shortfall: number;
  rubRecommendation: number;
  costOverSpot: number;
};

export default function ConvertPlanner({ spot, eff, usdNeeds30d, usdCash, shortfall, rubRecommendation, costOverSpot }: Props) {
  const { openView } = useAddSheet();
  const premiumPct = spot > 0 ? (((eff - spot) / spot) * 100).toFixed(1) : "0";

  return (
    <>
      <div style={S.secLabel}>
        <span style={S.eyebrow}>RUB → USD conversion</span>
      </div>
      <div style={{ ...S.cardPad, marginBottom: 0 }}>
        <div style={S.eyebrow}>Effective rate</div>
        <div style={{ ...S.mono, fontSize: 30, fontWeight: 600, letterSpacing: "-0.01em", marginTop: 6 }}>
          {fmtRate(eff)} <span style={{ fontSize: 14, color: C.faint }}>₽/$</span>
        </div>
        <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5, marginTop: 4 }}>
          spot {fmtRate(spot)} + rule 1.5% + 3₽ · premium ≈ {premiumPct}%
        </div>
      </div>

      <div style={{ ...S.secLabel, marginTop: 18 }}>
        <span style={S.eyebrow}>Planner · 30 days</span>
      </div>
      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <div style={S.row}>
          <div>
            <div style={{ fontSize: 13.5, color: C.ink }}>USD needs</div>
            <div style={{ ...S.mono, fontSize: 10.5, color: C.faint, marginTop: 2 }}>rent share + cards + bills</div>
          </div>
          <div style={{ ...S.mono, fontSize: 14, fontWeight: 600 }}>{usd(usdNeeds30d)}</div>
        </div>
        <div style={S.row}>
          <div>
            <div style={{ fontSize: 13.5, color: C.ink }}>USD cash</div>
            <div style={{ ...S.mono, fontSize: 10.5, color: C.faint, marginTop: 2 }}>checking + crypto</div>
          </div>
          <div style={{ ...S.mono, fontSize: 14, fontWeight: 600 }}>{usd(usdCash)}</div>
        </div>
        <div style={{ ...S.row, borderBottom: "none" }}>
          <div style={{ fontSize: 13.5, color: C.debt }}>Shortfall</div>
          <div style={{ ...S.mono, fontSize: 14, fontWeight: 600, color: C.debt }}>{usd(shortfall)}</div>
        </div>
      </div>

      {shortfall > 0 && (
        <div style={{ ...S.cardPad, marginTop: 10 }}>
          <div style={S.eyebrow}>Recommendation</div>
          <div style={{ ...S.mono, fontSize: 19, fontWeight: 600, margin: "8px 0 2px" }}>
            {rub(rubRecommendation)} → {usd(shortfall)}
          </div>
          <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5 }}>
            at {fmtRate(eff)} · cost over spot ≈ <b>{rub(Math.round(costOverSpot * spot))}</b>. Record as conversion after transfer.
          </div>
          <button
            type="button"
            onClick={() => openView("operation", { type: "conversion", amount: rubRecommendation, currency: "RUB", notes: "FX conversion plan" })}
            style={S.btn}
          >
            Record conversion
          </button>
        </div>
      )}
    </>
  );
}
