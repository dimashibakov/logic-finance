import { supabase } from "@/lib/supabase";
import { fetchFxRates, getRubPerUsd } from "@/lib/fx";
import { fmtNative } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";
import RateHeader from "../components/RateHeader";
import DebtSimulator from "./DebtSimulator";

type Obligation = {
  id: string;
  name: string;
  kind: string;
  currency: string;
  balance: number;
  apr: number | null;
  monthly_payment: number | null;
  due_date: string | null;
};

function displayName(name: string) {
  return name.replace(/\s*\(карта\)\s*$/i, "");
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return 999;
  return Math.ceil((new Date(`${dateStr}T12:00:00`).getTime() - Date.now()) / 86400000);
}

function AprPill({ apr }: { apr: number | null }) {
  if (apr == null) return null;
  const v = Number(apr);
  let bg = "#eef6f0";
  let color = C.up;
  if (v >= 20) {
    bg = "#fbecec";
    color = C.debt;
  } else if (v >= 10) {
    bg = C.warnBg;
    color = C.warn;
  }
  return (
    <span style={{ ...S.mono, fontSize: 11, padding: "2px 7px", borderRadius: 6, background: bg, color, fontWeight: 600, marginLeft: 6 }}>
      {v.toFixed(1)}%
    </span>
  );
}

export default async function DebtsPage() {
  const [{ data: oblData }] = await Promise.all([supabase.from("obligations").select("*")]);
  const obligations = ((oblData ?? []) as Obligation[]).filter((o) => Number(o.balance) !== 0 || o.apr != null);
  const sorted = [...obligations].sort((a, b) => Number(b.apr ?? 0) - Number(a.apr ?? 0));
  const target = sorted.find((o) => Number(o.balance) !== 0);

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <RateHeader title="Debts" />

        <div style={S.secLabel}>
          <span style={S.eyebrow}>Avalanche method</span>
        </div>
        <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5, margin: "0 2px 12px" }}>
          Sorted by APR. Extra cash goes to the highest-rate debt first.
        </div>

        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          {sorted.map((o, i) => {
            const hasDebt = Number(o.balance) !== 0;
            const hot = daysUntil(o.due_date) <= 45 && /1916|alfa/i.test(o.name) && hasDebt;
            const isTarget = target?.id === o.id && hasDebt;
            return (
              <div key={o.id} style={{ ...S.row, borderBottom: i < sorted.length - 1 ? `1px solid ${C.line2}` : "none" }}>
                <div style={{ minWidth: 0, paddingRight: 8 }}>
                  <div style={{ fontSize: 13.5, color: C.ink }}>
                    {displayName(o.name)}
                    <AprPill apr={o.apr} />
                    {isTarget && (
                      <span style={{ ...S.mono, fontSize: 10, color: C.up, marginLeft: 6 }}>↓ target</span>
                    )}
                    {hot && (
                      <span
                        style={{
                          ...S.mono,
                          fontSize: 9.5,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          padding: "2px 6px",
                          borderRadius: 5,
                          background: C.warnBg,
                          color: C.warn,
                          border: "1px solid #f0e0bd",
                          marginLeft: 6,
                        }}
                      >
                        hot
                      </span>
                    )}
                  </div>
                  <div style={{ ...S.mono, fontSize: 10.5, color: C.faint, marginTop: 2 }}>
                    {o.due_date ? `due ${o.due_date}` : o.kind}
                    {o.monthly_payment ? ` · ${fmtNative(Number(o.monthly_payment), o.currency)}/mo` : ""}
                  </div>
                </div>
                <div style={{ ...S.mono, fontSize: 14, fontWeight: 600, color: hasDebt ? C.debt : C.faint, flexShrink: 0 }}>
                  {fmtNative(Number(o.balance), o.currency)}
                </div>
              </div>
            );
          })}
        </div>

        {target && (
          <div style={{ ...S.cardPad, marginTop: 10 }}>
            <DebtSimulator topApr={Number(target.apr ?? 0)} topName={displayName(target.name)} />
          </div>
        )}
      </div>
    </div>
  );
}
