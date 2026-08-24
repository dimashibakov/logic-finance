import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CommitRow = {
  ts: string;
  amount: number;
  currency: "RUB" | "USD";
  type: "income" | "expense" | "conversion" | "transfer";
  merchant: string | null;
  bank: string;
};

function externalId(bank: string, ts: string, amount: number, merchant: string | null) {
  return createHash("sha256").update(`${bank}|${ts}|${amount}|${merchant ?? ""}`).digest("hex").slice(0, 40);
}

export async function POST(request: NextRequest) {
  let body: { rows?: CommitRow[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rows = body.rows ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const payload = rows.map((row) => ({
    ts: row.ts,
    amount: row.amount,
    currency: row.currency,
    type: row.type,
    merchant: row.merchant,
    category_id: null,
    source: "statement" as const,
    external_id: externalId(row.bank, row.ts, row.amount, row.merchant),
    reconciled: false,
  }));

  const { data, error } = await supabase
    .from("transactions")
    .upsert(payload, { onConflict: "source,external_id", ignoreDuplicates: true })
    .select("id");

  if (error) {
    return NextResponse.json({ error: "Supabase insert failed", detail: error.message }, { status: 500 });
  }

  const inserted = data?.length ?? 0;
  const skipped = rows.length - inserted;

  return NextResponse.json({ inserted, skipped, total: rows.length });
}
