import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, toUsd } from "@/lib/fx";
import { fmtNative, formatTxDate, formatUpdatedDate, rub, usd } from "@/lib/format";
import { isCardType, type AccountRow } from "@/lib/liquidity";
import RateHeader from "@/app/components/RateHeader";
import AccountBadge from "@/app/components/AccountBadge";

type TxRow = {
  id: string;
  ts: string;
  amount: number;
  currency: string;
  type: string;
  merchant: string | null;
  notes: string | null;
  categories: { name: string } | { name: string }[] | null;
};

type OblRow = {
  id: string;
  name: string;
  kind: string;
  currency: string;
  balance: number;
  apr: number | null;
  monthly_payment: number | null;
  due_date: string | null;
};

function categoryName(categories: TxRow["categories"]) {
  if (!categories) return null;
  if (Array.isArray(categories)) return categories[0]?.name ?? null;
  return categories.name;
}

function txLabel(tx: TxRow) {
  return tx.merchant || categoryName(tx.categories) || tx.notes || tx.type;
}

function signedAmount(tx: TxRow) {
  const amt = Math.abs(Number(tx.amount));
  const prefix = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
  return `${prefix}${fmtNative(amt, tx.currency)}`;
}

export default async function AccountPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: account }, rates] = await Promise.all([
    supabase.from("accounts").select("*").eq("id", params.id).maybeSingle(),
    fetchFxRates(),
  ]);

  if (!account) notFound();

  const acct = account as AccountRow;
  const spot = getRubPerUsd(rates, "spot");
  const bal = Number(acct.balance);
  const isDebt = bal < 0;
  const usdEq = toUsd(Math.abs(bal), acct.currency, spot);
  const nativeSecondary =
    acct.currency === "RUB" ? usd(usdEq) : rub(usdEq * spot);

  const showObligations = isCardType(acct.type);
  const [{ data: txData }, { data: oblData }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, ts, amount, currency, type, merchant, notes, categories(name)")
      .eq("account_id", params.id)
      .order("ts", { ascending: false })
      .limit(100),
    showObligations
      ? supabase
          .from("obligations")
          .select("id, name, kind, currency, balance, apr, monthly_payment, due_date")
          .eq("account_id", params.id)
          .eq("status", "active")
      : Promise.resolve({ data: [] as OblRow[] }),
  ]);

  const txs = (txData ?? []) as TxRow[];
  const obligations = (oblData ?? []) as OblRow[];

  return (
    <div className="lf-wrap">
      <div className="lf-phone">
        <RateHeader title={acct.name} subtitle={formatUpdatedDate(acct.balance_date, true)} />

        <div className="lf-card lf-card--pad lf-card--shadow" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AccountBadge account={acct} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {acct.type} · {acct.zone}
              </div>
              <div className={`lf-mono${isDebt ? " lf-text-danger" : ""}`} style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
                {isDebt ? "−" : ""}
                {fmtNative(Math.abs(bal), acct.currency)}
              </div>
              <div className="lf-mono lf-text-faint" style={{ fontSize: 12, marginTop: 2 }}>
                {isDebt ? "−" : ""}
                {nativeSecondary}
              </div>
            </div>
          </div>
        </div>

        {obligations.length > 0 && (
          <>
            <div className="lf-sec-label">
              <span className="lf-sec-label__h">Related obligations</span>
            </div>
            <div className="lf-card lf-card--flush">
              {obligations.map((o) => (
                <div key={o.id} className="lf-row">
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 550 }}>{o.name}</div>
                    <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 3 }}>
                      {o.kind}
                      {o.apr != null ? ` · APR ${Number(o.apr).toFixed(0)}%` : ""}
                      {o.due_date ? ` · due ${formatTxDate(o.due_date).replace(/ \d{4}$/, "")}` : ""}
                    </div>
                  </div>
                  <div className="lf-mono lf-text-danger" style={{ fontSize: 14, fontWeight: 600, textAlign: "right" }}>
                    {fmtNative(Math.abs(Number(o.balance)), o.currency)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="lf-sec-label">
          <span className="lf-sec-label__h">Transactions</span>
          <Link href={`/history?account=${params.id}`} className="lf-sec-label__m">
            all →
          </Link>
        </div>

        {txs.length === 0 ? (
          <div className="lf-hint">No transactions for this account yet.</div>
        ) : (
          <div className="lf-card lf-card--flush">
            {txs.map((tx) => (
              <div key={tx.id} className="lf-row">
                <div style={{ minWidth: 0, paddingRight: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 550, lineHeight: 1.35 }}>{txLabel(tx)}</div>
                  <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 3 }}>
                    {formatTxDate(tx.ts)} · {tx.type}
                  </div>
                </div>
                <div className="lf-mono" style={{ fontSize: 14, fontWeight: 600, textAlign: "right", flexShrink: 0 }}>
                  {signedAmount(tx)}
                </div>
              </div>
            ))}
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
