export const DEFAULT_RUB_PER_USD = 76.9;

export const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
export const rub = (n: number) => "₽" + Math.round(n).toLocaleString("en-US");
export const toUsd = (amount: number, currency: string, rubPerUsd: number) =>
  currency === "USD" ? amount : amount / rubPerUsd;

export const fmtRate = (n: number) => n.toFixed(2);
export const fmtPct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";

export function fmtNative(amount: number, currency: string) {
  return currency === "USD" ? usd(amount) : rub(amount);
}
