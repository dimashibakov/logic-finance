"use client";

import DesktopTopBar from "./DesktopTopBar";
import Tile from "../bento/Tile";
import MonogramBadge from "../bento/MonogramBadge";
import { fmtNative, rub } from "@/lib/format";
import {
  computeDebtSummary,
  displayDebtName,
  fmtDueLabel,
  type DebtObligation,
} from "@/lib/debts-summary";

type Props = {
  spot: number;
  eff: number;
  obligations: DebtObligation[];
};

function AprCell({ apr }: { apr: number | null }) {
  if (apr == null) return <span className="lf-bento-sub">—</span>;
  const hi = Number(apr) >= 25;
  return <span className={hi ? "lf-text-danger" : undefined}>{Number(apr).toFixed(1)}%</span>;
}

export default function DebtsDesktop({ spot, eff, obligations }: Props) {
  const { sorted, target, totalRub, weightedApr, nextDue } = computeDebtSummary(obligations, spot);

  return (
    <div className="lf-page-desktop">
      <DesktopTopBar spot={spot} eff={eff} />
      <div className="lf-desktop-page">
        <div className="lf-desktop-pagehead">
          <h1>Debts</h1>
          <span className="lf-bento-sub">avalanche order · highest APR first</span>
        </div>

        <div className="lf-bento-grid lf-desktop-debt-tiles">
          <Tile label="TOTAL DEBT">
            <div className="lf-bento-val lf-mono lf-text-danger">{rub(Math.round(totalRub))}</div>
          </Tile>
          <Tile label="WEIGHTED APR">
            <div className="lf-bento-val lf-mono">{weightedApr.toFixed(1)}%</div>
          </Tile>
          <Tile label="NEXT DUE">
            <div className="lf-bento-val lf-mono" style={{ fontSize: 22 }}>
              {nextDue ? `${fmtDueLabel(nextDue.date)} · ${fmtNative(nextDue.amount, nextDue.currency)}` : "—"}
            </div>
          </Tile>
          <Tile label="AVALANCHE TARGET" className="lf-desktop-tile-accent">
            {target ? (
              <>
                <div className="lf-bento-val lf-mono" style={{ fontSize: 17 }}>
                  {displayDebtName(target.name)}
                </div>
                <div className="lf-bento-foot lf-bento-sub">
                  {target.apr != null ? `APR ${Number(target.apr).toFixed(2)}%` : target.kind}
                </div>
              </>
            ) : (
              <div className="lf-bento-val lf-mono" style={{ fontSize: 17 }}>
                —
              </div>
            )}
          </Tile>
        </div>

        <div className="lf-desktop-panel lf-desktop-panel--flush">
          <table className="lf-bento-table">
            <thead>
              <tr>
                <th>CREDITOR</th>
                <th className="lf-bento-r">APR</th>
                <th className="lf-bento-r">BALANCE</th>
                <th className="lf-bento-r">PAYMENT</th>
                <th>DUE</th>
                <th className="lf-bento-r">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((o) => {
                const hasDebt = Number(o.balance) !== 0;
                const isTarget = target?.id === o.id && hasDebt;
                return (
                  <tr key={o.id}>
                    <td>
                      <div className="lf-bento-acct">
                        <MonogramBadge account={{ name: o.name, type: o.kind, currency: o.currency }} />
                        <span className="lf-bento-acct__name">{displayDebtName(o.name)}</span>
                      </div>
                    </td>
                    <td className="lf-bento-num">
                      <AprCell apr={o.apr} />
                    </td>
                    <td className={`lf-bento-num${hasDebt ? " lf-text-danger" : ""}`}>{fmtNative(Number(o.balance), o.currency)}</td>
                    <td className="lf-bento-num lf-bento-num--alt">
                      {o.monthly_payment ? fmtNative(Number(o.monthly_payment), o.currency) : "—"}
                    </td>
                    <td className="lf-bento-sub">{o.due_date ?? "—"}</td>
                    <td className="lf-bento-num lf-bento-num--pct">
                      {isTarget ? "target" : hasDebt ? "active" : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="lf-bento-sub" style={{ marginTop: 10 }}>
          Payments tracked in obligations, not expense categories.
        </p>
      </div>
    </div>
  );
}
