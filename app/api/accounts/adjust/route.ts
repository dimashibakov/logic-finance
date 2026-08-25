import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  account_id: string;
  actual_balance: number;
  ts: string;
  write_transaction?: boolean;
};

function externalId(accountId: string, ts: string, delta: number) {
  return createHash("sha1").update(`recon|${accountId}|${ts}|${delta}|v1`).digest("hex");
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Body;
  if (!body.account_id || body.actual_balance == null || !body.ts) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: acc, error: accErr } = await supabase
    .from("accounts")
    .select("id, balance, currency")
    .eq("id", body.account_id)
    .single();

  if (accErr || !acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const current = Number(acc.balance);
  const delta = body.actual_balance - current;
  const writeTx = body.write_transaction !== false;

  if (writeTx && Math.abs(delta) > 0.001) {
    const { data: cat } = await supabase.from("categories").select("id").eq("name", "Reconciliation").maybeSingle();
    const type = delta >= 0 ? "income" : "expense";
    await supabase.from("transactions").upsert(
      {
        ts: body.ts,
        amount: Math.abs(delta),
        currency: acc.currency,
        type,
        account_id: body.account_id,
        category_id: cat?.id ?? null,
        source: "manual",
        external_id: externalId(body.account_id, body.ts, delta),
        reconciled: true,
        notes: "Balance reconciliation",
      },
      { onConflict: "account_id,external_id", ignoreDuplicates: true }
    );
  }

  await supabase
    .from("accounts")
    .update({ balance: body.actual_balance, balance_date: body.ts })
    .eq("id", body.account_id);

  return NextResponse.json({ ok: true, delta, previous: current, actual: body.actual_balance });
}
