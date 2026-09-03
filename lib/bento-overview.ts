import { fmtNative, parseDateOnly, rub, toUsd, usd } from "@/lib/format";
import type { AccountRow } from "./liquidity";
import { isStaleBalance } from "./liquidity";
import { V } from "./tokens";

export type BaseCurrency = "RUB" | "USD";

export function sumZoneBalances(accounts: AccountRow[]) {
  let rub = 0;
  let usdBal = 0;
  for (const a of accounts) {
    const b = Number(a.balance);
    if (Math.abs(b) < 0.01) continue;
    if (a.currency === "RUB") rub += b;
    else usdBal += b;
  }
  return { rub, usd: usdBal };
}

export function accountRubUsd(account: AccountRow, spot: number) {
  const bal = Number(account.balance);
  if (account.currency === "RUB") {
    return { rub: bal, usd: toUsd(Math.abs(bal), "RUB", spot) * Math.sign(bal || 1) };
  }
  return { rub: bal * spot * Math.sign(bal || 1), usd: bal };
}

export function fmtCompactMoney(amount: number, currency: BaseCurrency, approx = false): string {
  const prefix = approx ? "≈ " : "";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  if (currency === "USD") {
    if (abs >= 1_000_000) return `${prefix}${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${prefix}${sign}$${(abs / 1_000).toFixed(1)}K`;
    return `${prefix}${sign}${usd(abs)}`;
  }
  if (abs >= 1_000_000) return `${prefix}${sign}₽${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}${sign}₽${Math.round(abs).toLocaleString("en-US")}`;
  return `${prefix}${sign}${rub(abs)}`;
}

export function pairMoney(
  amountUsd: number,
  spot: number,
  base: BaseCurrency,
  opts?: { approx?: boolean; signed?: boolean }
) {
  const rubAmt = amountUsd * spot;
  const primary = base === "RUB" ? fmtCompactMoney(rubAmt, "RUB", opts?.approx) : fmtCompactMoney(amountUsd, "USD", opts?.approx);
  const secondary = base === "RUB" ? fmtCompactMoney(amountUsd, "USD", opts?.approx) : fmtCompactMoney(rubAmt, "RUB", opts?.approx);
  return { primary, secondary };
}

export function fmtUpdatedShort(updatedAt: string | null | undefined, balanceDate: string | null) {
  const raw = balanceDate ?? updatedAt;
  if (!raw) return "—";
  const d = raw.includes("T") ? new Date(raw) : parseDateOnly(raw);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

export type CompositionSegment = { label: string; color: string; valueUsd: number };

export function buildCompositionSegments(
  groups: {
    liquidRf: AccountRow[];
    liquidUs: AccountRow[];
    cardsDebt: AccountRow[];
    illiquid: AccountRow[];
  },
  spot: number
): CompositionSegment[] {
  const seg = (label: string, color: string, accounts: AccountRow[]) => ({
    label,
    color,
    valueUsd: accounts.reduce((s, a) => s + Math.abs(toUsd(Number(a.balance), a.currency, spot)), 0),
  });
  return [
    seg("RF banks", V.danger, groups.liquidRf.filter((a) => Number(a.balance) > 0)),
    seg("US banks", V.ink, groups.liquidUs.filter((a) => Number(a.balance) > 0)),
    seg("Illiquid", V.illiquidBar, groups.illiquid.filter((a) => Number(a.balance) > 0)),
    seg("Cards (−)", V.warn, groups.cardsDebt.filter((a) => Number(a.balance) < 0)),
  ].filter((s) => s.valueUsd > 0.01);
}

export function fxExposureLabel(incomeRubPct: number, outflowUsdPct: number) {
  if (incomeRubPct >= 50 && outflowUsdPct >= 40) return "₽-heavy";
  if (incomeRubPct < 40 && outflowUsdPct >= 50) return "$-heavy";
  return "mixed";
}

export function accountDisplayAmounts(
  account: AccountRow,
  spot: number,
  _base: BaseCurrency,
  liquidRubBasis: number
) {
  const stale = isStaleBalance(account.balance_date);
  const bal = Number(account.balance);
  const { rub: rubVal, usd: usdVal } = accountRubUsd(account, spot);
  const pct = liquidRubBasis > 0 ? ((Math.abs(rubVal) / liquidRubBasis) * 100).toFixed(1) : "0.0";
  const rubAmount = `${fmtNative(Math.abs(rubVal), "RUB")}`;
  const usdAmount = `${fmtNative(Math.abs(usdVal), "USD")}`;
  const colRub = rubAmount;
  const colUsd = usdAmount;
  return { stale, isDebt: bal < 0, colRub, colUsd, pct };
}
