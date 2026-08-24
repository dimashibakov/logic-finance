import { supabase } from "@/lib/supabase";
import { fetchFxRates, getRubPerUsd } from "@/lib/fx";
import { fmtNative, rub, toUsd, usd } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

type Transaction = {
  amount: number;
  currency: string;
  type: string;
  ts: string;
  category_id: string | null;
  categories: { name: string; kind: string } | { name: string; kind: string }[] | null;
};

function categoryOf(tx: Transaction) {
  const c = tx.categories;
  if (!c) return null;
  return Array.isArray(c) ? c[0] ?? null : c;
}

function monthRangeFromTs(ts: string) {
  const d = new Date(ts + "T00:00:00");
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  const label = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { start: fmt(start), end: fmt(end), label };
}

export default async function PlanPage() {
  const [{ data: txData }, rates] = await Promise.all([
    supabase.from("transactions").select("amount, currency, type, ts, category_id, categories(name, kind)").order("ts", { ascending: false }),
    fetchFxRates(),
  ]);
  const rubPerUsd = getRubPerUsd(rates, "spot");
  const allTx = (txData ?? []) as Transaction[];

  if (allTx.length === 0) {
    return (
      <div style={S.wrap}>
        <div style={S.phone}>
          <div style={S.header}>
            <span style={S.title}>PLAN · Logic Finance</span>
          </div>
          <div style={{ ...S.card, padding: 16, fontSize: 13, color: C.sub }}>No transactions — check transactions table in Supabase.</div>
        </div>
      </div>
    );
  }

  const { start, end, label } = monthRangeFromTs(allTx[0].ts);
  const transactions = allTx.filter((tx) => tx.ts >= start && tx.ts <= end);

  let incomeUsd = 0;
  let expenseUsd = 0;
  let incomeRub = 0;
  let incomeUsdNative = 0;
  let expenseRub = 0;
  let expenseUsdNative = 0;

  type CatExpense = { name: string; rub: number; usd: number };
  const expenseByCat = new Map<string, CatExpense>();

  for (const tx of transactions) {
    const amt = Math.abs(Number(tx.amount));
    const cat = categoryOf(tx);
    const catName = cat?.name ?? "Uncategorized";

    if (tx.type === "income") {
      incomeUsd += toUsd(amt, tx.currency, rubPerUsd);
      if (tx.currency === "RUB") incomeRub += amt;
      else incomeUsdNative += amt;
    } else if (tx.type === "expense") {
      expenseUsd += toUsd(amt, tx.currency, rubPerUsd);
      if (tx.currency === "RUB") expenseRub += amt;
      else expenseUsdNative += amt;

      const prev = expenseByCat.get(catName) ?? { name: catName, rub: 0, usd: 0 };
      if (tx.currency === "RUB") prev.rub += amt;
      else prev.usd += amt;
      expenseByCat.set(catName, prev);
    }
  }

  const net = incomeUsd - expenseUsd;

  const expenseCats = [...expenseByCat.values()]
    .map((c) => ({ ...c, sortKey: toUsd(c.rub, "RUB", rubPerUsd) + c.usd }))
    .sort((a, b) => b.sortKey - a.sortKey);

  function catTotal(c: CatExpense) {
    const parts: string[] = [];
    if (c.rub > 0) parts.push(rub(c.rub));
    if (c.usd > 0) parts.push(usd(c.usd));
    return parts.join(" + ") || "—";
  }

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <div style={S.header}>
          <span style={S.title}>PLAN · Logic Finance</span>
          <span style={{ ...S.mono, fontSize: 12, color: C.sub }}>{label}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 10, color: C.sub }}>Income</div>
            <div style={{ ...S.mono, fontSize: 18, fontWeight: 600, color: C.up, marginTop: 3 }}>{usd(incomeUsd)}</div>
          </div>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 10, color: C.sub }}>Expenses</div>
            <div style={{ ...S.mono, fontSize: 18, fontWeight: 600, color: C.down, marginTop: 3 }}>{usd(expenseUsd)}</div>
          </div>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 10, color: C.sub }}>Net</div>
            <div style={{ ...S.mono, fontSize: 18, fontWeight: 600, color: net >= 0 ? C.up : C.down, marginTop: 3 }}>{usd(net)}</div>
          </div>
        </div>

        <div style={{ ...S.mono, fontSize: 11, color: C.faint, marginBottom: 16, lineHeight: 1.5 }}>
          Income: {rub(incomeRub)} + {usd(incomeUsdNative)} · Expenses: {rub(expenseRub)} + {usd(expenseUsdNative)}
        </div>

        <div style={{ ...S.label, marginBottom: 8 }}>EXPENSE CATEGORIES</div>
        <div style={{ ...S.card, padding: 0 }}>
          {expenseCats.map((c, i) => (
            <div
              key={c.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                borderBottom: i < expenseCats.length - 1 ? `1px solid ${C.line}` : "none",
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 500, color: C.ink }}>{c.name}</div>
              <div style={{ ...S.mono, fontSize: 13, fontWeight: 600, color: C.down }}>{catTotal(c)}</div>
            </div>
          ))}
          {expenseCats.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, color: C.sub }}>No expenses in {label}.</div>
          )}
        </div>
      </div>
    </div>
  );
}
