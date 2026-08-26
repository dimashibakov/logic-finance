import { createHash, randomUUID } from "crypto";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ACCOUNT_REF_MAP } from "@/lib/account-refs";
import { commitImportRows, type CommitRow } from "@/lib/import-commit";
import { extractDocumentText } from "@/lib/pdf-extract";
import { detectBank, parseByBank } from "./index";
import { makeExternalId } from "./utils";

const REAL_DIR = join(__dirname, "__fixtures__/real");

function listRealStatements(): string[] {
  if (!existsSync(REAL_DIR)) return [];
  return readdirSync(REAL_DIR).filter((f) => !f.startsWith(".") && f !== ".gitkeep");
}

const hasRealFixtures = listRealStatements().length > 0;

function mockAccounts() {
  return Object.entries(ACCOUNT_REF_MAP).map(([ref, name]) => ({
    id: createHash("sha1").update(ref).digest("hex").slice(0, 8),
    name,
  }));
}

function createMockSupabase(accounts: { id: string; name: string }[]) {
  const keys = new Set<string>();

  return {
    from(table: string) {
      if (table === "accounts") {
        return {
          select(_cols: string) {
            return {
              eq(_col: string, val: string) {
                return {
                  maybeSingle: async () => ({ data: accounts.find((a) => a.name === val) ?? null, error: null }),
                };
              },
              ilike(_col: string, val: string) {
                return {
                  limit: async (_n: number) => {
                    const match = accounts.find((a) => a.name.toLowerCase() === val.toLowerCase());
                    return { data: match ? [match] : [], error: null };
                  },
                };
              },
            };
          },
        };
      }
      if (table === "categories") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        };
      }
      if (table === "transactions") {
        return {
          upsert(rows: { account_id: string; external_id: string }[], opts: { ignoreDuplicates: boolean }) {
            return {
              select: async () => {
                const inserted: { id: string }[] = [];
                for (const row of rows) {
                  const key = `${row.account_id}|${row.external_id}`;
                  if (opts.ignoreDuplicates && keys.has(key)) continue;
                  keys.add(key);
                  inserted.push({ id: randomUUID() });
                }
                return { data: inserted, error: null };
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;
}

function rowsFromParse(result: ReturnType<typeof parseByBank>): CommitRow[] {
  return result.txs
    .filter((tx) => !tx.excluded)
    .map((tx) => ({
      date: tx.date,
      amount: tx.amount,
      currency: tx.currency,
      type: tx.type,
      merchant: tx.merchant ?? null,
      accountRef: tx.accountRef,
      categoryGuess: tx.categoryGuess,
      excluded: tx.excluded,
      externalId: tx.externalId,
      rawDescription: tx.rawDescription,
    }));
}

describe("externalId stability", () => {
  it("stable sha1 hash for same inputs", () => {
    const a = makeExternalId("sber-5623", "2026-08-15", 500, "WHOOSH", 0);
    const b = makeExternalId("sber-5623", "2026-08-15", 500, "WHOOSH", 0);
    const c = makeExternalId("sber-5623", "2026-08-15", 500, "WHOOSH", 1);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(40);
  });
});

describe.skipIf(!hasRealFixtures)("idempotency on real statements", () => {
  for (const filename of listRealStatements()) {
    it(`double commit of ${filename} inserts once`, async () => {
      const supabase = createMockSupabase(mockAccounts());
      const buffer = readFileSync(join(REAL_DIR, filename));
      const text = await extractDocumentText(buffer, filename);
      const bank = detectBank(text, filename)!;
      const result = parseByBank(bank, text);
      const rows = rowsFromParse(result);

      const first = await commitImportRows(supabase, { controlOk: result.control.ok, rows });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.result.inserted).toBeGreaterThan(0);

      const secondParse = parseByBank(bank, text);
      const secondRows = rowsFromParse(secondParse);
      expect(secondRows.map((r) => r.externalId)).toEqual(rows.map((r) => r.externalId));

      const second = await commitImportRows(supabase, { controlOk: result.control.ok, rows: secondRows });
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.result.inserted).toBe(0);
      expect(second.result.skipped).toBe(second.result.total);
    });
  }
});

describe("idempotency harness", () => {
  it("skips when real/ is empty (CI-safe)", () => {
    if (hasRealFixtures) return;
    expect(listRealStatements()).toHaveLength(0);
  });
});
