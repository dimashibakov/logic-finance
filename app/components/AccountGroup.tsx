"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { fmtNative, toUsd, usd } from "@/lib/format";
import { isStaleBalance, type AccountRow } from "@/lib/liquidity";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

type Props = {
  title: string;
  accounts: AccountRow[];
  spot: number;
  defaultOpen?: boolean;
};

export default function AccountGroup({ title, accounts, spot, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  if (accounts.length === 0) return null;

  const toUsdLocal = (n: number, c: string) => toUsd(n, c, spot);

  return (
    <div style={{ ...S.card, padding: 0, marginBottom: 10, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          minHeight: 48,
        }}
      >
        <span style={{ ...S.label, margin: 0 }}>{title}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.faint }}>
          <span style={{ ...S.mono, fontSize: 11 }}>{accounts.length}</span>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {open &&
        accounts.map((a, i) => {
          const bal = Number(a.balance);
          const stale = isStaleBalance(a.balance_date);
          const isDebt = bal < 0 || a.type === "credit_card";
          return (
            <div
              key={a.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "11px 14px",
                borderTop: `1px solid ${C.line}`,
              }}
            >
              <div style={{ minWidth: 0, paddingRight: 8 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{a.name}</div>
                <div style={{ ...S.mono, fontSize: 10, color: C.faint, marginTop: 3 }}>
                  {a.type} · {a.zone}
                  {a.balance_date ? ` · ${a.balance_date}` : ""}
                  {stale && <span style={{ color: C.warn, marginLeft: 6 }}>refresh</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ ...S.mono, fontSize: 13, fontWeight: 600, color: isDebt ? C.debt : C.ink }}>
                  {fmtNative(bal, a.currency)}
                </div>
                <div style={{ ...S.mono, fontSize: 10, color: C.faint, marginTop: 2 }}>
                  {usd(toUsdLocal(Math.abs(bal), a.currency))}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}
