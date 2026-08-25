import { supabase } from "./supabase";
import { DEFAULT_RUB_PER_USD } from "./format";

export type FxRate = { rate_date: string; rub_per_usd: number; kind: string; notes: string | null };

const FALLBACKS: Record<string, number> = {
  spot: DEFAULT_RUB_PER_USD,
  effective: 82.09,
  cbr: 77.23,
};

export async function fetchFxRates(): Promise<FxRate[]> {
  const { data } = await supabase.from("fx_rates").select("*").order("rate_date", { ascending: false });
  return (data ?? []) as FxRate[];
}

export function latestByKind(rates: FxRate[], kind: string): FxRate | undefined {
  return rates.find((r) => r.kind === kind);
}

export function getRubPerUsd(rates: FxRate[], kind = "spot"): number {
  return Number(latestByKind(rates, kind)?.rub_per_usd) || FALLBACKS[kind] || DEFAULT_RUB_PER_USD;
}

export function effRate(spot: number): number {
  return spot * 1.015 + 3;
}

export { toUsd } from "./format";

export function effectivePremiumPct(spotRate: number, effectiveRate: number): number {
  if (spotRate <= 0) return 0;
  return ((effectiveRate - spotRate) / spotRate) * 100;
}
