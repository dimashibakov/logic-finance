export type StatementRow = {
  ts: string;
  amount: number;
  currency: "RUB" | "USD";
  type: "income" | "expense";
  merchant: string | null;
  bankRaw: string;
};

export type BankId = "alfa" | "sber" | "rshb" | "tbank";

export function normalizeDate(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return raw;
}

/** Generic placeholder: regex for date + amount on each line. */
export function parseGenericLines(text: string, bankId: string): StatementRow[] {
  const rows: StatementRow[] = [];
  const pattern = /(\d{2}[./]\d{2}[./]\d{4}|\d{4}-\d{2}-\d{2}).*?(-?\d[\d\s]*[,.]\d{2})/;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(pattern);
    if (!m) continue;

    const rawAmount = parseFloat(m[2].replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(rawAmount) || rawAmount === 0) continue;

    rows.push({
      ts: normalizeDate(m[1]),
      amount: Math.abs(rawAmount),
      currency: "RUB",
      type: rawAmount < 0 ? "expense" : "income",
      merchant: trimmed.slice(0, 120) || null,
      bankRaw: trimmed,
    });
  }

  void bankId;
  return rows;
}
