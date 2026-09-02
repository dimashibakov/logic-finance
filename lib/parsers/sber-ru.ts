// lib/parsers/sber-ru.ts
// Разбор выписки Сбербанка (дебетовая карта, RU).
// ВАЖНО: приложение извлекает текст через pdf-parse (pdfjs), который СКЛЕИВАЕТ поля БЕЗ ПРОБЕЛОВ:
//   "02.09.202612:24Перевод с карты95 000,00171 364,66"
//   "02.09.2026756659SBOL перевод на карту 2202****9491 Ш. ПАВЕЛ"
// Поэтому между полями используем \s* (пробел опционален), а не \s+.
// Сумма без знака — направление и построчная сверка по колонке ОСТАТОК (balance delta).
// Проверено на выводе pdf-parse: 9 операций, контроль сходится, per-row recon OK.

export interface ParsedTxn {
  ts: string;
  time: string;
  amount: number;
  type: "income" | "expense";
  externalId: string;
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
const M = `\\d{1,3}(?:${SP}\\d{3})*,\\d{2}`;
const REC = new RegExp(`^(\\d{2}\\.\\d{2}\\.\\d{4})\\s*(\\d{2}:\\d{2})\\s*(.+?)\\s*(${M})\\s*(${M})\\s*$`);
const AUTH = new RegExp(`^(\\d{2}\\.\\d{2}\\.\\d{4})\\s*(\\d{4,})\\s*(.*)$`);
const FOOTER = /(Продолжение|Дата формирования|ПАО Сбербанк|Страница|Для проверки|Расшифровка|ДАТА ОПЕРАЦИИ|^\*)/i;

function toNumber(raw: string): number {
  return parseFloat(raw.replace(/\u00A0|\u202F/g, " ").replace(/[^\d,]/g, "").replace(",", "."));
}

function labeled(text: string, label: string): number | null {
  const m = text.match(new RegExp(`${label}\\s*(${M})`));
  return m ? toNumber(m[1]) : null;
}

export function parseSberStatement(text: string): SberParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/);

  const ostatki = [...text.matchAll(new RegExp(`Остаток на\\s*\\d{2}\\.\\d{2}\\.\\d{4}\\s*(${M})`, "g"))];
  const control: SberControl = {
    opening: ostatki.length ? toNumber(ostatki[0][1]) : null,
    deposits: labeled(text, "Пополнение"),
    withdrawals: labeled(text, "Списание"),
    closing: ostatki.length ? toNumber(ostatki[ostatki.length - 1][1]) : null,
  };

  const starts: number[] = [];
  lines.forEach((ln, i) => {
    if (REC.test(ln)) starts.push(i);
  });

  type Raw = {
    ts: string;
    time: string;
    amount: number;
    balance: number;
    bankCategory: string;
    auth: string;
    description: string;
  };
  const raws: Raw[] = [];
  starts.forEach((start, k) => {
    const end = k + 1 < starts.length ? starts[k + 1] : lines.length;
    const m = REC.exec(lines[start])!;
    const [dd, mm, yy] = m[1].split(".");
    let auth = "";
    const descParts: string[] = [];
    for (let j = start + 1; j < end; j++) {
      const ln = lines[j];
      if (FOOTER.test(ln.trim())) break;
      const am = AUTH.exec(ln);
      if (am && !auth) {
        auth = am[2];
        descParts.push(am[3]);
      } else {
        descParts.push(ln.trim());
      }
    }
    const description = descParts
      .join(" ")
      .replace(/Операция по карте.*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    raws.push({
      ts: `${yy}-${mm}-${dd}`,
      time: m[2],
      bankCategory: m[3].trim(),
      amount: toNumber(m[4]),
      balance: toNumber(m[5]),
      auth,
      description,
    });
  });

  const chrono = [...raws].reverse();
  const transactions: ParsedTxn[] = [];
  let prev = control.opening;
  for (const r of chrono) {
    let type: "income" | "expense" = "expense";
    if (prev !== null) {
      const signed = Math.round((r.balance - prev) * 100) / 100;
      type = signed < 0 ? "expense" : "income";
      if (Math.abs(Math.abs(signed) - r.amount) > 0.01) {
        warnings.push(`Row recon mismatch ${r.ts}: amount ${r.amount}, balance delta ${signed}`);
      }
    }
    prev = r.balance;
    transactions.push({
      ts: r.ts,
      time: r.time,
      amount: r.amount,
      type,
      externalId: `SBER-${r.ts.replace(/-/g, "")}-${r.auth || r.time.replace(":", "")}`,
      bankCategory: r.bankCategory,
      description: r.description,
    });
  }

  const parsedOut = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const parsedIn = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const near = (a: number | null, b: number) => a !== null && Math.abs(a - b) < 0.01;
  const withdrawalsOk = control.withdrawals === null || near(control.withdrawals, parsedOut);
  const depositsOk = control.deposits === null || near(control.deposits, parsedIn);
  const balanceOk =
    control.opening === null ||
    control.closing === null ||
    near(control.closing, control.opening + parsedIn - parsedOut);

  if (!withdrawalsOk) warnings.push(`Withdrawals mismatch: statement ${control.withdrawals}, parsed ${parsedOut}`);
  if (!depositsOk) warnings.push(`Deposits mismatch: statement ${control.deposits}, parsed ${parsedIn}`);
  if (!balanceOk) {
    warnings.push(`Balance mismatch: ${control.opening} + ${parsedIn} - ${parsedOut} ≠ ${control.closing}`);
  }
  if (transactions.length === 0) warnings.push("No transactions parsed");

  const controlOk = withdrawalsOk && depositsOk && balanceOk && transactions.length > 0;
  return { transactions, control, controlOk, warnings };
}

export function isSberDebitStatement(text: string): boolean {
  return (
    /Выписка по сч[её]ту дебетовой карты/i.test(text) &&
    /(?:СберБанк|sberbank\.ru|ПАО Сбербанк|Сбербанк)/i.test(text)
  );
}
