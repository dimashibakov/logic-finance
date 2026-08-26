import Link from "next/link";
import { rub, usd } from "@/lib/format";
import { fmtDueShort, type TaxReserves } from "@/lib/taxes";

type Props = { reserves: TaxReserves };

export default function TaxReservesBlock({ reserves }: Props) {
  const { us, npd } = reserves;

  return (
    <>
        <div className="lf-sec-label">
          <span className="lf-sec-label__h">Tax reserves</span>
          <Link href="/winddown" className="lf-sec-label__m">
            5927 →
          </Link>
        </div>

      <div className="lf-card lf-card--pad lf-card--shadow">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div>
            <div className="lf-eyebrow">US 2026 · due {fmtDueShort(us.dueDate)}</div>
            <div className="lf-mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>
              {usd(us.shouldBeReserved)} <span className="lf-text-faint">/ {usd(us.target)}</span>
            </div>
          </div>
          {us.reserveCoverage && (
            <span className={`lf-pay-cov lf-pay-cov--${us.reserveCoverage === "covered" ? "ok" : "short"}`}>
              {us.reserveCoverage}
            </span>
          )}
        </div>

        <div className="lf-progress" style={{ marginTop: 12 }}>
          <div className="lf-progress__fill" style={{ width: `${Math.round(us.progressPct)}%` }} />
        </div>

        <div className="lf-mono lf-hint" style={{ fontSize: 11, marginTop: 10, lineHeight: 1.45 }}>
          set aside {usd(Math.round(us.monthlySetAside))}/mo · {us.monthsLeft} mo left · {usd(us.remaining)} to target
        </div>
        {us.actualReserved != null && (
          <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, marginTop: 6 }}>
            HYSA {usd(us.actualReserved)} · {us.status === "behind" ? "behind accrual" : "on track"}
          </div>
        )}

        <div className="lf-row" style={{ marginTop: 16, paddingTop: 14, borderTop: "2px solid var(--ink)" }}>
          <div>
            <div style={{ fontSize: 13.5 }}>НПД · rental 4%</div>
            <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, marginTop: 2 }}>
              monthly · Мой налог
            </div>
          </div>
          <div className="lf-mono" style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>
            {rub(npd.monthly)}/mo
            <span className="lf-text-faint" style={{ display: "block", fontSize: 10, fontWeight: 500, marginTop: 2 }}>
              YTD {rub(npd.ytdAccrued)} · next 28 {npd.nextDueLabel}
            </span>
          </div>
        </div>

        <div className="lf-hint" style={{ marginTop: 14, fontSize: 10 }}>
          оценка резервов, не налоговая консультация; КИК/декларация — к консультанту
        </div>
      </div>
    </>
  );
}
