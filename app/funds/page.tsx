import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { parseFundRow } from "@/lib/funds";
import FundsClient from "../components/funds/FundsClient";
import FundsDesktop from "../components/desktop/FundsDesktop";

export default async function FundsPage() {
  const supabase = createClient();
  const [{ data: fundRows, error: fundError }, rates] = await Promise.all([
    supabase.from("funds").select("*").order("due_date", { ascending: true, nullsFirst: false }),
    fetchFxRates(),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);
  const funds = (fundRows ?? []).map((row) => parseFundRow(row as Record<string, unknown>));
  const initialError = fundError?.message ?? null;

  return (
    <div className="lf-wrap lf-wrap--desktop">
      <FundsDesktop spot={spot} eff={eff} initialFunds={funds} initialError={initialError} />
      <div className="lf-phone lf-page-mobile">
        <FundsClient initialFunds={funds} initialSpot={spot} initialError={initialError} variant="mobile" />
      </div>
    </div>
  );
}
