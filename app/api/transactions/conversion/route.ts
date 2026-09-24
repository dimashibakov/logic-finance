import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  from_account_id: string;
  to_account_id: string;
  from_amount: number;
  to_amount: number;
  ts: string;
  fx_rate: number;
  fee?: number | null;
  notes?: string | null;
};

function externalId(accountId: string, ts: string, amount: number, suffix: string) {
  return createHash("sha1").update(`conversion|${accountId}|${ts}|${amount}|${suffix}|v1`).digest("hex");
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const body = (await request.json()) as Body;

  if (!body.from_account_id || !body.to_account_id || !body.ts || !body.from_amount || !body.to_amount || !body.fx_rate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (body.from_account_id === body.to_account_id) {
    return NextResponse.json({ error: "Accounts must differ" }, { status: 400 });
  }

  const [{ data: fromAcc }, { data: toAcc }] = await Promise.all([
    supabase.from("accounts").select("id, currency, balance").eq("id", body.from_account_id).single(),
    supabase.from("accounts").select("id, currency, balance").eq("id", body.to_account_id).single(),
  ]);

  if (!fromAcc || !toAcc) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (fromAcc.currency === toAcc.currency) {
    return NextResponse.json({ error: "Conversion requires different currencies" }, { status: 400 });
  }

  const note = body.notes ?? "FX conversion";
  const fee = body.fee ?? null;

  const outRow = {
    ts: body.ts,
    amount: body.from_amount,
    currency: fromAcc.currency,
    type: "conversion" as const,
    account_id: body.from_account_id,
    category_id: null,
    merchant: "FX conversion",
    source: "manual" as const,
    external_id: externalId(body.from_account_id, body.ts, body.from_amount, "out"),
    reconciled: false,
    fx_rate: body.fx_rate,
    fee,
    notes: note,
  };

  const inRow = {
    ts: body.ts,
    amount: body.to_amount,
    currency: toAcc.currency,
    type: "conversion" as const,
    account_id: body.to_account_id,
    category_id: null,
    merchant: "FX conversion",
    source: "manual" as const,
    external_id: externalId(body.to_account_id, body.ts, body.to_amount, "in"),
    reconciled: false,
    fx_rate: body.fx_rate,
    fee: null,
    notes: note,
  };

  const { error: outErr } = await supabase.from("transactions").upsert(outRow, {
    onConflict: "account_id,external_id",
    ignoreDuplicates: false,
  });
  if (outErr) return NextResponse.json({ error: outErr.message }, { status: 500 });

  const { error: inErr } = await supabase.from("transactions").upsert(inRow, {
    onConflict: "account_id,external_id",
    ignoreDuplicates: false,
  });
  if (inErr) return NextResponse.json({ error: inErr.message }, { status: 500 });

  const fromBal = Number(fromAcc.balance) - body.from_amount;
  const toBal = Number(toAcc.balance) + body.to_amount;

  await Promise.all([
    supabase.from("accounts").update({ balance: fromBal, balance_date: body.ts }).eq("id", body.from_account_id),
    supabase.from("accounts").update({ balance: toBal, balance_date: body.ts }).eq("id", body.to_account_id),
  ]);

  return NextResponse.json({ ok: true });
}
