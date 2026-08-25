"use client";

import { useState } from "react";
import { fmtNative, rub, toUsd, usd } from "@/lib/format";
import { isStaleBalance, type AccountRow } from "@/lib/liquidity";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

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
    <div style={{ ...S.card, marginBottom: 10, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 16px",
          border: "none",
          borderBottom: open ? `1px solid ${C.line2}` : "none",
          background: "transparent",
          cursor: "pointer",
          minHeight: 44,
        }}
      >
        <span style={{ ...S.mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.sub }}>{title}</span>
        <span style={{ ...S.mono, fontSize: 12, fontWeight: 600, color: summary.hasDebt ? C.debt : C.ink }}>
          {summary.text}
          <span style={{ color: C.faint, marginLeft: 8 }}>{open ? "▾" : "▸"}</span>
        </span>
      </button>
      {open &&
        accounts.map((a, i) => {
          const bal = Number(a.balance);
          const stale = isStaleBalance(a.balance_date);
          const isDebt = bal < 0;
          const secondary = a.currency === "RUB" ? usd(toUsd(Math.abs(bal), a.currency, spot)) : rub(toUsd(Math.abs(bal), a.currency, spot) * spot);
          return (
            <div
              key={a.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: i < accounts.length - 1 ? `1px solid ${C.line2}` : "none",
              }}
            >
              <div style={{ minWidth: 0, paddingRight: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 550, color: C.ink }}>{a.name}</div>
                <div
                  style={{
                    ...S.mono,
                    fontSize: 10.5,
                    color: C.faint,
                    marginTop: 3,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {a.type} · {a.zone.toLowerCase()}
                  {a.balance_date ? ` · ${a.balance_date.slice(5).replace("-", " ")}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {stale ? (
                  <>
                    <div style={{ ...S.mono, fontSize: 14.5, fontWeight: 600, color: C.warn }}>···</div>
                    <div style={{ ...S.mono, fontSize: 11, color: C.warn, marginTop: 2 }}>refresh</div>
                  </>
                ) : (
                  <>
                    <div style={{ ...S.mono, fontSize: 14.5, fontWeight: 600, color: isDebt ? C.debt : C.ink }}>
                      {isDebt && bal < 0 ? "−" : ""}
                      {fmtNative(Math.abs(bal), a.currency)}
                    </div>
                    <div style={{ ...S.mono, fontSize: 11, color: C.faint, marginTop: 2 }}>
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
