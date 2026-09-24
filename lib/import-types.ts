export type ImportRow = {
  date: string;
  amount: number;
  currency: string;
  type: string;
  merchant: string | null;
  bank: string;
  accountRef: string;
  categoryGuess?: string | null;
  suggestedCategory?: string | null;
  needsReview?: boolean;
  excluded?: boolean;
  excludeReason?: string;
  externalId: string;
  rawDescription?: string;
};
