import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { fmtNative, formatTxDate } from "@/lib/format";
import RateHeader from "@/app/components/RateHeader";
import HistoryDesktop from "@/app/components/desktop/HistoryDesktop";

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

type PageProps = { searchParams?: { account?: string; type?: string; month?: string } };

export default async function HistoryPage({ searchParams }: PageProps) {
  const supabase = createClient();
  const accountFilter = searchParams?.account;
  const typeFilter = searchParams?.type;
  const monthFilter = searchParams?.month;

  const [{ data: accData }, rates] = await Promise.all([
    supabase.from("accounts").select("id, name").order("name"),
    fetchFxRates(),
  ]);
  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);
  const accounts = (accData ?? []).map((a) => ({ id: a.id, name: a.name }));

  let accountName: string | null = null;
  if (accountFilter) {
    accountName = accounts.find((a) => a.id === accountFilter)?.name ?? null;
  }

  let query = supabase
    .from("transactions")
    .select("id, ts, amount, currency, type, merchant, notes, account_id, accounts(name), categories(name)")
    .order("ts", { ascending: false })
    .limit(200);

  if (accountFilter) query = query.eq("account_id", accountFilter);
  if (typeFilter) query = query.eq("type", typeFilter);
  if (monthFilter && /^\d{4}-\d{2}$/.test(monthFilter)) {
    query = query.gte("ts", `${monthFilter}-01`).lte("ts", `${monthFilter}-31`);
  }

  const { data: txData } = await query;
  const txs = ((txData ?? []) as TxRow[]).map((tx) => ({
    id: tx.id,
    ts: tx.ts,
    amount: Number(tx.amount),
    currency: tx.currency,
    type: tx.type,
    merchant: tx.merchant,
    notes: tx.notes,
    account_id: tx.account_id,
    accountName: relName(tx.accounts),
    categoryName: relName(tx.categories),
  }));

  return (
    <div className="lf-wrap lf-wrap--desktop">
      <HistoryDesktop
        spot={spot}
        eff={eff}
        txs={txs}
        accounts={accounts}
        initialFilters={{ account: accountFilter, type: typeFilter, month: monthFilter }}
      />
      <div className="lf-phone lf-page-mobile">
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
              const label = tx.merchant || tx.categoryName || tx.notes || tx.type;
              const amt = Math.abs(Number(tx.amount));
              const prefix = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
              const amountStr = `${prefix}${fmtNative(amt, tx.currency)}`;
              const row = (
                <>
                  <div style={{ minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 550, lineHeight: 1.35 }}>{label}</div>
                    <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 3 }}>
                      {formatTxDate(tx.ts)} · {tx.type}
                      {!accountFilter && tx.accountName ? ` · ${tx.accountName}` : ""}
                    </div>
                  </div>
                  <div className="lf-mono" style={{ fontSize: 14, fontWeight: 600, textAlign: "right", flexShrink: 0 }}>
                    {amountStr}
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
