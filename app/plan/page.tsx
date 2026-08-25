import { supabase } from "@/lib/supabase";
import { fetchFxRates, getRubPerUsd, toUsd } from "@/lib/fx";
import { usd } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";
import RateHeader from "../components/RateHeader";

type Tx = { amount: number; currency: string; type: string; ts: string; category_id: string | null; source: string | null; categories: { name: string } | { name: string }[] | null };
type PlanRow = { planned_amount: number; currency: string; category_id: string; categories: { name: string } | { name: string }[] | null };

function catName(c: Tx["categories"] | PlanRow["categories"]) {
  if (!c) return "Uncategorized";
  return Array.isArray(c) ? c[0]?.name ?? "Uncategorized" : c.name;
}

export default async function PlanPage() {
  const month = "2026-08-01"; // first fact month (August)
  const monthEnd = "2026-08-31";
  const label = "August 2026";

  const [{ data: txData }, { data: planData }, rates] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, currency, type, ts, category_id, source, categories(name)")
      .gte("ts", month)
      .lte("ts", monthEnd)
      .in("source", ["statement", "manual"]),
    supabase.from("plan").select("planned_amount, currency, category_id, categories(name)").eq("month", month),
    fetchFxRates(),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const txs = (txData ?? []) as Tx[];
  const plans = (planData ?? []) as PlanRow[];

  let incomeFact = 0;
  let expenseFact = 0;
  const factByCat = new Map<string, number>();
  const planByCat = new Map<string, number>();

  for (const tx of txs) {
    const amt = Math.abs(Number(tx.amount));
    const usdAmt = toUsd(amt, tx.currency, spot);
    const name = catName(tx.categories);
    if (tx.type === "income") incomeFact += usdAmt;
    if (tx.type === "expense") {
      expenseFact += usdAmt;
      factByCat.set(name, (factByCat.get(name) ?? 0) + usdAmt);
    }
  }

  let incomePlan = 0;
  let expensePlan = 0;
  for (const p of plans) {
    const usdAmt = toUsd(Number(p.planned_amount), p.currency, spot);
    const name = catName(p.categories);
    planByCat.set(name, (planByCat.get(name) ?? 0) + usdAmt);
    if (name.toLowerCase().includes("income") || usdAmt < 0) incomePlan += Math.abs(usdAmt);
    else expensePlan += usdAmt;
  }

  const cats = [...new Set([...factByCat.keys(), ...planByCat.keys()])].sort(
    (a, b) => (factByCat.get(b) ?? 0) - (factByCat.get(a) ?? 0)
  );

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <RateHeader title="Plan" subtitle={label} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: 4 }}>Income</div>
            <div style={{ ...S.mono, fontSize: 16, fontWeight: 600, color: C.up }}>{usd(incomeFact)}</div>
            <div style={{ ...S.mono, fontSize: 10, color: C.faint, marginTop: 4 }}>plan {usd(incomePlan)}</div>
          </div>
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: 4 }}>Expenses</div>
            <div style={{ ...S.mono, fontSize: 16, fontWeight: 600, color: C.debt }}>{usd(expenseFact)}</div>
            <div style={{ ...S.mono, fontSize: 10, color: C.faint, marginTop: 4 }}>plan {usd(expensePlan)}</div>
          </div>
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: 4 }}>Net</div>
            <div style={{ ...S.mono, fontSize: 16, fontWeight: 600, color: incomeFact - expenseFact >= 0 ? C.up : C.debt }}>
              {usd(incomeFact - expenseFact)}
            </div>
          </div>
        </div>

        <div style={{ ...S.label, marginBottom: 8 }}>Expenses · plan vs fact</div>
        <div style={{ ...S.card, padding: 0 }}>
          {cats.map((name, i) => {
            const fact = factByCat.get(name) ?? 0;
            const plan = planByCat.get(name) ?? 0;
            const delta = fact - plan;
            const over = delta > 0 && plan > 0;
            const pct = plan > 0 ? Math.min(100, Math.round((fact / plan) * 100)) : 100;
            const oneOff = /travel|ticket|shop|marketplace/i.test(name);
            return (
              <div key={name} style={{ padding: "12px 14px", borderBottom: i < cats.length - 1 ? `1px solid ${C.line}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{name}</div>
                    {oneOff && fact > plan * 1.5 && <div style={{ fontSize: 10, color: C.warn, marginTop: 2 }}>one-off spike</div>}
                  </div>
                  <div style={{ ...S.mono, fontSize: 11, textAlign: "right", color: over ? C.debt : C.faint }}>
                    {usd(fact)} / {usd(plan)}
                  </div>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: C.line, marginTop: 8, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: over ? C.debt : C.accent }} />
                </div>
              </div>
            );
          })}
          {cats.length === 0 && <div style={{ padding: 16, fontSize: 13, color: C.sub }}>No plan rows for {label}. Apply migration to seed plan table.</div>}
        </div>
      </div>
    </div>
  );
}
