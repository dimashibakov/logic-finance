"use client";

import { useState } from "react";
import { rub, usd } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

type Props = { topApr: number; topName: string; currency?: string };

export default function DebtSimulator({ topApr, topName, currency = "RUB" }: Props) {
  const [extra, setExtra] = useState("100000");
  const amount = Number(extra) || 0;
  const savingsYear = (amount * topApr) / 100;
  const fmt = currency === "USD" ? usd : rub;

  return (
    <div>
      <div style={S.eyebrow}>Prepayment simulator</div>
      <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5, marginTop: 8 }}>
        Extra <b>{fmt(amount)}</b> to {topName} ({topApr.toFixed(1)}%) → saves ≈ <b>{fmt(savingsYear)}/yr</b> interest.
      </div>
      <input
        value={extra}
        onChange={(e) => setExtra(e.target.value)}
        style={{ ...S.mono, width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${C.line}`, marginTop: 10, fontSize: 15, background: "#fbfcfd" }}
      />
      <button type="button" style={S.btnGhost}>
        Model payment
      </button>
    </div>
  );
}
