import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ZM_DIFF_URL = "https://api.zenmoney.ru/v8/diff/";
const DAYS_120_SEC = 120 * 24 * 60 * 60;

type ZmInstrument = { id: number; shortTitle: string };
type ZmAccount = { id: string; title: string };
type ZmTag = { id: string; title: string };
type ZmMerchant = { id: string; title: string };
type ZmTransaction = {
  id: string;
  deleted?: boolean;
  date: string;
  income: number;
  outcome: number;
  incomeInstrument: number;
  outcomeInstrument: number;
  opIncome?: number | null;
  opOutcome?: number | null;
  opIncomeInstrument?: number | null;
  opOutcomeInstrument?: number | null;
  payee?: string | null;
  comment?: string | null;
  tag?: string[] | null;
  merchant?: string | null;
};

type ZmDiffResponse = {
  serverTimestamp: number;
  instrument?: ZmInstrument[];
  account?: ZmAccount[];
  tag?: ZmTag[];
  merchant?: ZmMerchant[];
  transaction?: ZmTransaction[];
};

type TxRow = {
  ts: string;
  amount: number;
  currency: "RUB" | "USD";
  type: "income" | "expense" | "conversion" | "transfer";
  merchant: string | null;
  category_id: null;
  notes: string | null;
  external_id: string;
  source: "zenmoney";
  reconciled: false;
};

function supabaseClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

function buildInstrumentMap(items: ZmInstrument[] | undefined) {
  const map = new Map<number, string>();
  for (const item of items ?? []) map.set(item.id, item.shortTitle);
  return map;
}

function buildStringMap<T extends { id: string; title: string }>(items: T[] | undefined) {
  const map = new Map<string, string>();
  for (const item of items ?? []) map.set(item.id, item.title);
  return map;
}

function txType(tx: ZmTransaction): TxRow["type"] | null {
  const { income, outcome, incomeInstrument, outcomeInstrument } = tx;
  if (income > 0 && outcome === 0) return "income";
  if (outcome > 0 && income === 0) return "expense";
  if (income > 0 && outcome > 0) {
    if (incomeInstrument !== outcomeInstrument) return "conversion";
    return "transfer";
  }
  return null;
}

function side(
  tx: ZmTransaction,
  which: "income" | "outcome"
): { amount: number; instrumentId: number | null | undefined } {
  if (which === "outcome") {
    return {
      amount: tx.opOutcome != null ? tx.opOutcome : tx.outcome,
      instrumentId: tx.opOutcome != null ? tx.opOutcomeInstrument : tx.outcomeInstrument,
    };
  }
  return {
    amount: tx.opIncome != null ? tx.opIncome : tx.income,
    instrumentId: tx.opIncome != null ? tx.opIncomeInstrument : tx.incomeInstrument,
  };
}

function mapTransaction(
  tx: ZmTransaction,
  instruments: Map<number, string>,
  merchants: Map<string, string>,
  tags: Map<string, string>
): { row: TxRow | null; skippedCurrency: boolean } {
  if (tx.deleted) return { row: null, skippedCurrency: false };

  const type = txType(tx);
  if (!type) return { row: null, skippedCurrency: false };

  const chosen = type === "income" ? side(tx, "income") : side(tx, "outcome");
  const instrumentId = chosen.instrumentId;
  const shortTitle = instrumentId != null ? instruments.get(instrumentId) : undefined;

  if (!shortTitle || (shortTitle !== "RUB" && shortTitle !== "USD")) {
    return { row: null, skippedCurrency: true };
  }

  const amount = chosen.amount;
  if (amount <= 0) return { row: null, skippedCurrency: false };

  const merchantTitle = tx.merchant ? merchants.get(tx.merchant) : undefined;
  const merchant = merchantTitle || tx.payee || null;

  const tagNames = (tx.tag ?? []).map((id) => tags.get(id)).filter((t): t is string => !!t);
  let notes = tagNames.length ? `zen: ${tagNames.join(", ")}` : "";
  if (tx.comment) notes = notes ? `${notes} — ${tx.comment}` : tx.comment;

  return {
    row: {
      ts: tx.date,
      amount,
      currency: shortTitle,
      type,
      merchant,
      category_id: null,
      notes: notes || null,
      external_id: tx.id,
      source: "zenmoney",
      reconciled: false,
    },
    skippedCurrency: false,
  };
}

async function upsertSyncState(supabase: ReturnType<typeof supabaseClient>, cursor: string) {
  const now = new Date().toISOString();
  const { data: existing } = await supabase.from("sync_state").select("id").eq("connector", "zenmoney").maybeSingle();

  const payload = { connector: "zenmoney", cursor, last_synced_at: now, status: "ok" };

  if (existing?.id) {
    await supabase.from("sync_state").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("sync_state").insert(payload);
  }
}

export async function GET(request: NextRequest) {
  const syncSecret = process.env.SYNC_SECRET;
  const zenToken = process.env.ZENMONEY_TOKEN;

  if (!syncSecret || !zenToken) {
    return NextResponse.json({ error: "Missing server configuration" }, { status: 500 });
  }

  const key = request.nextUrl.searchParams.get("key");
  if (key !== syncSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseClient();
  const nowUnix = Math.floor(Date.now() / 1000);

  const { data: syncState } = await supabase.from("sync_state").select("cursor").eq("connector", "zenmoney").maybeSingle();
  const cursor = syncState?.cursor ? parseInt(syncState.cursor, 10) : nowUnix - DAYS_120_SEC;

  const zmRes = await fetch(ZM_DIFF_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${zenToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      currentClientTimestamp: nowUnix,
      serverTimestamp: Number.isFinite(cursor) ? cursor : nowUnix - DAYS_120_SEC,
    }),
  });

  if (!zmRes.ok) {
    const body = await zmRes.text();
    return NextResponse.json({ error: "ZenMoney API error", status: zmRes.status, body }, { status: 502 });
  }

  const diff = (await zmRes.json()) as ZmDiffResponse;
  const instruments = buildInstrumentMap(diff.instrument);
  const accountMap = buildStringMap(diff.account);
  const tags = buildStringMap(diff.tag);
  const merchants = buildStringMap(diff.merchant);
  void accountMap;

  const transactions = diff.transaction ?? [];
  const byType: Record<string, number> = { income: 0, expense: 0, conversion: 0, transfer: 0 };
  let skippedOtherCurrency = 0;
  const rows: TxRow[] = [];

  for (const tx of transactions) {
    const { row, skippedCurrency } = mapTransaction(tx, instruments, merchants, tags);
    if (skippedCurrency) {
      skippedOtherCurrency++;
      continue;
    }
    if (!row) continue;
    byType[row.type]++;
    rows.push(row);
  }

  let upserted = 0;
  if (rows.length > 0) {
    const { data, error } = await supabase
      .from("transactions")
      .upsert(rows, { onConflict: "source,external_id" })
      .select("id");

    if (error) {
      return NextResponse.json({ error: "Supabase upsert failed", detail: error.message }, { status: 500 });
    }
    upserted = data?.length ?? rows.length;
  }

  await upsertSyncState(supabase, String(diff.serverTimestamp));

  return NextResponse.json({
    fetched: transactions.length,
    upserted,
    byType,
    skippedOtherCurrency,
    serverTimestamp: diff.serverTimestamp,
  });
}
