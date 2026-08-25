import { supabase } from "@/lib/supabase";
import { rub, usd } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";
import RateHeader from "../components/RateHeader";

type CatJoin = { name: string; kind: string } | { name: string; kind: string }[] | null;
type Tx = { amount: number; currency: string; type: string; ts: string; category_id: string | null; source: string | null; categories: CatJoin };
type PlanRow = { planned_amount: number; currency: string; category_id: string; categories: CatJoin };

function catName(c: CatJoin) {
  if (!c) return "Uncategorized";
  return Array.isArray(c) ? c[0]?.name ?? "Uncategorized" : c.name;
}

function catKind(c: CatJoin) {
  if (!c) return "expense";
  return Array.isArray(c) ? c[0]?.kind ?? "expense" : c.kind;
}

function monthLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function monthEnd(monthStart: string) {
  const d = new Date(`${monthStart}T12:00:00`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

function monthKey(tsOrDate: string) {
  return `${tsOrDate.slice(0, 7)}-01`;
}

async function resolveDefaultMonth() {
  const [{ data: planRows }, { data: txRows }] = await Promise.all([
    supabase.from("plan").select("month"),
    supabase.from("transactions").select("ts").in("source", ["statement", "manual"]),
  ]);
  const months = new Set<string>();
  for (const p of planRows ?? []) months.add(String(p.month).slice(0, 10));
  for (const t of txRows ?? []) months.add(monthKey(t.ts));
  if (months.size === 0) return "2026-09-01";
  return [...months].sort().reverse()[0]!;
}

function fmtAmt(n: number, currency: string) {
  return currency === "USD" ? usd(n) : rub(n);
}

function fmtDelta(n: number, currency: string) {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${fmtAmt(Math.abs(n), currency)}`;
}

type CatLine = { name: string; fact: number; plan: number; currency: string };

function CategoryBlock({ lines }: { lines: CatLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div style={{ ...S.cardPad, marginBottom: 10 }}>
      {lines.map((line, idx) => {
        const delta = line.fact - line.plan;
        const over = delta > 0 && line.plan > 0;
        const pct = line.plan > 0 ? Math.min(100, Math.round((line.fact / line.plan) * 100)) : line.fact > 0 ? 100 : 0;
        const oneOff = /travel|ticket|shop|marketplace/i.test(line.name);
        return (
          <div key={`${line.currency}:${line.name}`} style={{ marginTop: idx === 0 ? 0 : 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, gap: 8 }}>
              <span>{line.name}</span>
              <span style={S.mono}>
                {fmtAmt(line.fact, line.currency)} <span style={{ color: C.faint }}>/ {fmtAmt(line.plan, line.currency)}</span>
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 4, background: C.line2, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: over ? C.debt : C.accent }} />
            </div>
            {delta !== 0 && (
              <div style={{ fontSize: 11.5, color: C.faint, lineHeight: 1.5, marginTop: 4 }}>
                <span style={{ color: over ? C.debt : delta < 0 ? C.up : C.faint }}>{fmtDelta(delta, line.currency)}</span>
                {oneOff && over && " · one-off spike"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IncomeSection({ currency, fact, plan }: { currency: "RUB" | "USD"; fact: number; plan: number }) {
  const delta = fact - plan;
  return (
    <div style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 10 }}>
      <div style={S.row}>
        <div style={{ fontSize: 13.5, color: C.ink }}>Income · {currency}</div>
        <div style={{ ...S.mono, fontSize: 14, fontWeight: 600 }}>{fmtAmt(fact, currency)}</div>
      </div>
      <div style={{ ...S.row, borderBottom: "none" }}>
        <div>
          <div style={{ fontSize: 13.5, color: C.sub }}>Income plan</div>
          {delta !== 0 && (
            <div style={{ ...S.mono, fontSize: 10.5, color: C.faint, marginTop: 2 }}>
              dev <span style={{ color: delta < 0 ? C.debt : C.up }}>{fmtDelta(delta, currency)}</span>
            </div>
          )}
        </div>
        <div style={{ ...S.mono, fontSize: 14, color: C.faint }}>{fmtAmt(plan, currency)}</div>
      </div>
    </div>
  );
}

export default async function PlanPage() {
  const month = await resolveDefaultMonth();
  const monthEndStr = monthEnd(month);
  const label = monthLabel(month);

  const [{ data: txData }, { data: planData }] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, currency, type, ts, category_id, source, categories(name, kind)")
      .gte("ts", month)
      .lte("ts", monthEndStr)
      .in("source", ["statement", "manual"]),
    supabase.from("plan").select("planned_amount, currency, category_id, categories(name, kind)").eq("month", month),
  ]);

  const txs = (txData ?? []) as Tx[];
  const plans = (planData ?? []) as PlanRow[];

  const incomeFact = { RUB: 0, USD: 0 };
  const incomePlan = { RUB: 0, USD: 0 };
  const factByKey = new Map<string, number>();
  const planByKey = new Map<string, number>();

  for (const tx of txs) {
    const name = catName(tx.categories);
    if (name === "Reconciliation") continue;
    const cur = tx.currency as "RUB" | "USD";
    const amt = Math.abs(Number(tx.amount));
    if (tx.type === "income") {
      incomeFact[cur] += amt;
    } else if (tx.type === "expense") {
      const key = `${cur}:${name}`;
      factByKey.set(key, (factByKey.get(key) ?? 0) + amt);
    }
  }

  for (const p of plans) {
    const cur = p.currency as "RUB" | "USD";
    const name = catName(p.categories);
    const amt = Number(p.planned_amount);
    if (catKind(p.categories) === "income") {
      incomePlan[cur] += amt;
    } else {
      const key = `${cur}:${name}`;
      planByKey.set(key, (planByKey.get(key) ?? 0) + amt);
    }
  }

  const expenseKeys = [...new Set([...factByKey.keys(), ...planByKey.keys()])].sort((a, b) => {
    const factA = factByKey.get(a) ?? 0;
    const factB = factByKey.get(b) ?? 0;
    return factB - factA;
  });

  const rubExpenses: CatLine[] = [];
  const usdExpenses: CatLine[] = [];
  for (const key of expenseKeys) {
    const [cur, ...nameParts] = key.split(":");
    const name = nameParts.join(":");
    const line = { name, fact: factByKey.get(key) ?? 0, plan: planByKey.get(key) ?? 0, currency: cur };
    if (cur === "USD") usdExpenses.push(line);
    else rubExpenses.push(line);
  }

  const hasRubIncome = incomeFact.RUB > 0 || incomePlan.RUB > 0;
  const hasUsdIncome = incomeFact.USD > 0 || incomePlan.USD > 0;
  const hasAnyData = hasRubIncome || hasUsdIncome || rubExpenses.length > 0 || usdExpenses.length > 0;

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <RateHeader title="Plan" subtitle={label} />

        <div style={S.secLabel}>
          <span style={S.eyebrow}>Plan / Fact · {label}</span>
        </div>

        {hasRubIncome && <IncomeSection currency="RUB" fact={incomeFact.RUB} plan={incomePlan.RUB} />}
        {hasUsdIncome && <IncomeSection currency="USD" fact={incomeFact.USD} plan={incomePlan.USD} />}

        {rubExpenses.length > 0 && (
          <>
            <div style={S.secLabel}>
              <span style={S.eyebrow}>Expenses · RUB</span>
            </div>
            <CategoryBlock lines={rubExpenses} />
          </>
        )}

        {usdExpenses.length > 0 && (
          <>
            <div style={S.secLabel}>
              <span style={S.eyebrow}>Expenses · USD</span>
            </div>
            <CategoryBlock lines={usdExpenses} />
          </>
        )}

        {!hasAnyData && (
          <div style={{ ...S.cardPad, fontSize: 13, color: C.sub }}>No plan or transaction data for {label}.</div>
        )}

        {month === "2026-08-01" && (
          <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5, margin: "12px 2px" }}>
            Large deviations may be one-off (move). September is the first baseline month with plan rows.
          </div>
        )}
      </div>
    </div>
  );
}
