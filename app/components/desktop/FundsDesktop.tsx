"use client";

import DesktopPageBridge from "./DesktopPageBridge";
import FundsClient from "../funds/FundsClient";
import type { Fund } from "@/lib/funds";

type Props = {
  spot: number;
  eff: number;
  initialFunds: Fund[];
  initialError?: string | null;
};

export default function FundsDesktop({ spot, eff, initialFunds, initialError }: Props) {
  return (
    <div className="lf-page-desktop">
      <DesktopPageBridge title="Фонды" spot={spot} eff={eff}>
        <FundsClient initialFunds={initialFunds} initialSpot={spot} initialError={initialError} variant="desktop" />
      </DesktopPageBridge>
    </div>
  );
}
