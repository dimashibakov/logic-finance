export type TxType = "income" | "expense" | "conversion" | "transfer";

export interface ParsedTx {
  date: string;
  amount: number;
  currency: "RUB" | "USD";
  type: TxType;
  accountRef: string;
  merchant?: string;
  rawDescription: string;
  mcc?: string;
  categoryGuess?: string;
  fee?: number;
  excluded?: boolean;
  excludeReason?: string;
  externalId: string;
  /** Exclude from control-sum reconciliation (tranche mechanics, pending holds). */
  skipControl?: boolean;
  /** +1 credit / −1 debit on statement for control totals. */
  statementSign?: 1 | -1;
  pending?: boolean;
}

export interface ParseResult {
  account: {
    ref: string;
    currency: "RUB" | "USD";
    statementBalanceEnd: number;
    periodStart: string;
    periodEnd: string;
  };
  txs: ParsedTx[];
  control: {
    deposits?: number;
    withdrawals?: number;
    ok: boolean;
    notes?: string[];
  };
}

export type BankId =
  | "sber"
  | "alfa"
  | "rshb"
  | "tbank"
  | "amex"
  | "bofa"
  | "coinbase";
