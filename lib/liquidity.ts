export type AccountRow = {
  id: string;
  name: string;
  currency: "RUB" | "USD" | string;
  type: string;
  zone: "RF" | "US" | string;
  balance: number;
  balance_date: string | null;
  in_net_worth?: boolean;
};

const LIQUID = new Set(["cash", "checking", "crypto", "savings", "brokerage", "emoney"]);
const ILLIQUID = new Set(["real_estate", "vehicle"]);
const CARDS = new Set(["credit_card"]);

export function isLiquidType(type: string) {
  return LIQUID.has(type);
}

export function isIlliquidType(type: string) {
  return ILLIQUID.has(type);
}

export function isCardType(type: string) {
  return CARDS.has(type);
}

export function isStaleBalance(balanceDate: string | null, maxDays = 21) {
  if (!balanceDate) return true;
  const ms = Date.now() - new Date(`${balanceDate}T12:00:00`).getTime();
  return ms / 86400000 > maxDays;
}

export type AccountGroups = {
  liquidRf: AccountRow[];
  liquidUs: AccountRow[];
  cardsDebt: AccountRow[];
  illiquid: AccountRow[];
};

export function groupAccounts(accounts: AccountRow[]): AccountGroups {
  return {
    liquidRf: accounts.filter((a) => isLiquidType(a.type) && a.zone === "RF" && !isCardType(a.type)),
    liquidUs: accounts.filter((a) => isLiquidType(a.type) && a.zone === "US" && !isCardType(a.type)),
    cardsDebt: accounts.filter((a) => isCardType(a.type)),
    illiquid: accounts.filter((a) => isIlliquidType(a.type)),
  };
}

export function liquidUsdTotal(accounts: AccountRow[], toUsdFn: (n: number, c: string) => number) {
  let liquid = 0;
  let cardDebt = 0;
  for (const a of accounts) {
    const bal = Number(a.balance);
    const usd = toUsdFn(Math.abs(bal), a.currency);
    if (isCardType(a.type) && bal < 0) cardDebt += usd;
    else if (isLiquidType(a.type) && bal > 0) liquid += usd;
  }
  return Math.max(0, liquid - cardDebt);
}

export function illiquidUsdTotal(accounts: AccountRow[], toUsdFn: (n: number, c: string) => number) {
  return accounts.filter((a) => isIlliquidType(a.type) && Number(a.balance) > 0).reduce((s, a) => s + toUsdFn(Number(a.balance), a.currency), 0);
}
