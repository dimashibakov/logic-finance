import type { BankId } from "./generic";
import { parse as parseAlfa } from "./alfa";
import { parse as parseSber } from "./sber";
import { parse as parseRshb } from "./rshb";
import { parse as parseTbank } from "./tbank";

const PARSERS = {
  alfa: parseAlfa,
  sber: parseSber,
  rshb: parseRshb,
  tbank: parseTbank,
} as const;

export function detectBank(text: string): BankId | null {
  if (/alfa|альфа/i.test(text)) return "alfa";
  if (/sberbank|сбер/i.test(text)) return "sber";
  if (/rshb|рсхб/i.test(text)) return "rshb";
  if (/t-bank|t bank|т-банк|т банк/i.test(text)) return "tbank";
  return null;
}

export function parseByBank(bank: BankId, text: string) {
  return PARSERS[bank](text);
}

export type { StatementRow, BankId } from "./generic";
