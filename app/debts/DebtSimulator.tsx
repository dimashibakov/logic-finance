"use client";

import { useMemo, useState } from "react";
import { rub, usd } from "@/lib/format";

type Props = { topApr: number; topName: string; currency?: string; maxExtra?: number };

export default function DebtSimulator({ topApr, topName, currency = "RUB", maxExtra = 475000 }: Props) {
  const [extra, setExtra] = useState(Math.min(100000, maxExtra));
  const amount = Number(extra) || 0;
  const savingsYear = (amount * topApr) / 100;
  const fmt = currency === "USD" ? usd : rub;

  const min = 10000;
  const max = Math.max(min, maxExtra);

  const label = useMemo(() => {
    if (topApr <= 0) return "Enter a prepayment amount";
    return (
      <>
        Extra <b>{fmt(amount)}</b> to {topName} ({topApr.toFixed(1)}%) → saves ≈ <b>{fmt(savingsYear)}/yr</b> interest.
      </>
    );
  }, [amount, fmt, savingsYear, topApr, topName]);

  return (
    <div>
      <div className="lf-eyebrow">Prepayment simulator</div>
      <div className="lf-hint" style={{ marginTop: 8 }}>
        {label}
      </div>
      <input
        type="range"
        className="lf-range"
        min={min}
        max={max}
        step={5000}
        value={amount}
        onChange={(e) => setExtra(Number(e.target.value))}
      />
      <div className="lf-mono" style={{ fontSize: 13, marginTop: 4 }}>
        {fmt(amount)}
      </div>
      <button type="button" className="lf-btn lf-btn--ghost">
        Model payment
      </button>
    </div>
  );
}
