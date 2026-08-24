import { supabase } from "@/lib/supabase";
import { fetchFxRates, getRubPerUsd } from "@/lib/fx";
import { fmtNative, toUsd, usd } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

type Obligation = {
  name: string;
  kind: string;
  currency: string;
  balance: number;
  apr: number | null;
  monthly_payment: number | null;
};

function aprColor(apr: number) {
  if (apr >= 20) return C.down;
  if (apr >= 10) return C.amber;
  return C.faint;
}

export default async function DebtsPage() {
  const [{ data: oblData }, rates] = await Promise.all([
    supabase.from("obligations").select("*"),
    fetchFxRates(),
  ]);
  const rubPerUsd = getRubPerUsd(rates, "spot");

  const obligations = ((oblData ?? []) as Obligation[])
    .filter((o) => Number(o.balance) !== 0 || o.apr != null)
    .sort((a, b) => Number(b.apr ?? 0) - Number(a.apr ?? 0));

  const totalDebt = obligations.reduce((s, o) => s + toUsd(Number(o.balance), o.currency, rubPerUsd), 0);
  const totalMonthly = obligations.reduce((s, o) => s + toUsd(Number(o.monthly_payment ?? 0), o.currency, rubPerUsd), 0);

  const topLoan = obligations
    .filter((o) => o.kind === "loan" && o.apr != null)
    .sort((a, b) => Number(b.apr) - Number(a.apr))[0];

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <div style={S.header}>
          <span style={S.title}>DEBTS · Logic Finance</span>
          <span style={{ ...S.mono, fontSize: 12, color: C.sub }}>{obligations.length} items</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>Total debt</div>
            <div style={{ ...S.mono, fontSize: 20, fontWeight: 600, color: C.down, marginTop: 3 }}>{usd(totalDebt)}</div>
          </div>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>Monthly service</div>
            <div style={{ ...S.mono, fontSize: 20, fontWeight: 600, color: C.ink, marginTop: 3 }}>{usd(totalMonthly)}</div>
          </div>
        </div>

        <div style={{ ...S.label, marginBottom: 8 }}>OBLIGATIONS · APR ↓</div>
        <div style={{ ...S.card, padding: 0, overflowX: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto",
              gap: 8,
              padding: "8px 14px",
              borderBottom: `1px solid ${C.line}`,
              ...S.mono,
              fontSize: 10,
              color: C.sub,
              letterSpacing: "0.04em",
            }}
          >
            <span>NAME</span>
            <span style={{ textAlign: "right" }}>BALANCE</span>
            <span style={{ textAlign: "right" }}>MONTHLY</span>
            <span style={{ textAlign: "right" }}>APR</span>
          </div>
          {obligations.map((o, i) => {
            const apr = Number(o.apr ?? 0);
            const isTarget = topLoan && o.name === topLoan.name && o.kind === "loan";
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  gap: 8,
                  alignItems: "center",
                  padding: "12px 14px",
                  borderBottom: i < obligations.length - 1 ? `1px solid ${C.line}` : "none",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.ink, lineHeight: 1.3 }}>
                    {o.name}
                    {isTarget && (
                      <span style={{ ...S.mono, fontSize: 10, color: C.down, marginLeft: 6, fontWeight: 600 }}>target #1</span>
                    )}
                  </div>
                  <div style={{ ...S.mono, fontSize: 10, color: C.faint }}>{o.kind}</div>
                </div>
                <div style={{ ...S.mono, fontSize: 12, fontWeight: 600, color: C.down, textAlign: "right", whiteSpace: "nowrap" }}>
                  {fmtNative(Number(o.balance), o.currency)}
                </div>
                <div style={{ ...S.mono, fontSize: 12, color: C.ink, textAlign: "right", whiteSpace: "nowrap" }}>
                  {o.monthly_payment != null ? fmtNative(Number(o.monthly_payment), o.currency) : "—"}
                </div>
                <div style={{ ...S.mono, fontSize: 12, fontWeight: 600, color: aprColor(apr), textAlign: "right", whiteSpace: "nowrap" }}>
                  {o.apr != null ? `${apr.toFixed(1)}%` : "—"}
                </div>
              </div>
            );
          })}
          {obligations.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, color: C.sub }}>No obligations — check obligations table in Supabase.</div>
          )}
        </div>

        <div style={{ ...S.card, marginTop: 12, background: "#F0F4FF", borderColor: "#1652F022", display: "flex", gap: 10 }}>
          <span style={{ ...S.mono, color: C.blue, fontWeight: 600 }}>i</span>
          <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
            Avalanche: direct extra payments to the highest-APR debt first (target #1).
          </div>
        </div>
      </div>
    </div>
  );
}
