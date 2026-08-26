import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { isLiquidType, isCardType } from "@/lib/liquidity";
import RateHeader from "../components/RateHeader";
import ConvertPlanner from "./ConvertPlanner";

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function ConvertPage() {
  const supabase = createClient();
  const cutoff = addDaysISO(30);
  const [{ data: accData }, { data: oblData }, rates] = await Promise.all([
    supabase.from("accounts").select("id, name, currency, type, zone, balance"),
    supabase.from("obligations").select("currency, balance, due_date").eq("status", "active"),
    fetchFxRates(),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);

  const accounts = accData ?? [];
  const obligations = oblData ?? [];

  const usdNeeds30d = obligations
    .filter((o) => o.currency === "USD" && o.due_date && o.due_date <= cutoff)
    .reduce((s, o) => s + Math.abs(Number(o.balance)), 0);

  const usdCash = accounts
    .filter((a) => a.currency === "USD" && (isLiquidType(a.type) || isCardType(a.type)))
    .reduce((s, a) => s + Math.max(0, Number(a.balance)), 0);

  const shortfall = Math.max(0, usdNeeds30d - usdCash);
  const rubRecommendation = Math.round(shortfall * eff);
  const costOverSpot = shortfall * (eff - spot);

  return (
    <div className="lf-wrap">
      <div className="lf-phone">
        <RateHeader title="Convert" />
        <ConvertPlanner
          spot={spot}
          eff={eff}
          usdNeeds30d={usdNeeds30d}
          usdCash={usdCash}
          shortfall={shortfall}
          rubRecommendation={rubRecommendation}
          costOverSpot={costOverSpot}
        />
      </div>
    </div>
  );
}
