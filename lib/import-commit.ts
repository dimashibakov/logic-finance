import { accountNameForRef, isKnownAccountRef } from "@/lib/account-refs";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CommitRow = {
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

export type CommitPayload = {
  rows?: CommitRow[];
  controlOk?: boolean;
  /** Set true only when every uploaded file parsed successfully (no partial import). */
  parseOk?: boolean;
};

export type CommitResult = {
  inserted: number;
  skipped: number;
  total: number;
};

async function resolveAccountId(supabase: SupabaseClient, accountRef: string): Promise<string | null> {
  const name = accountNameForRef(accountRef);
  if (!name) return null;

  const { data: exact } = await supabase.from("accounts").select("id, name").eq("name", name).maybeSingle();
  if (exact?.id) return exact.id;

  const { data: fuzzy } = await supabase.from("accounts").select("id, name").ilike("name", name).limit(1);
  return fuzzy?.[0]?.id ?? null;
}

async function resolveCategoryId(supabase: SupabaseClient, name?: string): Promise<string | null> {
  if (!name) return null;
  const { data } = await supabase.from("categories").select("id").eq("name", name).maybeSingle();
  return data?.id ?? null;
}

export async function commitImportRows(
  supabase: SupabaseClient,
  body: CommitPayload
): Promise<
  | { ok: true; result: CommitResult }
  | { ok: false; status: number; error: string; unresolved?: string[]; detail?: string }
> {
  if (body.parseOk === false) {
    return { ok: false, status: 422, error: "Parse incomplete — fix errors and re-parse before saving" };
  }

  if (body.controlOk === false) {
    return { ok: false, status: 422, error: "Control check failed — fix parser or statement before commit" };
  }

  const rows = (body.rows ?? []).filter((r) => !r.excluded);
  if (rows.length === 0) {
    return { ok: false, status: 400, error: "No rows to import" };
  }

  const unknownRefs = [...new Set(rows.map((r) => r.accountRef).filter((ref) => !isKnownAccountRef(ref)))];
  if (unknownRefs.length > 0) {
    return {
      ok: false,
      status: 422,
      error: "Unknown accountRef — add mapping in lib/account-refs.ts",
      unresolved: unknownRefs,
    };
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
    return {
      ok: false,
      status: 422,
      error: `Account not found in Supabase for ref(s): ${[...new Set(unresolved)].join(", ")}`,
      unresolved: [...new Set(unresolved)],
    };
  }

  const { data, error } = await supabase
    .from("transactions")
    .upsert(payload, { onConflict: "account_id,external_id", ignoreDuplicates: true })
    .select("id");

  if (error) {
    return { ok: false, status: 500, error: "Supabase insert failed", detail: error.message };
  }

  const inserted = data?.length ?? 0;
  return { ok: true, result: { inserted, skipped: payload.length - inserted, total: payload.length } };
}
