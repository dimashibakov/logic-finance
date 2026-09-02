// lib/parsers/alfa-ru.ts
// Разбор операций и контрольных сумм выписки Alfa-Bank (RU, текущий счёт).
// Логика проверена на реальном извлечённом тексте (pdf-parse, 895 симв.):
// на файле AM_1788288912119.pdf даёт ровно 1 операцию, контроль сходится.
//
// Причины, по которым прежняя реализация давала txs:0:
//   1) money-регэксп не допускал ПРОБЕЛ-разделитель тысяч ("85 000,00") — не матчил сумму;
//   2) границу таблицы искали по заголовку "Сумма в валюте счёта", который РАЗОРВАН на две
//      строки ("...Описание Сумма" / "в валюте счёта") — таблица не находилась;
//   3) сумма может стоять на строке даты, а хвост описания переносится ниже — построчный
//      матч "дата+сумма на одной строке" не срабатывал.
// Здесь всё это учтено: запись собирается от даты до следующей даты, сумма ищется во всём блоке.

export interface ParsedTxn {
  ts: string;
  amount: number;
  type: "income" | "expense";
  externalId: string | null;
  description: string;
}

export interface AlfaControl {
  opening: number | null;
  deposits: number | null;
  withdrawals: number | null;
  closing: number | null;
}

export interface AlfaParseResult {
  transactions: ParsedTxn[];
  control: AlfaControl;
  controlOk: boolean;
  warnings: string[];
}

const SP = "[ \\u00A0\\u202F]";
const MONEY_G = new RegExp(`-?\\d{1,3}(?:${SP}\\d{3})*,\\d{2}\\s*(?:RUR|RUB|₽)`, "g");
const DATE_START = /^\s*(\d{2}\.\d{2}\.\d{4})/;
const OP_CODE = /\b([CСcс]\d{6,})\b/;
const FOOTER = /(Уполномоченное|АЛЬФА-БАНК|alfabank|Страница)/i;

function toNumber(raw: string): number {
  const cleaned = raw
    .replace(/\u00A0|\u202F/g, " ")
    .replace(/[^\d,\-]/g, "")
    .replace(",", ".");
  return parseFloat(cleaned);
}

function findLabeled(text: string, label: string): number | null {
  const re = new RegExp(`${label}\\s+(-?\\d[\\d ${"\\u00A0\\u202F"}]*,\\d{2})\\s*RUR`);
  const m = text.match(re);
  return m ? toNumber(m[1]) : null;
}

export function parseAlfaStatement(text: string): AlfaParseResult {
  const warnings: string[] = [];

  const control: AlfaControl = {
    opening: findLabeled(text, "Входящий остаток"),
    deposits: findLabeled(text, "Поступления"),
    withdrawals: findLabeled(text, "Расходы"),
    closing: findLabeled(text, "Исходящий остаток"),
  };

  const marker = text.indexOf("Операции по счету");
  let body = marker >= 0 ? text.slice(marker + "Операции по счету".length) : text;
  const footerMatch = body.match(FOOTER);
  if (footerMatch && footerMatch.index !== undefined) body = body.slice(0, footerMatch.index);

  const records: string[] = [];
  let cur: string | null = null;
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (DATE_START.test(line)) {
      if (cur) records.push(cur);
      cur = line.trim();
    } else if (cur) {
      cur += " " + line.trim();
    }
  }
  if (cur) records.push(cur);

  const transactions: ParsedTxn[] = [];
  for (const rec of records) {
    const dateM = rec.match(DATE_START);
    if (!dateM) continue;
    const moneyMatches = rec.match(MONEY_G);
    if (!moneyMatches || moneyMatches.length === 0) {
      warnings.push(`Строка без суммы пропущена: ${rec.slice(0, 60)}…`);
      continue;
    }
    const amountRaw = moneyMatches[moneyMatches.length - 1];
    const signed = toNumber(amountRaw);
    const [dd, mm, yy] = dateM[1].split(".");
    const codeM = rec.match(OP_CODE);
    transactions.push({
      ts: `${yy}-${mm}-${dd}`,
      amount: Math.abs(signed),
      type: signed < 0 ? "expense" : "income",
      externalId: codeM ? codeM[1] : null,
      description: rec.replace(MONEY_G, "").replace(/\s+/g, " ").trim(),
    });
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
