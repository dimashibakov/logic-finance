"use client";

import Link from "next/link";
import { DesktopPageMeta } from "./DesktopShellContext";
import DataTable from "./DataTable";
import AccountBadge from "../AccountBadge";
import { useAddSheet } from "../AddSheetContext";
import { fmtNative, formatTxDate, formatUpdatedDate } from "@/lib/format";
import { isCardType, type AccountRow } from "@/lib/liquidity";

type TxRow = {
  id: string;
  ts: string;
  amount: number;
  currency: string;
  type: string;
  merchant: string | null;
  notes: string | null;
  categoryName?: string | null;
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

type Props = {
  account: AccountRow;
  spot: number;
  eff: number;
  txs: TxRow[];
  obligations: OblRow[];
  nativeSecondary: string;
};

function txLabel(tx: TxRow) {
  return tx.merchant || tx.categoryName || tx.notes || tx.type;
}

function signedAmount(tx: TxRow) {
  const amt = Math.abs(Number(tx.amount));
  const prefix = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
  return `${prefix}${fmtNative(amt, tx.currency)}`;
}

export default function AccountDesktop({ account, spot, eff, txs, obligations, nativeSecondary }: Props) {
  const { openView } = useAddSheet();
  const bal = Number(account.balance);
  const isDebt = bal < 0;

  return (
    <div className="lf-page-desktop">
      <DesktopPageMeta title={account.name} spot={spot} eff={eff} />
      <div className="lf-desktop-page">
        <section className="lf-desktop-panel">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <AccountBadge account={account} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {account.type} · {account.zone}
              </div>
              <div className={`lf-mono${isDebt ? " lf-text-danger" : ""}`} style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
                {isDebt ? "−" : ""}
                {fmtNative(Math.abs(bal), account.currency)}
              </div>
              <div className="lf-mono lf-text-faint" style={{ fontSize: 12, marginTop: 2 }}>
                {isDebt ? "−" : ""}
                {nativeSecondary}
              </div>
              <div className="lf-bento-sub" style={{ marginTop: 6 }}>
                {formatUpdatedDate(account.updated_at, true)}
              </div>
            </div>
            <button
              type="button"
              className="lf-desktop-btn lf-bento-pressable lf-mono"
              onClick={() => openView("balance")}
            >
              ADJUST BALANCE
            </button>
          </div>
        </section>

        <div className="lf-desktop-two" style={{ marginTop: 18 }}>
          <section>
            <div className="lf-sec-label">
              <span className="lf-sec-label__h">Recent transactions</span>
              <Link href={`/history?account=${account.id}`} className="lf-sec-label__m">
                all →
              </Link>
            </div>
            {txs.length === 0 ? (
              <p className="lf-bento-sub">No transactions for this account yet.</p>
            ) : (
              <DataTable flush className="lf-data-table--dense">
                <thead>
                  <tr>
                    <th>DESCRIPTION</th>
                    <th className="lf-bento-r">DATE</th>
                    <th className="lf-bento-r">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <div style={{ fontWeight: 550 }}>{txLabel(tx)}</div>
                        <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, marginTop: 2 }}>
                          {tx.type}
                        </div>
                      </td>
                      <td className="lf-bento-num lf-bento-sub">{formatTxDate(tx.ts)}</td>
                      <td className="lf-bento-num lf-mono">{signedAmount(tx)}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </section>

          <section>
            {obligations.length > 0 && (
              <>
                <div className="lf-sec-label">
                  <span className="lf-sec-label__h">Related obligations</span>
                </div>
                <div className="lf-desktop-panel lf-desktop-panel--flush">
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
            {isCardType(account.type) && obligations.length === 0 && (
              <p className="lf-bento-sub">No linked obligations.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
