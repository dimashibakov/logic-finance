import type { ParsedTx } from "./types";

type Rule = { pattern: RegExp; category: string; mcc?: string };

const RF_RULES: Rule[] = [
  { pattern: /магнит|пят[её]рочка|перекр[её]сток|вкусвилл|spar|азбука|mcc\s*5411/i, category: "Groceries (RF)", mcc: "5411" },
  { pattern: /lavka|edarit|yandex\*lavka/i, category: "Groceries (RF)" },
  { pattern: /surf\s*coffee|drinkit|mcc\s*5812|mcc\s*5814|mcc\s*5462|mcc\s*5499|pekar|кафе|coffee/i, category: "Cafes & restaurants (RF)" },
  { pattern: /whoosh|yandex\*scooters|ym\*go scooter|mos\.transport|strelkacard|citydrive|delimobil|drive|scooters|urent|go taxi/i, category: "Transport & mobility (RF)" },
  { pattern: /rasp|avito travel|tutu|hotel|гостиниц/i, category: "Travel & tickets (RF)" },
  { pattern: /ozon|lamoda|sportmaster|gold apple|fixprice|vsemayki|marketplace/i, category: "Shopping & marketplace (RF)" },
  { pattern: /gorzdrav|aptek|mcc\s*5912|california.*box/i, category: "Health & fitness (RF)" },
  { pattern: /мегафон|megafon/i, category: "Phone (RF)" },
  { pattern: /dom kino|respublika|книг/i, category: "Books & leisure (RF)" },
  { pattern: /commission|комиссия|обслуживан/i, category: "Bank fees (RF)" },
];

const US_RULES: Rule[] = [
  { pattern: /ralphs|whole\s*foods|trader\s*joe|target(?!\s*fuel)/i, category: "Groceries & household" },
  { pattern: /chevron|arco|shell|speedway|ralphsfuel|fuel/i, category: "Auto: gas & repair" },
  { pattern: /spectrum|connectivity|mobile|internet/i, category: "Connectivity (mobile + internet)" },
  { pattern: /twitch|spotify|zoom|google\s*one|subscription/i, category: "Subscriptions & services" },
  { pattern: /levi|zara|abercrombie|clothing/i, category: "Clothing" },
  { pattern: /bilt payment|bilt/i, category: "Rent LA" },
  { pattern: /la care|health insurance/i, category: "Health insurance" },
  { pattern: /drive ins|lemonade|auto insurance/i, category: "Auto: insurance" },
  { pattern: /oleksandra oliinyk|dog walk|pet/i, category: "Pet & dog walking (US)" },
  { pattern: /anthropic|digitalocean|corporate filings/i, category: "Investment in Zenlo LLC" },
  { pattern: /utilities|electric|water/i, category: "Utilities (US)" },
];

function matchCategory(text: string, rules: Rule[], mcc?: string): string | undefined {
  if (mcc) {
    const byMcc = rules.find((r) => r.mcc === mcc);
    if (byMcc) return byMcc.category;
  }
  const hit = rules.find((r) => r.pattern.test(text));
  return hit?.category;
}

export function categorize(tx: ParsedTx): ParsedTx {
  if (tx.excluded || tx.categoryGuess) return tx;
  const hay = `${tx.merchant ?? ""} ${tx.rawDescription}`.trim();
  const rules = tx.currency === "RUB" ? RF_RULES : US_RULES;
  const categoryGuess = matchCategory(hay, rules, tx.mcc);
  return categoryGuess ? { ...tx, categoryGuess } : tx;
}

export function categorizeAll(txs: ParsedTx[]): ParsedTx[] {
  return txs.map(categorize);
}
