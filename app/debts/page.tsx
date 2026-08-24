import { supabase } from "@/lib/supabase";
import { fetchFxRates, getRubPerUsd } from "@/lib/fx";
import { rub, toUsd, usd } from "@/lib/format";
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

const KIND_LABELS: Record<string, string> = {
  loan: "Кредит",
  credit_card: "Кредитная карта",
  tax_rf: "Налог РФ",
  tax_us: "Налог US",
};

export default async function DebtsPage() {
  const [{ data: oblData }, rates] = await Promise.all([
    supabase.from("obligations").select("*").in("kind", ["loan", "credit_card", "tax_rf", "tax_us"]),
    fetchFxRates(),
  ]);
  const rubPerUsd = getRubPerUsd(rates, "spot");

  const obligations = ((oblData ?? []) as Obligation[]).sort(
    (a, b) => Number(b.apr ?? 0) - Number(a.apr ?? 0)
  );

  const totalDebt = obligations.reduce((s, o) => s + toUsd(Number(o.balance), o.currency, rubPerUsd), 0);
  const totalMonthly = obligations.reduce((s, o) => s + toUsd(Number(o.monthly_payment ?? 0), o.currency, rubPerUsd), 0);

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <div style={S.header}>
          <span style={S.title}>ДОЛГИ · Logic Finance</span>
          <span style={{ ...S.mono, fontSize: 12, color: C.sub }}>{obligations.length} шт.</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>Общий долг</div>
            <div style={{ ...S.mono, fontSize: 20, fontWeight: 600, color: C.down, marginTop: 3 }}>{usd(totalDebt)}</div>
          </div>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>Ежемес. платежи</div>
            <div style={{ ...S.mono, fontSize: 20, fontWeight: 600, color: C.ink, marginTop: 3 }}>{usd(totalMonthly)}</div>
          </div>
        </div>

        <div style={{ ...S.label, marginBottom: 8 }}>ОБЯЗАТЕЛЬСТВА · APR ↓</div>
        <div style={{ ...S.card, padding: 0 }}>
          {obligations.map((o, i) => {
            const apr = Number(o.apr ?? 0);
            const aprColor = apr >= 20 ? C.down : apr >= 10 ? C.amber : C.up;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderBottom: i < obligations.length - 1 ? `1px solid ${C.line}` : "none",
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: C.ink }}>{o.name}</div>
                  <div style={{ ...S.mono, fontSize: 11, color: C.faint }}>{KIND_LABELS[o.kind] ?? o.kind}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ ...S.mono, fontSize: 13, fontWeight: 600, color: C.down }}>
                    {o.currency === "USD" ? usd(Number(o.balance)) : rub(Number(o.balance))}
                  </div>
                  <div style={{ ...S.mono, fontSize: 11, color: aprColor, marginTop: 2 }}>
                    APR {o.apr != null ? `${apr.toFixed(1)}%` : "—"}
                  </div>
                </div>
              </div>
            );
          })}
          {obligations.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, color: C.sub }}>Нет обязательств — проверь таблицу obligations.</div>
          )}
        </div>
      </div>
    </div>
  );
}
