import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { buildCashForecast, forecastMonthKeys } from "./cash-forecast";
import { parseFundRow } from "./funds";

function loadEnv() {
  try {
    const env = readFileSync(".env.local", "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
    }
  } catch {
    /* no .env.local in CI */
  }
}

loadEnv();

const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

describe.skipIf(!hasSupabase)("buildCashForecast live data", () => {
  it("reports income and living per month", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const sb = createClient(url, key);
    const NOW = new Date("2026-09-24T12:00:00");
    const monthKeys = forecastMonthKeys(6, NOW);
    const last = monthKeys[monthKeys.length - 1]!;
    const endD = new Date(`${last}T12:00:00`);
    endD.setMonth(endD.getMonth() + 1);
    endD.setDate(0);
    const rangeEnd = endD.toISOString().slice(0, 10);

    const [{ data: planData }, { data: oblData }, { data: fundData }, { data: fx }] = await Promise.all([
      sb.from("plan").select("month, planned_amount, currency, categories(name, kind)").lte("month", rangeEnd).order("month"),
      sb
        .from("obligations")
        .select(
          "id, name, kind, currency, balance, apr, due_date, due_day, monthly_payment, min_payment, status, account_id",
        )
        .eq("status", "active"),
      sb.from("funds").select("*"),
      sb.from("fx_rates").select("rub_per_usd").order("rate_date", { ascending: false }).limit(1),
    ]);

    const spot = Number(fx?.[0]?.rub_per_usd ?? 84);
    function relCat(c: unknown) {
      if (!c || typeof c !== "object") return { name: "Uncategorized", kind: "expense" };
      const row = Array.isArray(c) ? c[0] : c;
      return {
        name: String((row as { name?: string }).name ?? "Uncategorized"),
        kind: String((row as { kind?: string }).kind ?? "expense"),
      };
    }

    const plans = (planData ?? []).map((p) => {
      const cat = relCat(p.categories);
      return {
        month: String(p.month).slice(0, 10),
        planned_amount: Number(p.planned_amount),
        currency: String(p.currency),
        categoryName: cat.name,
        categoryKind: cat.kind,
      };
    });

    const { months } = buildCashForecast(
      monthKeys,
      plans,
      oblData ?? [],
      (fundData ?? []).map((r) => parseFundRow(r as Record<string, unknown>)),
      spot,
      "RUB",
      "ALL",
      NOW,
    );

    for (const m of months.slice(1)) {
      expect(m.income).toBeCloseTo(months[0]!.income, -2);
    }
    expect(months[0]!.income).toBeGreaterThan(600_000);
    expect(months[0]!.living).toBeGreaterThan(100_000);

    console.log("\nCash Planner (6 mo, spot=" + spot + "):");
    for (const m of months) {
      console.log(
        `${m.label}: INCOME ₽${Math.round(m.income).toLocaleString("en-US")} LIVING ₽${Math.round(m.living).toLocaleString("en-US")} LOANS ₽${Math.round(m.loans).toLocaleString("en-US")} BUFFER ₽${Math.round(m.buffer).toLocaleString("en-US")}`,
      );
    }
  }, 30_000);
});
