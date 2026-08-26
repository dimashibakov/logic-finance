import { NextRequest, NextResponse } from "next/server";
import { runAllChecks } from "@/lib/agent/checks";
import { syncAgentInsights } from "@/lib/agent/sync";
import { findUsReserveBalance } from "@/lib/taxes";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ObligationRow } from "@/lib/payments";
import type { WindDownItem } from "@/lib/winddown";
import type { AccountRow } from "@/lib/liquidity";
import type { FxRate } from "@/lib/fx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const [{ data: accData }, { data: oblData }, { data: fxData }, { data: wdData }] = await Promise.all([
      supabase.from("accounts").select("name, currency, type, balance, zone").eq("in_net_worth", true),
      supabase
        .from("obligations")
        .select("id, name, kind, currency, balance, apr, due_date, due_day, monthly_payment, status")
        .eq("status", "active"),
      supabase.from("fx_rates").select("rate_date, rub_per_usd, kind, notes").order("rate_date", { ascending: true }),
      supabase.from("joint_winddown").select("*"),
    ]);

    const accounts = (accData ?? []) as (Pick<AccountRow, "currency" | "type" | "balance" | "zone"> & { name: string })[];
    const usTaxReserveBalance = findUsReserveBalance(accounts);

    const insights = runAllChecks({
      accounts,
      obligations: (oblData ?? []) as ObligationRow[],
      fxRates: (fxData ?? []) as FxRate[],
      winddownItems: (wdData ?? []) as WindDownItem[],
      usTaxReserveBalance,
    });

    const result = await syncAgentInsights(supabase, insights);

    return NextResponse.json({ ok: true, insights: insights.length, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Agent cron failed" }, { status: 500 });
  }
}
