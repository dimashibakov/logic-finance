"use client";

import { formatTxDate } from "@/lib/format";
import { amountTone, signedPrefix, txLabel, type TransactionRecord } from "@/lib/transactions";
import { fmtDisplayMoney } from "@/lib/terminal-money";
import type { BaseCurrency } from "@/lib/bento-overview";

type Props = {
  txs: TransactionRecord[];
  spot: number;
  displayCurrency: BaseCurrency;
  onRowClick?: (tx: TransactionRecord) => void;
  empty?: string;
};

export default function TransactionMiniList({ txs, spot, displayCurrency, onRowClick, empty = "No transactions" }: Props) {
  if (txs.length === 0) return <div className="t-pay-empty">{empty}</div>;

  return (
    <div className="t-tx-mini">
      {txs.map((tx) => (
        <button
          key={tx.id}
          type="button"
          className="t-tx-mini__row"
          onClick={() => onRowClick?.(tx)}
        >
          <span className="num t-tx-mini__date">{formatTxDate(tx.ts)}</span>
          <span className="t-tx-mini__label">{txLabel(tx)}</span>
          <span className={`num t-tx-mini__amt ${amountTone(tx.type) ?? ""}`}>
            {signedPrefix(tx.type)}
            {fmtDisplayMoney(Math.abs(tx.amount), tx.currency, displayCurrency, spot)}
          </span>
        </button>
      ))}
    </div>
  );
}
