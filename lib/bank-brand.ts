import type { AccountRow } from "@/lib/liquidity";

export type Brand = {
  label: string;
  bg: string;
  fg: string;
  /** Two-character monograms render at a smaller size. */
  sm?: boolean;
};

const NEUTRAL_BG = "#e9edf0";
const NEUTRAL_FG = "#6b7683";

type NameRule = Brand & { match: (name: string) => boolean };

const NAME_RULES: NameRule[] = [
  {
    match: (n) => /sberbank|сбер/i.test(n),
    label: "С",
    bg: "#1a9f47",
    fg: "#fff",
  },
  {
    match: (n) => /t-bank|tbank|t bank/i.test(n),
    label: "Т",
    bg: "#ffdd2d",
    fg: "#14110c",
  },
  {
    match: (n) => /alfabank|alfa/i.test(n),
    label: "А",
    bg: "#ef3124",
    fg: "#fff",
  },
  {
    match: (n) => /rshb|россельхоз/i.test(n),
    label: "Р",
    bg: "#0a7b3e",
    fg: "#fff",
  },
  {
    match: (n) => /bank of america|bofa/i.test(n),
    label: "BA",
    bg: "#012169",
    fg: "#fff",
    sm: true,
  },
  {
    match: (n) => /amex|american express/i.test(n),
    label: "AX",
    bg: "#006fcf",
    fg: "#fff",
    sm: true,
  },
  {
    match: (n) => /coinbase/i.test(n),
    label: "C",
    bg: "#0052ff",
    fg: "#fff",
  },
  {
    match: (n) => /apple/i.test(n),
    label: "Ap",
    bg: "#111111",
    fg: "#fff",
    sm: true,
  },
];

function typeFallback(account: Pick<AccountRow, "name" | "type" | "currency">): Brand {
  const type = account.type.toLowerCase();

  if (type === "cash") {
    return {
      label: account.currency === "USD" ? "$" : "₽",
      bg: NEUTRAL_BG,
      fg: NEUTRAL_FG,
    };
  }
  if (type === "real_estate") {
    return { label: "⌂", bg: NEUTRAL_BG, fg: NEUTRAL_FG };
  }
  if (type === "vehicle") {
    return { label: "▮", bg: NEUTRAL_BG, fg: NEUTRAL_FG };
  }

  const first = [...account.name.trim()][0] ?? "?";
  return { label: first, bg: NEUTRAL_BG, fg: NEUTRAL_FG };
}

/** Monogram colors from account name/type — no DB fields required. */
export function brandFor(account: Pick<AccountRow, "name" | "type" | "currency">): Brand {
  const name = account.name.trim();
  for (const rule of NAME_RULES) {
    if (rule.match(name)) {
      const { match: _m, ...brand } = rule;
      return brand;
    }
  }
  return typeFallback(account);
}
