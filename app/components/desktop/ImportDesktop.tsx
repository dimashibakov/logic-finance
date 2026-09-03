"use client";

import { useRouter } from "next/navigation";
import DesktopPageBridge from "./DesktopPageBridge";
import ImportPanel from "../forms/ImportPanel";

type Props = {
  spot: number;
  eff: number;
};

export default function ImportDesktop({ spot, eff }: Props) {
  const router = useRouter();

  return (
    <div className="lf-page-desktop">
      <DesktopPageBridge title="Import" spot={spot} eff={eff}>
        <div className="lf-desktop-page">
          <ImportPanel
            variant="split"
            hideBack
            onBack={() => router.push("/")}
            onDone={() => router.push("/history")}
          />
        </div>
      </DesktopPageBridge>
    </div>
  );
}
