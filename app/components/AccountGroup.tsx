"use client";

import { useState } from "react";
import { fmtNative, rub, toUsd, usd } from "@/lib/format";
import { isStaleBalance, type AccountRow } from "@/lib/liquidity";
import AccountBadge from "./AccountBadge";

type Props = {
  title: string;
  accounts: AccountRow[];
  spot: number;
  defaultOpen?: boolean;
};

function groupSummary(accounts: AccountRow[]) {
  let rubTotal = 0;
  let usdTotal = 0;
  for (const a of accounts) {
    const b = Number(a.balance);
    if (a.currency === "RUB") rubTotal += b;
    else usdTotal += b;
  }
  const parts: string[] = [];
  if (Math.abs(rubTotal) > 0.01) parts.push(rub(rubTotal));
  if (Math.abs(usdTotal) > 0.01) parts.push(usd(usdTotal));
  const hasDebt = accounts.some((a) => Number(a.balance) < 0);
  return { text: parts.join(" · ") || usd(0), hasDebt };
}

export default function AccountGroup({ title, accounts, spot, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  if (accounts.length === 0) return null;

  const summary = groupSummary(accounts);

  return (
    <div className="lf-card lf-group">
      <button type="button" onClick={() => setOpen(!open)} className="lf-group__head" style={{ borderBottom: open ? undefined : "none" }}>
        <span className="lf-group__title">{title}</span>
        <span className={`lf-group__sum lf-mono${summary.hasDebt ? " lf-text-danger" : ""}`}>
          {summary.text}
          <span className="lf-text-faint" style={{ marginLeft: 8 }}>
            {open ? "▾" : "▸"}
          </span>
        </span>
      </button>
      {open &&
        accounts.map((a) => {
          const bal = Number(a.balance);
          const stale = isStaleBalance(a.balance_date);
          const isDebt = bal < 0;
          const secondary =
            a.currency === "RUB" ? usd(toUsd(Math.abs(bal), a.currency, spot)) : rub(toUsd(Math.abs(bal), a.currency, spot) * spot);
          return (
            <div key={a.id} className="lf-acct">
              <AccountBadge account={a} />
              <div className="lf-acct__mid">
                <div style={{ fontSize: 14, fontWeight: 550 }}>{a.name}</div>
                <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {a.type} · {a.zone.toLowerCase()}
                  {a.balance_date ? ` · ${a.balance_date.slice(5).replace("-", " ")}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {stale ? (
                  <>
                    <div className="lf-mono lf-stale" style={{ fontSize: 14.5, fontWeight: 600 }}>
                      ···
                    </div>
                    <div className="lf-mono lf-stale" style={{ fontSize: 11, marginTop: 2 }}>
                      refresh
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`lf-mono${isDebt ? " lf-text-danger" : ""}`} style={{ fontSize: 14.5, fontWeight: 600 }}>
                      {isDebt && bal < 0 ? "−" : ""}
                      {fmtNative(Math.abs(bal), a.currency)}
                    </div>
                    <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 2 }}>
                      {isDebt && "−"}
                      {secondary}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
