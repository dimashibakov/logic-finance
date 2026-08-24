"use client";

import { useState } from "react";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";
import { fmtRate, rub, usd } from "@/lib/format";

type Props = {
  cbrRate: number;
  effectiveRate: number;
};

export default function ConvertForm({ cbrRate, effectiveRate }: Props) {
  const [amountRub, setAmountRub] = useState("160000");

  const rubAmount = parseFloat(amountRub.replace(/\s/g, "").replace(",", ".")) || 0;
  const received = rubAmount / effectiveRate;
  const atCbr = rubAmount / cbrRate;
  const costPct = atCbr > 0 ? ((atCbr - received) / atCbr) * 100 : 0;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div style={S.card}>
          <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>You send</div>
          <div style={{ ...S.mono, fontSize: 20, fontWeight: 600, color: C.ink, marginTop: 3 }}>{rub(rubAmount)}</div>
        </div>
        <div style={S.card}>
          <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>You get</div>
          <div style={{ ...S.mono, fontSize: 20, fontWeight: 600, color: C.up, marginTop: 3 }}>{usd(received)}</div>
        </div>
      </div>

      <div style={{ ...S.label, marginBottom: 8 }}>AMOUNT IN ₽</div>
      <div style={{ ...S.card, marginBottom: 16 }}>
        <input
          type="text"
          inputMode="decimal"
          value={amountRub}
          onChange={(e) => setAmountRub(e.target.value)}
          style={{
            ...S.mono,
            width: "100%",
            fontSize: 28,
            fontWeight: 600,
            color: C.ink,
            border: "none",
            outline: "none",
            background: "transparent",
          }}
        />
      </div>

      <div style={{ ...S.label, marginBottom: 8 }}>BREAKDOWN</div>
      <div style={{ ...S.card, padding: 0 }}>
        {[
          { label: "CBR rate", value: fmtRate(cbrRate), sub: `${usd(atCbr)} at CBR` },
          { label: "Effective rate", value: fmtRate(effectiveRate), sub: `${usd(received)} received` },
          { label: "Cost %", value: costPct.toFixed(1) + "%", sub: "vs CBR benchmark", isCost: true },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 14px",
              borderBottom: i < arr.length - 1 ? `1px solid ${C.line}` : "none",
            }}
          >
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: C.ink }}>{row.label}</div>
              <div style={{ ...S.mono, fontSize: 11, color: C.faint }}>{row.sub}</div>
            </div>
            <div style={{ ...S.mono, fontSize: 14, fontWeight: 600, color: row.isCost ? C.down : C.ink }}>{row.value}</div>
          </div>
        ))}
      </div>
    </>
  );
}
