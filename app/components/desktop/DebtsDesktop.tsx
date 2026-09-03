"use client";

import DesktopPageBridge from "./DesktopPageBridge";
import Tile from "../bento/Tile";
import MonogramBadge from "../bento/MonogramBadge";
import DebtSimulator from "@/app/debts/DebtSimulator";
import { fmtNative, rub } from "@/lib/format";
import {
  computeDebtSummary,
  displayDebtName,
  fmtDueLabel,
  type DebtObligation,
} from "@/lib/debts-summary";

type DebtTarget = {
  apr: number;
  name: string;
  currency: string;
};

type Props = {
  spot: number;
  eff: number;
  obligations: DebtObligation[];
  target?: DebtTarget | null;
  maxExtra?: number;
};

function AprCell({ apr }: { apr: number | null }) {
  if (apr == null) return <span className="lf-bento-sub">—</span>;
  const hi = Number(apr) >= 25;
  return <span className={hi ? "lf-text-danger" : undefined}>{Number(apr).toFixed(1)}%</span>;
}

export default function DebtsDesktop({ spot, eff, obligations, target: targetProp, maxExtra }: Props) {
  const { sorted, target: computedTarget, totalRub, weightedApr, nextDue } = computeDebtSummary(obligations, spot);

  const simTarget =
    targetProp ??
    (computedTarget
      ? {
          apr: Number(computedTarget.apr ?? 0),
          name: displayDebtName(computedTarget.name),
          currency: computedTarget.currency,
        }
      : null);
  const simMaxExtra = maxExtra ?? 475000;

  return (
    <div className="lf-page-desktop">
      <DesktopPageBridge title="Debts" spot={spot} eff={eff}>
        <div className="lf-desktop-page">
          <div className="lf-desktop-pagehead">
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
              {computedTarget ? (
                <>
                  <div className="lf-bento-val lf-mono" style={{ fontSize: 17 }}>
                    {displayDebtName(computedTarget.name)}
                  </div>
                  <div className="lf-bento-foot lf-bento-sub">
                    {computedTarget.apr != null ? `APR ${Number(computedTarget.apr).toFixed(2)}%` : computedTarget.kind}
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
                  const isTarget = computedTarget?.id === o.id && hasDebt;
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
                      <td className={`lf-bento-num${hasDebt ? " lf-text-danger" : ""}`}>
                        {fmtNative(Number(o.balance), o.currency)}
                      </td>
                      <td className="lf-bento-num lf-bento-num--alt">
                        {o.monthly_payment ? fmtNative(Number(o.monthly_payment), o.currency) : "—"}
                      </td>
                      <td className="lf-bento-sub">{o.due_date ?? "—"}</td>
                      <td className="lf-bento-num lf-bento-num--pct">{isTarget ? "target" : hasDebt ? "active" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {simTarget && (
            <section className="lf-desktop-panel" style={{ marginTop: 18 }}>
              <DebtSimulator
                topApr={simTarget.apr}
                topName={simTarget.name}
                currency={simTarget.currency}
                maxExtra={simMaxExtra}
              />
            </section>
          )}

          <p className="lf-bento-sub" style={{ marginTop: 10 }}>
            Payments tracked in obligations, not expense categories.
          </p>
        </div>
      </DesktopPageBridge>
    </div>
  );
}
