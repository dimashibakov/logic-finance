"use client";

import { fmtRate } from "@/lib/format";
import type { BaseCurrency } from "@/lib/bento-overview";
import { useDesktopShell } from "./DesktopShellContext";

export default function TopBar() {
  const { meta, fallbackTitle } = useDesktopShell();
  const title = meta.title ?? fallbackTitle;
  const spot = meta.spot;
  const eff = meta.eff;

  return (
    <header className="lf-topbar lf-only-desktop">
      <h1 className="lf-topbar__title">{title}</h1>
      <div className="lf-topbar__spacer" />
      {meta.showCurrencyToggle && meta.onBaseCurrencyChange && (
        <div className="lf-bento-ccy lf-bento-pressable" role="group" aria-label="Base currency">
          <button
            type="button"
            className={meta.baseCurrency === "RUB" ? "lf-bento-ccy__btn lf-bento-ccy__btn--on" : "lf-bento-ccy__btn"}
            onClick={() => meta.onBaseCurrencyChange!("RUB")}
          >
            ₽
          </button>
          <button
            type="button"
            className={meta.baseCurrency === "USD" ? "lf-bento-ccy__btn lf-bento-ccy__btn--on" : "lf-bento-ccy__btn"}
            onClick={() => meta.onBaseCurrencyChange!("USD")}
          >
            $
          </button>
        </div>
      )}
      {spot != null && eff != null && (
        <div className="lf-topbar__fx lf-mono">
          SPOT {fmtRate(spot)}
          <br />
          EFF {fmtRate(eff)} ₽/$
        </div>
      )}
    </header>
  );
}
