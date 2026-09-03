"use client";

import { useRouter } from "next/navigation";
import DesktopPageBridge from "./DesktopPageBridge";
import { rub } from "@/lib/format";
import type { CategoryLine } from "@/lib/plan-fact";

type Props = {
  spot: number;
  eff: number;
  month: string;
  monthLabel: string;
  months: string[];
  rubExpenses: CategoryLine[];
  incomeFactRub: number;
  incomePlanRub: number;
};

function monthOptionLabel(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function fmtDelta(n: number) {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${rub(Math.abs(Math.round(n)))}`;
}

export default function PlanDesktop({
  spot,
  eff,
  month,
  monthLabel,
  months,
  rubExpenses,
  incomeFactRub,
  incomePlanRub,
}: Props) {
  const router = useRouter();

  return (
    <div className="lf-page-desktop">
      <DesktopPageBridge title="Plan · Fact" spot={spot} eff={eff}>
      <div className="lf-desktop-page">
        <div className="lf-desktop-pagehead">
          <div className="lf-desktop-pagehead__right">
            <span className="lf-bento-sub">month</span>
            <select
              className="lf-desktop-input lf-desktop-input--sm lf-mono"
              value={month}
              onChange={(e) => router.push(`/plan?month=${encodeURIComponent(e.target.value)}`)}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthOptionLabel(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="lf-desktop-panel lf-desktop-panel--flush">
          <table className="lf-bento-table lf-desktop-plan-table">
            <thead>
              <tr>
                <th>CATEGORY</th>
                <th className="lf-bento-r">PLAN ₽</th>
                <th className="lf-bento-r">FACT ₽</th>
                <th className="lf-bento-r">VARIANCE</th>
                <th style={{ width: 180 }}>PROGRESS</th>
              </tr>
            </thead>
            <tbody>
              {(incomePlanRub > 0 || incomeFactRub > 0) && (
                <tr>
                  <td>Income</td>
                  <td className="lf-bento-num">{rub(Math.round(incomePlanRub))}</td>
                  <td className="lf-bento-num">{rub(Math.round(incomeFactRub))}</td>
                  <td className={`lf-bento-num${incomeFactRub - incomePlanRub < 0 ? " lf-text-danger" : ""}`}>
                    {fmtDelta(incomeFactRub - incomePlanRub)}
                  </td>
                  <td>
                    <div className="lf-progress">
                      <div
                        className="lf-progress__fill"
                        style={{
                          width: `${incomePlanRub > 0 ? Math.min(100, Math.round((incomeFactRub / incomePlanRub) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              )}
              {rubExpenses.map((line) => {
                const variance = line.fact - line.plan;
                const over = variance > 0 && line.plan > 0;
                const pct = line.plan > 0 ? Math.min(100, Math.round((line.fact / line.plan) * 100)) : line.fact > 0 ? 100 : 0;
                return (
                  <tr key={line.name}>
                    <td>{line.name}</td>
                    <td className="lf-bento-num">{rub(Math.round(line.plan))}</td>
                    <td className="lf-bento-num">{rub(Math.round(line.fact))}</td>
                    <td className={`lf-bento-num${over ? " lf-text-danger" : ""}`}>{fmtDelta(variance)}</td>
                    <td>
                      <div className="lf-progress">
                        <div className={`lf-progress__fill${over ? " lf-progress__fill--over" : ""}`} style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rubExpenses.length === 0 && incomePlanRub === 0 && incomeFactRub === 0 && (
                <tr>
                  <td colSpan={5} className="lf-bento-sub" style={{ padding: 16 }}>
                    No plan or transaction data for {monthLabel}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </DesktopPageBridge>
    </div>
  );
}
