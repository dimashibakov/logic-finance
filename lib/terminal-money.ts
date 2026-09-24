import type { BaseCurrency } from "@/lib/bento-overview";
import { fmtNative, rub, toUsd, usd } from "@/lib/format";

export function obligationZone(currency: string): "RF" | "US" {
  return currency === "USD" ? "US" : "RF";
}

export function toRubEquiv(amount: number, currency: string, spot: number): number {
  const abs = Math.abs(amount);
  return currency === "USD" ? abs * spot : abs;
}

export function toUsdEquiv(amount: number, currency: string, spot: number): number {
  return toUsd(Math.abs(amount), currency, spot);
}

/** Format native amount in header display currency (spot conversion). */
export function fmtDisplayMoney(
  amount: number,
  currency: "RUB" | "USD",
  displayCurrency: BaseCurrency,
  spot: number,
): string {
  if (displayCurrency === currency) return fmtNative(amount, currency);
  if (displayCurrency === "RUB") {
    const rubAmt = currency === "USD" ? amount * spot : amount;
    return rub(rubAmt);
  }
  const usdAmt = currency === "RUB" ? amount / spot : amount;
  return usd(usdAmt);
}

export function displayMoneyValue(
  amount: number,
  currency: "RUB" | "USD",
  displayCurrency: BaseCurrency,
  spot: number,
): number {
  if (displayCurrency === currency) return amount;
  if (displayCurrency === "RUB") return currency === "USD" ? amount * spot : amount;
  return currency === "RUB" ? amount / spot : amount;
}
