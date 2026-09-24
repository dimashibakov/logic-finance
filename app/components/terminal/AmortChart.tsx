"use client";

function AmortChart({ series, currency }: { series: number[]; currency: string }) {
  const W = 280;
  const H = 72;
  const pad = 4;
  const max = Math.max(...series, 1);
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (series.length - 1);
  const y = (v: number) => H - pad - (v / max) * (H - 2 * pad);
  const line = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" L");
  const d = `M${line}`;

  return (
    <div className="t-amort">
      <div className="t-lbl">Amortization (illustrative)</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} aria-hidden>
        <path d={d} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="t-amort__foot num">
        {currency} · {series.length} mo · paydown to {Math.round(series[series.length - 1] ?? 0).toLocaleString("en-US")}
      </div>
    </div>
  );
}

export default AmortChart;
