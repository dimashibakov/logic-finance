// lib/parsers/sber-ru.ts
// Сбербанк — выписка по счёту дебетовой карты.
// Сумма без знака; направление определяется по колонке «ОСТАТОК СРЕДСТВ» (balance delta).
// Операция: строка даты+времени с суммой/остатком, затем строка с кодом авторизации и описанием.

export interface ParsedTxn {
  ts: string;
  amount: number;
  type: "income" | "expense";
  externalId: string | null;
  bankCategory: string;
  description: string;
}

export interface SberControl {
  opening: number | null;
  deposits: number | null;
  withdrawals: number | null;
  closing: number | null;
}

export interface SberParseResult {
  transactions: ParsedTxn[];
  control: SberControl;
  controlOk: boolean;
  warnings: string[];
}

const SP = "[ \\u00A0\\u202F]";
const MONEY = `\\d{1,3}(?:${SP}\\d{3})*,\\d{2}`;
const MONEY_CAPTURE = `(${MONEY})`;
const OP_HEADER = new RegExp(
  `^(\\d{2}\\.\\d{2}\\.\\d{4})\\s+(\\d{2}:\\d{2})\\s*\\|\\s*([^|]+?)\\s*\\|\\s*${MONEY_CAPTURE}\\s*\\|\\s*${MONEY_CAPTURE}\\s*$`
);
const OP_DETAIL = /^(\d{2}\.\d{2}\.\d{4})\s+(\S+)\s*\|\s*(.*)$/;
const DATE_TIME_START = /^\s*\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s*\|/;

function toNumber(raw: string): number {
  const cleaned = raw
    .replace(/\u00A0|\u202F/g, " ")
    .replace(/[^\d,]/g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function isoFromRuDate(d: string): string {
  const [dd, mm, yy] = d.split(".");
  return `${yy}-${mm}-${dd}`;
}

function extractControl(text: string): SberControl {
  const totalsBlock =
    text.match(/ИТОГО ПО ОПЕРАЦИЯМ ЗА ПЕРИОД[\s\S]*?(?=Расшифровка|Дата операции|$)/i)?.[0] ?? text;

  const pick = (label: string) => {
    const re = new RegExp(`${label}[^\\d]*${MONEY_CAPTURE}`, "i");
    const m = totalsBlock.match(re);
    return m ? toNumber(m[1]) : null;
  };

  return {
    opening: pick("Остаток на начало") ?? pick("остаток[^\\d]*на[^\\d]*начало"),
    deposits: pick("Пополнение"),
    withdrawals: pick("Списание"),
    closing: pick("Остаток на конец") ?? pick("остаток[^\\d]*на[^\\d]*конец"),
  };
}

function operationBody(text: string): string[] {
  const marker =
    text.match(/ОСТАТОК СРЕДСТВ/i)?.index ??
    text.match(/Расшифровка операций/i)?.index ??
    text.match(/Дата операции/i)?.index ??
    -1;

  const body = marker >= 0 ? text.slice(marker) : text;
  return body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function inferType(prevBalance: number, amount: number, balance: number): "income" | "expense" | null {
  if (Math.abs(prevBalance - amount - balance) < 0.02) return "expense";
  if (Math.abs(prevBalance + amount - balance) < 0.02) return "income";
  return null;
}

export function parseSberStatement(text: string): SberParseResult {
  const warnings: string[] = [];
  const control = extractControl(text);
  const lines = operationBody(text);
  const transactions: ParsedTxn[] = [];

  let lastBalance = control.opening;
  let i = 0;

  while (i < lines.length) {
    const header = lines[i].match(OP_HEADER);
    if (!header) {
      i++;
      continue;
    }

    const dateRu = header[1];
    const bankCategory = header[3].trim();
    const amount = toNumber(header[4]);
    const balance = toNumber(header[5]);
    i++;

    let authCode: string | null = null;
    const descParts: string[] = [];

    while (i < lines.length && !DATE_TIME_START.test(lines[i])) {
      const detail = lines[i].match(OP_DETAIL);
      if (detail && detail[1] === dateRu) {
        authCode = detail[2];
        if (detail[3].trim()) descParts.push(detail[3].trim());
      } else if (descParts.length > 0 || authCode) {
        descParts.push(lines[i]);
      }
      i++;
    }

    const prevBalance = lastBalance ?? balance + amount;
    const type = inferType(prevBalance, amount, balance);
    if (!type) {
      warnings.push(
        `Balance delta mismatch on ${dateRu}: prev ${prevBalance}, amount ${amount}, balance ${balance}`
      );
    }

    const ts = isoFromRuDate(dateRu);
    transactions.push({
      ts,
      amount,
      type: type ?? "expense",
      externalId: authCode ? `SBER-${ts.replace(/-/g, "")}-${authCode}` : null,
      bankCategory,
      description: descParts.join(" ").replace(/\s+/g, " ").trim(),
    });

    lastBalance = balance;
  }

  const parsedOut = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const parsedIn = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);

  const near = (a: number | null, b: number) => a !== null && Math.abs(a - b) < 0.01;
  const depositsOk = control.deposits === null || near(control.deposits, parsedIn);
  const withdrawalsOk = control.withdrawals === null || near(control.withdrawals, parsedOut);
  const balanceOk =
    control.opening === null ||
    control.closing === null ||
    near(control.closing, control.opening + parsedIn - parsedOut);

  if (!depositsOk) warnings.push(`Deposits mismatch: statement ${control.deposits}, parsed ${parsedIn}`);
  if (!withdrawalsOk) warnings.push(`Withdrawals mismatch: statement ${control.withdrawals}, parsed ${parsedOut}`);
  if (!balanceOk) {
    warnings.push(
      `Balance mismatch: opening ${control.opening} - out ${parsedOut} + in ${parsedIn} ≠ closing ${control.closing}`
    );
  }
  if (transactions.length === 0) warnings.push("No transactions parsed");

  const controlOk = depositsOk && withdrawalsOk && balanceOk && transactions.length > 0;
  return { transactions, control, controlOk, warnings };
}

export function isSberDebitStatement(text: string): boolean {
  return (
    /Выписка по сч[её]ту дебетовой карты/i.test(text) &&
    /(?:СберБанк|sberbank\.ru|ПАО Сбербанк|Сбербанк)/i.test(text)
  );
}
