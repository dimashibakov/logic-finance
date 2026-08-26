/** Net worth: assets minus card debt (negative accounts) and non-card obligations (USD spot). */
export function computeNetWorth(
  accounts: { balance: number; currency: string }[],
  obligations: { balance: number; currency: string; kind?: string }[],
  toUsd: (amount: number, currency: string) => number
) {
  const assets = accounts
    .filter((a) => Number(a.balance) > 0)
    .reduce((s, a) => s + toUsd(Number(a.balance), a.currency), 0);

  const cardDebt = accounts
    .filter((a) => Number(a.balance) < 0)
    .reduce((s, a) => s + toUsd(Math.abs(Number(a.balance)), a.currency), 0);

  const obligationsDebt = obligations
    .filter((o) => o.kind !== "credit_card")
    .reduce((s, o) => s + toUsd(Math.abs(Number(o.balance)), o.currency), 0);

  const debt = cardDebt + obligationsDebt;
  return { assets, debt, cardDebt, obligationsDebt, net: assets - debt };
}
