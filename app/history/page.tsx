import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtNative, formatTxDate } from "@/lib/format";
import RateHeader from "@/app/components/RateHeader";

type TxRow = {
  id: string;
  ts: string;
  amount: number;
  currency: string;
  type: string;
  merchant: string | null;
  notes: string | null;
  account_id: string | null;
  accounts: { name: string } | { name: string }[] | null;
  categories: { name: string } | { name: string }[] | null;
};

function relName<T extends { name: string }>(rel: T | T[] | null) {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0]?.name ?? null;
  return rel.name;
}

function txLabel(tx: TxRow) {
  return tx.merchant || relName(tx.categories) || tx.notes || tx.type;
}

function signedAmount(tx: TxRow) {
  const amt = Math.abs(Number(tx.amount));
  const prefix = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
  return `${prefix}${fmtNative(amt, tx.currency)}`;
}

export default async function HistoryPage({ searchParams }: { searchParams: { account?: string } }) {
  const supabase = createClient();
  const accountFilter = searchParams.account;

  let accountName: string | null = null;
  if (accountFilter) {
    const { data } = await supabase.from("accounts").select("name").eq("id", accountFilter).maybeSingle();
    accountName = data?.name ?? null;
  }

  let query = supabase
    .from("transactions")
    .select("id, ts, amount, currency, type, merchant, notes, account_id, accounts(name), categories(name)")
    .order("ts", { ascending: false })
    .limit(200);

  if (accountFilter) query = query.eq("account_id", accountFilter);

  const { data: txData } = await query;
  const txs = (txData ?? []) as TxRow[];

  return (
    <div className="lf-wrap">
      <div className="lf-phone">
        <RateHeader title="History" subtitle={accountName ? accountName : "all accounts"} />

        <div className="lf-sec-label">
          <span className="lf-sec-label__h">Recent transactions</span>
          {accountFilter ? (
            <Link href="/history" className="lf-sec-label__m">
              all →
            </Link>
          ) : (
            <Link href="/convert" className="lf-sec-label__m">
              convert →
            </Link>
          )}
        </div>

        {txs.length === 0 ? (
          <div className="lf-hint">No transactions yet.</div>
        ) : (
          <div className="lf-card lf-card--flush">
            {txs.map((tx) => {
              const row = (
                <>
                  <div style={{ minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 550, lineHeight: 1.35 }}>{txLabel(tx)}</div>
                    <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 3 }}>
                      {formatTxDate(tx.ts)} · {tx.type}
                      {!accountFilter && relName(tx.accounts) ? ` · ${relName(tx.accounts)}` : ""}
                    </div>
                  </div>
                  <div className="lf-mono" style={{ fontSize: 14, fontWeight: 600, textAlign: "right", flexShrink: 0 }}>
                    {signedAmount(tx)}
                  </div>
                </>
              );

              if (tx.account_id && !accountFilter) {
                return (
                  <Link key={tx.id} href={`/account/${tx.account_id}`} className="lf-row lf-pay-row--link">
                    {row}
                  </Link>
                );
              }

              return (
                <div key={tx.id} className="lf-row">
                  {row}
                </div>
              );
            })}
          </div>
        )}

        <div className="lf-sec-label">
          <Link href="/" className="lf-sec-label__m">
            ← overview
          </Link>
        </div>
      </div>
    </div>
  );
}
