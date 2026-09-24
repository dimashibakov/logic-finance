import { createHash } from "crypto";
import type { ImportRow } from "@/lib/import-types";

function externalId(accountRef: string, date: string, amount: number, desc: string) {
  return createHash("sha1").update(`${accountRef}|${date}|${amount}|${desc}|csv`).digest("hex");
}

/** Minimal CSV: date, amount, description — or date, description, amount */
export function parseCsvStatement(text: string, accountRef: string, currency: "RUB" | "USD"): ImportRow[] {
  const rows: ImportRow[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return rows;

  let start = 0;
  const first = lines[0]!.toLowerCase();
  if (first.includes("date") || first.includes("amount") || first.includes("description")) start = 1;

  for (let i = start; i < lines.length; i++) {
    const parts = lines[i]!.split(/[,;\t]/).map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 2) continue;

    let date = "";
    let amount = 0;
    let description = "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(parts[0]!)) {
      date = parts[0]!;
      amount = Math.abs(Number(parts[1]!.replace(/\s/g, "").replace(",", ".")));
      description = parts.slice(2).join(" ") || parts[1]!;
    } else if (/^\d{2}[./]\d{2}[./]\d{4}$/.test(parts[0]!)) {
      const m = parts[0]!.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
      if (m) date = `${m[3]}-${m[2]}-${m[1]}`;
      amount = Math.abs(Number(parts[1]!.replace(/\s/g, "").replace(",", ".")));
      description = parts.slice(2).join(" ") || "CSV import";
    } else {
      continue;
    }

    if (!date || !Number.isFinite(amount) || amount <= 0) continue;

    const signed = Number(parts[1]!.replace(/\s/g, "").replace(",", "."));
    const type = signed < 0 ? "expense" : "income";
    const desc = description || "CSV import";

    rows.push({
      date,
      amount,
      currency,
      type,
      merchant: desc.slice(0, 120),
      bank: "csv",
      accountRef,
      externalId: externalId(accountRef, date, amount, desc),
      rawDescription: desc,
    });
  }

  return rows;
}
