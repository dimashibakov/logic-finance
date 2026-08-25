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
      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ ...S.label, marginBottom: 6 }}>Effective rate rule</div>
        <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
          spot × 1.015 + 3 ₽ ≈ +{premiumPct}% vs spot
        </div>
        <div style={{ ...S.mono, fontSize: 11, color: C.faint, marginTop: 8 }}>
          SPOT {fmtRate(spot)} · EFF {fmtRate(eff)} ₽/$
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div style={S.card}>
          <div style={{ ...S.label, marginBottom: 4 }}>USD need 30d</div>
          <div style={{ ...S.mono, fontSize: 18, fontWeight: 600 }}>{usd(usdNeeds30d)}</div>
        </div>
        <div style={S.card}>
          <div style={{ ...S.label, marginBottom: 4 }}>USD cash</div>
          <div style={{ ...S.mono, fontSize: 18, fontWeight: 600 }}>{usd(usdCash)}</div>
        </div>
      </div>

      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ ...S.label, marginBottom: 6 }}>Shortfall</div>
        <div style={{ ...S.mono, fontSize: 24, fontWeight: 600, color: shortfall > 0 ? C.debt : C.up }}>{usd(shortfall)}</div>
        {shortfall > 0 && (
          <div style={{ ...S.mono, fontSize: 12, color: C.faint, marginTop: 8, lineHeight: 1.5 }}>
            Recommend {rub(rubRecommendation)} at EFF · cost over spot {usd(costOverSpot)}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => openView("operation", { type: "conversion", amount: rubRecommendation, currency: "RUB", notes: "FX conversion plan" })}
        style={{ width: "100%", minHeight: 52, borderRadius: 12, border: "none", background: C.accent, color: "#fff", fontWeight: 600, cursor: "pointer" }}
      >
        Record conversion
      </button>
    </>
  );
}
