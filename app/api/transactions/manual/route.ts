import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  account_id: string;
  type: "income" | "expense" | "conversion" | "transfer";
  amount: number;
  currency: "RUB" | "USD";
  category_id?: string | null;
  merchant?: string | null;
  ts: string;
  notes?: string | null;
  fx_rate?: number | null;
  fee?: number | null;
  counterparty_account_id?: string | null;
};

function externalId(accountId: string, ts: string, amount: number, type: string) {
  return createHash("sha1").update(`manual|${accountId}|${ts}|${amount}|${type}|v1`).digest("hex");
}

function balanceDelta(type: Body["type"], amount: number) {
  if (type === "income") return amount;
  if (type === "expense") return -amount;
  if (type === "conversion") return type === "conversion" ? -amount : 0;
  return 0;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const body = (await request.json()) as Body;
  if (!body.account_id || !body.ts || !body.amount || !body.type || !body.currency) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: dup } = await supabase
    .from("transactions")
    .select("id")
    .eq("account_id", body.account_id)
    .eq("ts", body.ts)
    .eq("amount", body.amount)
    .limit(1);

  if (dup && dup.length > 0) {
    return NextResponse.json({ error: "Possible duplicate", duplicate: true }, { status: 409 });
  }

  const ext = externalId(body.account_id, body.ts, body.amount, body.type);
  const txRow = {
    ts: body.ts,
    amount: body.amount,
    currency: body.currency,
    type: body.type,
    account_id: body.account_id,
    category_id: body.type === "conversion" || body.type === "transfer" ? null : body.category_id ?? null,
    merchant: body.merchant ?? null,
    source: "manual" as const,
    external_id: ext,
    reconciled: false,
    fx_rate: body.fx_rate ?? null,
    fee: body.fee ?? null,
    notes: body.notes ?? null,
  };

  const { error: txErr } = await supabase.from("transactions").upsert(txRow, {
    onConflict: "account_id,external_id",
    ignoreDuplicates: true,
  });

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  const { data: acc } = await supabase.from("accounts").select("balance").eq("id", body.account_id).single();
  const current = Number(acc?.balance ?? 0);
  let delta = balanceDelta(body.type, body.amount);
  if (body.type === "conversion" && body.currency === "RUB") delta = -body.amount;

  await supabase
    .from("accounts")
    .update({ balance: current + delta, balance_date: body.ts })
    .eq("id", body.account_id);

  return NextResponse.json({ ok: true, external_id: ext });
}
