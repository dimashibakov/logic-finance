import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, fetchSpotHistory, getRubPerUsd, effRate } from "@/lib/fx";
import { computeFxTiming } from "@/lib/fx-timing";
import { computeExposure } from "@/lib/exposure";
import { isLiquidType, isCardType } from "@/lib/liquidity";
import RateHeader from "../components/RateHeader";
import ConvertPlanner from "./ConvertPlanner";
import ConvertDesktop from "../components/desktop/ConvertDesktop";

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function ConvertPage() {
  const supabase = createClient();
  const cutoff = addDaysISO(30);
  const [{ data: accData }, { data: oblData }, rates, spotHistory] = await Promise.all([
    supabase.from("accounts").select("balance, currency, type, zone").eq("in_net_worth", true),
    supabase.from("obligations").select("balance, currency, kind, due_date").eq("status", "active"),
    fetchFxRates(),
    fetchSpotHistory(90),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);
  const timing = computeFxTiming(spotHistory.length > 0 ? spotHistory : rates.filter((r) => r.kind === "spot"));

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

  const exposureAccounts = accounts.map((a) => ({
    balance: Number(a.balance),
    currency: a.currency,
    type: a.type,
    zone: a.zone,
  }));
  const exposureObligations = obligations.map((o) => ({
    balance: Number(o.balance),
    currency: o.currency,
    kind: o.kind,
  }));
  const exposure = computeExposure(exposureAccounts, exposureObligations, spot, eff);

  return (
    <div className="lf-wrap lf-wrap--desktop">
      <ConvertDesktop spot={spot} eff={eff} timing={timing} rubRecommendation={rubRecommendation} />
      <div className="lf-phone lf-page-mobile">
        <RateHeader title="Convert" />
        <ConvertPlanner
          timing={timing}
          spot={spot}
          eff={eff}
          usdNeeds30d={usdNeeds30d}
          usdCash={usdCash}
          shortfall={shortfall}
          rubRecommendation={rubRecommendation}
          costOverSpot={costOverSpot}
          exposure={exposure}
          exposureAccounts={exposureAccounts}
          exposureObligations={exposureObligations}
        />
      </div>
    </div>
  );
}
