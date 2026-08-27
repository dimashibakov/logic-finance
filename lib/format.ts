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

/** Human-readable balance update, e.g. "Updated 12 Aug" or "Updated 12 Aug 2026". */
export function formatUpdatedDate(dateStr: string | null, includeYear = false): string {
  if (!dateStr) return "Updated —";
  const d = new Date(`${dateStr}T12:00:00`);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (includeYear) opts.year = "numeric";
  return `Updated ${d.toLocaleDateString("en-GB", opts)}`;
}

export function formatTxDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
