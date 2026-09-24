import { accountIdForRef, accountNameForRef, isKnownAccountRef } from "@/lib/account-refs";
import type { BalanceMode } from "@/lib/import-terminal";
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
  parseOk?: boolean;
  accountId?: string;
  balanceMode?: BalanceMode;
  closingBalance?: number | null;
};

export type CommitResult = {
  inserted: number;
  skipped: number;
  total: number;
  balanceUpdated: boolean;
};

async function resolveAccountId(supabase: SupabaseClient, accountRef: string): Promise<string | null> {
  const directId = accountIdForRef(accountRef);
  if (directId) return directId;

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

function txDelta(row: CommitRow): number {
  if (row.type === "income") return row.amount;
  if (row.type === "expense") return -row.amount;
  return 0;
}

export async function commitImportRows(
  supabase: SupabaseClient,
  body: CommitPayload,
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

  if (!body.accountId) {
    const unknownRefs = [...new Set(rows.map((r) => r.accountRef).filter((ref) => !isKnownAccountRef(ref)))];
    if (unknownRefs.length > 0) {
      return {
        ok: false,
        status: 422,
        error: "Unknown accountRef — add mapping in lib/account-refs.ts",
        unresolved: unknownRefs,
      };
    }
  }

  const accountCache = new Map<string, string | null>();
  const categoryCache = new Map<string, string | null>();
  const payload: Record<string, unknown>[] = [];
  const unresolved: string[] = [];
  const insertedRows: CommitRow[] = [];

  for (const row of rows) {
    let accountId = body.accountId ?? null;
    if (!accountId) {
      if (!accountCache.has(row.accountRef)) {
        accountCache.set(row.accountRef, await resolveAccountId(supabase, row.accountRef));
      }
      accountId = accountCache.get(row.accountRef) ?? null;
    }

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
    insertedRows.push(row);
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
    .select("id, external_id");

  if (error) {
    return { ok: false, status: 500, error: "Supabase insert failed", detail: error.message };
  }

  const inserted = data?.length ?? 0;
  const insertedExternal = new Set((data ?? []).map((r) => String(r.external_id)));
  const newlyInserted = insertedRows.filter((r) => insertedExternal.has(r.externalId));

  let balanceUpdated = false;
  const balanceMode = body.balanceMode ?? "none";
  const resolvedAccountId =
    body.accountId ??
    (rows[0] ? accountCache.get(rows[0].accountRef) ?? null : null);

  if (balanceMode !== "none" && resolvedAccountId) {
    const { data: acc } = await supabase.from("accounts").select("balance").eq("id", resolvedAccountId).maybeSingle();
    if (acc) {
      const today = new Date().toISOString().slice(0, 10);
      if (balanceMode === "closing" && body.closingBalance != null) {
        await supabase
          .from("accounts")
          .update({ balance: body.closingBalance, balance_date: today })
          .eq("id", resolvedAccountId);
        balanceUpdated = true;
      } else if (balanceMode === "delta") {
        const delta = newlyInserted.reduce((s, row) => s + txDelta(row), 0);
        if (delta !== 0) {
          await supabase
            .from("accounts")
            .update({ balance: Number(acc.balance) + delta, balance_date: today })
            .eq("id", resolvedAccountId);
          balanceUpdated = true;
        }
      }
    }
  }

  return {
    ok: true,
    result: { inserted, skipped: payload.length - inserted, total: payload.length, balanceUpdated },
  };
}
