/** Categories that move cash but are excluded from personal P&L (income/expense/plan-fact). */
export const NON_PNL_CATEGORIES = ["Reconciliation", "TVE float (reimbursable)"] as const;

export type NonPnlCategory = (typeof NON_PNL_CATEGORIES)[number];

export const TVE_FLOAT_CATEGORY = "TVE float (reimbursable)" as const;

export function isNonPnlCategory(categoryName: string | null | undefined): boolean {
  if (!categoryName) return false;
  return (NON_PNL_CATEGORIES as readonly string[]).includes(categoryName);
}

export type FloatTx = {
  amount: number;
  type: string;
  categoryName: string | null;
};

/** Net reimbursable float: income − expense in the TVE float category (all time). */
export function computeTveFloatBalance(txs: FloatTx[]): number {
  let balance = 0;
  for (const tx of txs) {
    if (tx.categoryName !== TVE_FLOAT_CATEGORY) continue;
    const amt = Math.abs(Number(tx.amount));
    if (tx.type === "income") balance += amt;
    else if (tx.type === "expense") balance -= amt;
  }
  return balance;
}

export function tveFloatHint(balance: number): string {
  if (balance > 0) return "holding TVE funds";
  if (balance < 0) return "TVE owes you";
  return "settled";
}
