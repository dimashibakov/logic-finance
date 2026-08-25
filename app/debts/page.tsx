import { supabase } from "@/lib/supabase";
import { fetchFxRates, getRubPerUsd } from "@/lib/fx";
import { fmtNative, toUsd, usd } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";
import RateHeader from "../components/RateHeader";
import DebtSimulator from "./DebtSimulator";
import { CreditCard, Landmark, Receipt, type LucideIcon } from "lucide-react";

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

function AprPill({ apr, grace }: { apr: number | null; grace?: boolean }) {
  if (grace) return <span style={{ ...S.mono, fontSize: 10, color: C.faint, background: C.line, padding: "3px 8px", borderRadius: 99 }}>grace</span>;
  if (apr == null) return <span style={{ ...S.mono, fontSize: 12, color: C.faint }}>—</span>;
  const v = Number(apr);
  let bg = "#eef1f4";
  let color = C.sub;
  if (v >= 20) { bg = "#fdecee"; color = C.debt; }
  else if (v >= 10) { bg = C.warnBg; color = C.warn; }
  return <span style={{ ...S.mono, fontSize: 11, fontWeight: 600, color, background: bg, padding: "4px 8px", borderRadius: 99 }}>{v.toFixed(1)}% APR</span>;
}

const ICONS: Record<string, LucideIcon> = { loan: Landmark, credit_card: CreditCard, tax_rf: Receipt, tax_us: Receipt };

function Card({ o, isTarget, hot }: { o: Obligation; isTarget: boolean; hot: boolean }) {
  const Icon = ICONS[o.kind] ?? Receipt;
  const hasDebt = Number(o.balance) !== 0;
  const isGrace = /1916|alfa.*card/i.test(o.name) && (o.apr == null || o.apr === 0);
  return (
    <div style={{ ...S.card, display: "flex", gap: 12, alignItems: "center", padding: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${C.accent}10`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={17} color={C.accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{displayName(o.name)}</span>
          {isTarget && <span style={{ ...S.mono, fontSize: 10, color: C.up, background: `${C.up}18`, padding: "2px 7px", borderRadius: 99 }}>target #1</span>}
          {hot && <span style={{ ...S.mono, fontSize: 9, color: C.debt, fontWeight: 700 }}>DUE</span>}
        </div>
        <div style={{ ...S.mono, fontSize: 10, color: C.faint, marginTop: 3 }}>
          {o.due_date ? `due ${o.due_date}` : o.kind}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ ...S.mono, fontSize: 14, fontWeight: 600, color: hasDebt ? C.debt : C.faint }}>{fmtNative(Number(o.balance), o.currency)}</div>
        <div style={{ marginTop: 6 }}><AprPill apr={o.apr} grace={isGrace} /></div>
      </div>
    </div>
  );
}

export default async function DebtsPage() {
  const [{ data: oblData }, rates] = await Promise.all([supabase.from("obligations").select("*"), fetchFxRates()]);
  const spot = getRubPerUsd(rates, "spot");
  const obligations = ((oblData ?? []) as Obligation[]).filter((o) => Number(o.balance) !== 0 || o.apr != null);
  const active = obligations.filter((o) => Number(o.balance) !== 0).sort((a, b) => Number(b.apr ?? 0) - Number(a.apr ?? 0));
  const reserves = obligations.filter((o) => Number(o.balance) === 0).sort((a, b) => Number(b.apr ?? 0) - Number(a.apr ?? 0));
  const target = active[0];
  const totalDebt = obligations.reduce((s, o) => s + toUsd(Number(o.balance), o.currency, spot), 0);
  const totalMonthly = obligations.reduce((s, o) => s + toUsd(Number(o.monthly_payment ?? 0), o.currency, spot), 0);

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <RateHeader title="Debts" subtitle="Avalanche strategy" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: 4 }}>Total debt</div>
            <div style={{ ...S.mono, fontSize: 20, fontWeight: 600, color: C.debt }}>{usd(totalDebt)}</div>
          </div>
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: 4 }}>Monthly service</div>
            <div style={{ ...S.mono, fontSize: 20, fontWeight: 600, color: C.ink }}>{usd(totalMonthly)}</div>
          </div>
        </div>

        <div style={{ ...S.label, marginBottom: 8 }}>Active debt</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {active.map((o) => (
            <Card key={o.id} o={o} isTarget={target?.id === o.id} hot={daysUntil(o.due_date) <= 14 && /1916|alfa/i.test(o.name)} />
          ))}
        </div>

        {reserves.length > 0 && (
          <>
            <div style={{ ...S.label, marginBottom: 8 }}>Cards & reserves</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {reserves.map((o) => <Card key={o.id} o={o} isTarget={false} hot={false} />)}
            </div>
          </>
        )}

        {target && <DebtSimulator topApr={Number(target.apr ?? 0)} topName={displayName(target.name)} />}

        <div style={{ ...S.card, marginTop: 12, background: C.warnBg, borderColor: `${C.warn}33`, fontSize: 12.5, lineHeight: 1.5 }}>
          Avalanche: send extra payments to highest APR first (target #1).
        </div>
      </div>
    </div>
  );
}
