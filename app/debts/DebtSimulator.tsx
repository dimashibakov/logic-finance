"use client";

import { useState } from "react";
import { usd } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

type Props = { topApr: number; topName: string };

export default function DebtSimulator({ topApr, topName }: Props) {
  const [extra, setExtra] = useState("10000");
  const amount = Number(extra) || 0;
  const savingsYear = (amount * topApr) / 100;

  return (
    <div style={{ ...S.card, marginTop: 12 }}>
      <div style={{ ...S.label, marginBottom: 8 }}>Prepayment simulator</div>
      <div style={{ fontSize: 12, color: C.faint, marginBottom: 8 }}>
        Extra payment to highest APR ({topName})
      </div>
      <input
        value={extra}
        onChange={(e) => setExtra(e.target.value)}
        style={{ ...S.mono, width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, marginBottom: 8 }}
      />
      <div style={{ ...S.mono, fontSize: 13, color: C.up }}>
        Est. interest saved / year: {usd(savingsYear)}
      </div>
      <div style={{ fontSize: 12, color: C.faint, marginTop: 8, lineHeight: 1.45 }}>
        Sep–Oct window: RF surplus ~₽96k/mo — route extras to target #1 first (avalanche).
      </div>
    </div>
  );
}
