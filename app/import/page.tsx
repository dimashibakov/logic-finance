import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import ImportPageClient from "./ImportPageClient";
import ImportDesktop from "../components/desktop/ImportDesktop";
import RateHeader from "../components/RateHeader";

export default async function ImportPage() {
  const rates = await fetchFxRates();
  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);

  return (
    <div className="lf-wrap lf-wrap--desktop">
      <ImportDesktop spot={spot} eff={eff} />
      <div className="lf-phone lf-page-mobile">
        <RateHeader title="Import" />
        <ImportPageClient />
      </div>
    </div>
  );
}
