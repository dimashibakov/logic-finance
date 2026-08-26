import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd } from "@/lib/fx";
import { fmtNative } from "@/lib/format";
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
  let cls = "lf-apr lf-apr--lo";
  if (v >= 20) cls = "lf-apr lf-apr--hi";
  else if (v >= 10) cls = "lf-apr lf-apr--mid";
  return <span className={cls}>{v.toFixed(1)}%</span>;
}

export default async function DebtsPage() {
  const supabase = createClient();
  const [{ data: accData }, { data: oblData }] = await Promise.all([
    supabase.from("accounts").select("currency, type, balance").eq("currency", "RUB"),
    supabase.from("obligations").select("*"),
  ]);
  const rubCashMax = (accData ?? [])
    .filter((a) => ["cash", "checking", "savings"].includes(a.type))
    .reduce((s, a) => s + Math.max(0, Number(a.balance)), 0);
  const maxPrepay = Math.max(100000, Math.round(rubCashMax) || 475000);

  const obligations = ((oblData ?? []) as Obligation[]).filter((o) => Number(o.balance) !== 0 || o.apr != null);
  const sorted = [...obligations].sort((a, b) => Number(b.apr ?? 0) - Number(a.apr ?? 0));
  const target = sorted.find((o) => Number(o.balance) !== 0);

  return (
    <div className="lf-wrap">
      <div className="lf-phone">
        <RateHeader title="Debts" />

        <div className="lf-sec-label">
          <span className="lf-sec-label__h">Avalanche method</span>
          <span className="lf-sec-label__m">by apr ↓</span>
        </div>
        <div className="lf-hint" style={{ margin: "0 2px 12px" }}>
          Free cash → the most expensive interest-bearing debt first.
        </div>

        <div className="lf-card lf-card--flush">
          {sorted.map((o) => {
            const hasDebt = Number(o.balance) !== 0;
            const hot = daysUntil(o.due_date) <= 45 && /1916|alfa/i.test(o.name) && hasDebt;
            const isTarget = target?.id === o.id && hasDebt;
            return (
              <div key={o.id} className="lf-row">
                <div style={{ minWidth: 0, paddingRight: 8 }}>
                  <div style={{ fontSize: 13.5 }}>
                    {displayName(o.name)}
                    <AprPill apr={o.apr} />
                    {isTarget && <span className="lf-mono lf-text-success" style={{ fontSize: 10, marginLeft: 6 }}>↓ target</span>}
                    {hot && <span className="lf-hot">hot</span>}
                  </div>
                  <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, marginTop: 2 }}>
                    {o.due_date ? `due ${o.due_date}` : o.kind}
                    {o.monthly_payment ? ` · ${fmtNative(Number(o.monthly_payment), o.currency)}/mo` : ""}
                  </div>
                </div>
                <div className={`lf-mono${hasDebt ? " lf-text-danger" : " lf-text-faint"}`} style={{ fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                  {fmtNative(Number(o.balance), o.currency)}
                </div>
              </div>
            );
          })}
        </div>

        {target && (
          <div className="lf-card lf-card--pad" style={{ marginTop: 10 }}>
            <DebtSimulator topApr={Number(target.apr ?? 0)} topName={displayName(target.name)} currency={target.currency} maxExtra={maxPrepay} />
          </div>
        )}
      </div>
    </div>
  );
}
