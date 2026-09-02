import type { BankId, ParseResult } from "./types";
import { parse as parseAlfa } from "./alfa";
import { parse as parseAmex } from "./amex";
import { parse as parseBofa } from "./bofa";
import { parse as parseCoinbase } from "./coinbase";
import { parse as parseRshb } from "./rshb";
import { parse as parseSber } from "./sber";
import { parse as parseTbank } from "./tbank";

const PARSERS: Record<BankId, (text: string) => ParseResult> = {
  sber: parseSber,
  alfa: parseAlfa,
  rshb: parseRshb,
  tbank: parseTbank,
  amex: parseAmex,
  bofa: parseBofa,
  coinbase: parseCoinbase,
};

export function detectBank(text: string, filename?: string): BankId | null {
  const fn = (filename ?? "").toLowerCase();
  if (/coinbase|\.html?$/.test(fn) || /<html/i.test(text)) return "coinbase";
  if (/american express|amex|blue cash/i.test(text)) return "amex";
  if (/bank of america|safebalance/i.test(text)) return "bofa";
  if (/alfa|альфа/i.test(text)) return "alfa";
  if (
    /Выписка по сч[её]ту дебетовой карты/i.test(text) &&
    /(?:СберБанк|sberbank\.ru|ПАО Сбербанк|Сбербанк)/i.test(text)
  ) {
    return "sber";
  }
  if (/rshb|рсхб|россельхоз/i.test(text)) return "rshb";
  if (/t-bank|t bank|т-банк|т банк/i.test(text)) return "tbank";
  return null;
}

export function parseByBank(bank: BankId, text: string): ParseResult {
  return PARSERS[bank](text);
}

export * from "./types";
export { makeExternalId } from "./utils";
