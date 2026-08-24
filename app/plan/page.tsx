import { supabase } from "@/lib/supabase";
import { fetchFxRates, getRubPerUsd } from "@/lib/fx";
import { rub, toUsd, usd } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

type Transaction = {
  amount: number;
  currency: string;
  type: string;
  category_id: string | null;
  categories: { name: string; kind: string } | { name: string; kind: string }[] | null;
};

function categoryOf(tx: Transaction) {
  const c = tx.categories;
  if (!c) return null;
  return Array.isArray(c) ? c[0] ?? null : c;
}

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end), label: start.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }) };
}

export default async function PlanPage() {
  const { start, end, label } = currentMonthRange();
  const [{ data: txData }, rates] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, currency, type, category_id, categories(name, kind)")
      .gte("ts", start)
      .lte("ts", end),
    fetchFxRates(),
  ]);
  const rubPerUsd = getRubPerUsd(rates, "spot");

  const transactions = (txData ?? []) as Transaction[];

  const byCategory = new Map<string, { name: string; kind: string; totalUsd: number }>();
  for (const tx of transactions) {
    const cat = categoryOf(tx);
    const catName = cat?.name ?? "Без категории";
    const catKind = cat?.kind ?? tx.type;
    const key = `${catName}::${catKind}`;
    const prev = byCategory.get(key) ?? { name: catName, kind: catKind, totalUsd: 0 };
    const signed = tx.type === "income" ? Math.abs(Number(tx.amount)) : -Math.abs(Number(tx.amount));
    prev.totalUsd += toUsd(signed, tx.currency, rubPerUsd);
    byCategory.set(key, prev);
  }

  const categories = [...byCategory.values()].sort((a, b) => Math.abs(b.totalUsd) - Math.abs(a.totalUsd));
  const incomeCats = categories.filter((c) => c.totalUsd > 0);
  const expenseCats = categories.filter((c) => c.totalUsd < 0);
  const income = incomeCats.reduce((s, c) => s + c.totalUsd, 0);
  const expense = expenseCats.reduce((s, c) => s + Math.abs(c.totalUsd), 0);

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <div style={S.header}>
          <span style={S.title}>ПЛАН · Logic Finance</span>
          <span style={{ ...S.mono, fontSize: 12, color: C.sub }}>{label}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>Доход</div>
            <div style={{ ...S.mono, fontSize: 20, fontWeight: 600, color: C.up, marginTop: 3 }}>{usd(income)}</div>
          </div>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>Расход</div>
            <div style={{ ...S.mono, fontSize: 20, fontWeight: 600, color: C.down, marginTop: 3 }}>{usd(expense)}</div>
          </div>
        </div>

        {incomeCats.length > 0 && (
          <>
            <div style={{ ...S.label, marginBottom: 8 }}>ДОХОДЫ</div>
            <div style={{ ...S.card, padding: 0, marginBottom: 16 }}>
              {incomeCats.map((c, i) => (
                <div
                  key={c.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    borderBottom: i < incomeCats.length - 1 ? `1px solid ${C.line}` : "none",
                  }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: C.ink }}>{c.name}</div>
                  <div style={{ ...S.mono, fontSize: 13, fontWeight: 600, color: C.up }}>{usd(c.totalUsd)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ ...S.label, marginBottom: 8 }}>РАСХОДЫ</div>
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
              <div style={{ ...S.mono, fontSize: 13, fontWeight: 600, color: C.down }}>{usd(Math.abs(c.totalUsd))}</div>
            </div>
          ))}
          {expenseCats.length === 0 && incomeCats.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, color: C.sub }}>
              Нет транзакций за {label} — проверь таблицу transactions.
            </div>
          )}
          {expenseCats.length === 0 && incomeCats.length > 0 && (
            <div style={{ padding: 16, fontSize: 13, color: C.sub }}>Расходов за месяц нет.</div>
          )}
        </div>
      </div>
    </div>
  );
}
