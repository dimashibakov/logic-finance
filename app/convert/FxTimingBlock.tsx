import { fmtRate } from "@/lib/format";
import type { FxTimingStats } from "@/lib/fx-timing";

function Sparkline({ series }: { series: FxTimingStats["series"] }) {
  if (series.length < 2) return null;
  const w = 300;
  const h = 44;
  const min = Math.min(...series.map((s) => s.value));
  const max = Math.max(...series.map((s) => s.value));
  const range = max - min || 1;
  const points = series
    .map((s, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((s.value - min) / range) * (h - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="lf-sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
}

type Props = { stats: FxTimingStats };

export default function FxTimingBlock({ stats }: Props) {
  const verdictClass =
    stats.verdict === "favorable"
      ? "lf-verdict lf-verdict--favorable"
      : stats.verdict === "hold"
        ? "lf-verdict lf-verdict--hold"
        : "lf-verdict lf-verdict--neutral";

  return (
    <>
      <div className="lf-sec-label">
        <span className="lf-sec-label__h">When to convert · market</span>
      </div>
      <div className="lf-card lf-card--pad lf-card--shadow">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div className="lf-eyebrow">Spot · CBR</div>
            <div className="lf-big-figure lf-mono" style={{ marginTop: 6, fontSize: 28 }}>
              {fmtRate(stats.current)} <span className="lf-text-faint" style={{ fontSize: 14 }}>₽/$</span>
            </div>
            <div className="lf-hint" style={{ marginTop: 4 }}>
              eff {fmtRate(stats.eff)} ₽/$ · spot×1.015+3
            </div>
          </div>
          <span className={verdictClass}>{stats.verdictTitle}</span>
        </div>

        <div className="lf-sparkline-wrap">
          <Sparkline series={stats.series} />
        </div>

        <div className="lf-grid-2" style={{ marginTop: 14, gap: 10 }}>
          <div>
            <div className="lf-eyebrow">Avg 30d</div>
            <div className="lf-mono" style={{ fontSize: 14, fontWeight: 700 }}>
              {fmtRate(stats.avg30)}
            </div>
          </div>
          <div>
            <div className="lf-eyebrow">Avg 90d</div>
            <div className="lf-mono" style={{ fontSize: 14, fontWeight: 700 }}>
              {fmtRate(stats.avg90)}
            </div>
          </div>
          <div>
            <div className="lf-eyebrow">Min 90d</div>
            <div className="lf-mono" style={{ fontSize: 14, fontWeight: 700 }}>
              {fmtRate(stats.min90)}
            </div>
          </div>
          <div>
            <div className="lf-eyebrow">Max 90d</div>
            <div className="lf-mono" style={{ fontSize: 14, fontWeight: 700 }}>
              {fmtRate(stats.max90)}
            </div>
          </div>
        </div>

        <div className="lf-note" style={{ marginTop: 12 }}>
          {stats.positionNote}
        </div>
        <div className="lf-hint" style={{ marginTop: 8, fontSize: 10 }}>
          market context, not investment advice
        </div>
      </div>
    </>
  );
}
