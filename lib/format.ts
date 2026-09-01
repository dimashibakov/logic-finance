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

/** Parse YYYY-MM-DD (date columns) at local noon to avoid UTC day shift. */
export function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

/** Account freshness label — source must be accounts.updated_at (timestamptz). */
export function formatUpdatedDate(updatedAt: string | null | undefined, includeYear = false): string {
  if (!updatedAt) return "Updated —";
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (includeYear) opts.year = "numeric";
  return `Updated ${new Date(updatedAt).toLocaleDateString("ru-RU", opts)}`;
}

/** Statement / obligation / transaction date columns (YYYY-MM-DD). */
export function formatTxDate(dateStr: string): string {
  return parseDateOnly(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
