import { supabase } from "./supabase";
import { DEFAULT_RUB_PER_USD } from "./format";

export type FxRate = { rate_date: string; rub_per_usd: number; kind: string; notes: string | null };

export async function fetchFxRates(): Promise<FxRate[]> {
  const { data } = await supabase.from("fx_rates").select("*").order("rate_date", { ascending: false });
  return (data ?? []) as FxRate[];
}

export function latestByKind(rates: FxRate[], kind: string): FxRate | undefined {
  return rates.find((r) => r.kind === kind);
}

export function getRubPerUsd(rates: FxRate[], kind = "spot"): number {
  return Number(latestByKind(rates, kind)?.rub_per_usd) || DEFAULT_RUB_PER_USD;
}

export function deltaForKind(rates: FxRate[], kind: string): number | null {
  const sameKind = rates.filter((r) => r.kind === kind);
  if (sameKind.length < 2) return null;
  return Number(sameKind[0].rub_per_usd) - Number(sameKind[1].rub_per_usd);
}
