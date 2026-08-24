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
  const [amountRub, setAmountRub] = useState("100000");

  const rubAmount = parseFloat(amountRub.replace(/\s/g, "").replace(",", ".")) || 0;
  const usdAtCbr = rubAmount / cbrRate;
  const usdAtEffective = rubAmount / effectiveRate;
  const costUsd = usdAtCbr - usdAtEffective;
  const spreadPct = cbrRate > 0 ? ((effectiveRate - cbrRate) / cbrRate) * 100 : 0;

  return (
    <>
      <div style={{ ...S.label, marginBottom: 8 }}>СУММА В ₽</div>
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
        <div style={{ ...S.mono, fontSize: 11, color: C.sub, marginTop: 4 }}>≈ {usd(usdAtEffective)} по effective</div>
      </div>

      <div style={{ ...S.label, marginBottom: 8 }}>РАЗБИВКА КОНВЕРТАЦИИ</div>
      <div style={{ ...S.card, padding: 0 }}>
        {[
          { label: "Курс ЦБ", rate: cbrRate, result: usdAtCbr, note: `${fmtRate(cbrRate)} ₽/$` },
          { label: "Effective", rate: effectiveRate, result: usdAtEffective, note: `${fmtRate(effectiveRate)} ₽/$` },
          {
            label: "Издержки",
            rate: null,
            result: costUsd,
            note: `${spreadPct >= 0 ? "+" : ""}${spreadPct.toFixed(2)}% спред`,
            isCost: true,
          },
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
              <div style={{ ...S.mono, fontSize: 11, color: C.faint }}>{row.note}</div>
            </div>
            <div style={{ ...S.mono, fontSize: 14, fontWeight: 600, color: row.isCost ? (costUsd > 0 ? C.down : C.up) : C.ink }}>
              {row.isCost ? (costUsd >= 0 ? "−" : "+") + usd(Math.abs(row.result)) : usd(row.result)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...S.card, marginTop: 12, background: "#F0F4FF", borderColor: "#1652F022", display: "flex", gap: 10 }}>
        <span style={{ ...S.mono, color: C.blue, fontWeight: 600 }}>i</span>
        <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
          Конвертация {rub(rubAmount)} → {usd(usdAtEffective)}. Разница между официальным курсом ЦБ и effective — скрытые издержки обмена.
        </div>
      </div>
    </>
  );
}
