import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { projectRubBalance } from "@/lib/liquidity-planner";
import type { ObligationRow } from "@/lib/payments";
import type { AccountRow } from "@/lib/liquidity";
import RateHeader from "../components/RateHeader";
import CashPlannerClient from "./CashPlannerClient";
import CashDesktop from "../components/desktop/CashDesktop";

export default async function CashPage() {
  const supabase = createClient();
  const [{ data: accData }, { data: oblData }, rates] = await Promise.all([
    supabase.from("accounts").select("currency, type, balance").eq("in_net_worth", true),
    supabase
      .from("obligations")
      .select("id, name, kind, currency, balance, apr, due_date, due_day, monthly_payment, status")
      .eq("status", "active"),
    fetchFxRates(),
  ]);
  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);

  const accounts = (accData ?? []) as Pick<AccountRow, "currency" | "type" | "balance">[];
  const obligations = (oblData ?? []) as ObligationRow[];
  const projection = projectRubBalance(accounts, obligations, 90);

  return (
    <div className="lf-wrap lf-wrap--desktop">
      <CashDesktop spot={spot} eff={eff} projection={projection} obligations={obligations} />
      <div className="lf-phone lf-page-mobile">
        <RateHeader title="RUB cash" />
        <div className="lf-sec-label">
          <span className="lf-sec-label__h">Liquidity planner</span>
          <Link href="/" className="lf-sec-label__m">
            overview →
          </Link>
        </div>
        <CashPlannerClient projection={projection} obligations={obligations} />
      </div>
    </div>
  );
}
