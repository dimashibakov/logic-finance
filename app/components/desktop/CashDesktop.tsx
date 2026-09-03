"use client";

import DesktopPageBridge from "./DesktopPageBridge";
import CashPlannerClient from "@/app/cash/CashPlannerClient";
import type { RubBalanceProjection } from "@/lib/liquidity-planner";
import type { ObligationRow } from "@/lib/payments";

type Props = {
  spot: number;
  eff: number;
  projection: RubBalanceProjection;
  obligations: ObligationRow[];
};

export default function CashDesktop({ spot, eff, projection, obligations }: Props) {
  return (
    <div className="lf-page-desktop">
      <DesktopPageBridge title="RUB cash" spot={spot} eff={eff}>
        <div className="lf-desktop-page">
          <CashPlannerClient projection={projection} obligations={obligations} variant="desktop" />
        </div>
      </DesktopPageBridge>
    </div>
  );
}
