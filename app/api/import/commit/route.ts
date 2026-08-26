import { NextRequest, NextResponse } from "next/server";
import { accountLookupHint } from "@/lib/account-refs";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CommitRow = {
  date: string;
  amount: number;
  currency: "RUB" | "USD";
  type: "income" | "expense" | "conversion" | "transfer";
  merchant: string | null;
  accountRef: string;
  categoryGuess?: string;
  excluded?: boolean;
  externalId: string;
  rawDescription?: string;
};

type CommitPayload = {
  rows?: CommitRow[];
  controlOk?: boolean;
};

async function resolveAccountId(supabase: SupabaseClient, accountRef: string): Promise<string | null> {
  const hint = accountLookupHint(accountRef).toLowerCase();
  const { data } = await supabase.from("accounts").select("id, name").ilike("name", `%${hint}%`).limit(1);
  if (data?.[0]?.id) return data[0].id;

  const { data: all } = await supabase.from("accounts").select("id, name");
  const match = (all ?? []).find((a) => a.name.toLowerCase().includes(hint));
  return match?.id ?? null;
}

async function resolveCategoryId(supabase: SupabaseClient, name?: string): Promise<string | null> {
  if (!name) return null;
  const { data } = await supabase.from("categories").select("id").eq("name", name).maybeSingle();
  return data?.id ?? null;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  let body: CommitPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.controlOk === false) {
    return NextResponse.json({ error: "Control check failed — fix parser or statement before commit" }, { status: 422 });
  }

  const rows = (body.rows ?? []).filter((r) => !r.excluded);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const accountCache = new Map<string, string | null>();
  const categoryCache = new Map<string, string | null>();

  const payload: Record<string, unknown>[] = [];
  const unresolved: string[] = [];

  for (const row of rows) {
    if (!accountCache.has(row.accountRef)) {
      accountCache.set(row.accountRef, await resolveAccountId(supabase, row.accountRef));
    }
    const accountId = accountCache.get(row.accountRef);
    if (!accountId) {
      unresolved.push(row.accountRef);
      continue;
    }

    let categoryId: string | null = null;
    if (row.categoryGuess) {
      if (!categoryCache.has(row.categoryGuess)) {
        categoryCache.set(row.categoryGuess, await resolveCategoryId(supabase, row.categoryGuess));
      }
      categoryId = categoryCache.get(row.categoryGuess) ?? null;
    }

    payload.push({
      ts: row.date,
      amount: row.amount,
      currency: row.currency,
      type: row.type,
      merchant: row.merchant,
      category_id: categoryId,
      account_id: accountId,
      source: "statement",
      external_id: row.externalId,
      reconciled: false,
      notes: row.rawDescription ? `stmt: ${row.rawDescription.slice(0, 200)}` : null,
    });
  }

  if (unresolved.length > 0) {
    return NextResponse.json(
      { error: "Unknown accountRef — map accounts in Supabase", unresolved: [...new Set(unresolved)] },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("transactions")
    .upsert(payload, { onConflict: "account_id,external_id", ignoreDuplicates: true })
    .select("id");

  if (error) {
    return NextResponse.json({ error: "Supabase insert failed", detail: error.message }, { status: 500 });
  }

  const inserted = data?.length ?? 0;
  const skipped = payload.length - inserted;

  return NextResponse.json({ inserted, skipped, total: payload.length });
}
