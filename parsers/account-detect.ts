/** Detect stable accountRef keys from statement text (case-insensitive, mask-tolerant). */

export function detectSberRef(text: string): string {
  const rules: { ref: string; test: RegExp }[] = [
    { ref: "sber-5623", test: /5623|0547638|547638/i },
    { ref: "sber-0335", test: /0335|6750335|6049|5173/i },
    { ref: "sber-0685", test: /0685|9045174/i },
  ];
  for (const { ref, test } of rules) {
    if (test.test(text)) return ref;
  }
  const card = text.match(/(?:\*{2,}|x{4,}|[^\d])(\d{4})(?!\d)/i);
  return card ? `sber-${card[1]}` : "sber-unknown";
}

export function detectAlfaRef(text: string): string {
  if (/1916|1724110|220015\+*1916/i.test(text)) return "alfa-1916";
  if (/3883|0043883/i.test(text)) return "alfa-3883";
  if (/3505|0023505|dividend/i.test(text)) return "alfa-3505";
  const acct = text.match(/(?:сч[её]т|карт[аы])[^\d]*(\d{4})/i);
  return acct ? `alfa-${acct[1]}` : "alfa-unknown";
}

export function detectRshbRef(_text: string): string {
  return "rshb";
}

export function detectTbankRef(text: string): string {
  if (/5207889972|5120|220070.*5120/i.test(text)) return "tbank-5120";
  const card = text.match(/(?:карт[аы]|№)\s*[^\d]*(\d{4})/i);
  return card ? `tbank-${card[1]}` : "tbank-unknown";
}

export function detectAmexRef(text: string): string {
  if (/1-23009|23009|account ending/i.test(text)) return "amex-23009";
  return "amex-unknown";
}

export function detectBofaRef(text: string): string {
  const rules: { ref: string; test: RegExp }[] = [
    { ref: "bofa-8541", test: /8541|3252[\s-]*1164[\s-]*8541/i },
    { ref: "bofa-5927", test: /5927|3251[\s-]*7744[\s-]*5927/i },
    { ref: "bofa-3155", test: /3155/i },
  ];
  for (const { ref, test } of rules) {
    if (test.test(text)) return ref;
  }
  const tail = text.match(/(\d{4})(?!\d)/);
  return tail ? `bofa-${tail[1]}` : "bofa-unknown";
}

export function detectCoinbaseRef(_text: string): string {
  return "coinbase";
}
