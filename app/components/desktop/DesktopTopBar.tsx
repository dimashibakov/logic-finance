"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAddSheet } from "../AddSheetContext";
import type { BaseCurrency } from "@/lib/bento-overview";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/convert", label: "Convert" },
  { href: "/debts", label: "Debts" },
  { href: "/plan", label: "Plan" },
  { href: "/import", label: "Import" },
] as const;

type Props = {
  spot: number;
  eff: number;
  baseCurrency?: BaseCurrency;
  onBaseCurrencyChange?: (c: BaseCurrency) => void;
  showCurrencyToggle?: boolean;
};

export default function DesktopTopBar({
  spot,
  eff,
  baseCurrency = "RUB",
  onBaseCurrencyChange,
  showCurrencyToggle = false,
}: Props) {
  const pathname = usePathname();
  const { openView } = useAddSheet();

  return (
    <header className="lf-bento-top">
      <div className="lf-bento-wordmark">LOGIC FINANCE</div>
      <nav className="lf-bento-nav" aria-label="Main">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`lf-bento-nav__link${active ? " lf-bento-nav__link--on" : ""}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="lf-bento-top__spacer" />
      {showCurrencyToggle && onBaseCurrencyChange && (
        <div className="lf-bento-ccy lf-bento-pressable" role="group" aria-label="Base currency">
          <button
            type="button"
            className={baseCurrency === "RUB" ? "lf-bento-ccy__btn lf-bento-ccy__btn--on" : "lf-bento-ccy__btn"}
            onClick={() => onBaseCurrencyChange("RUB")}
          >
            ₽
          </button>
          <button
            type="button"
            className={baseCurrency === "USD" ? "lf-bento-ccy__btn lf-bento-ccy__btn--on" : "lf-bento-ccy__btn"}
            onClick={() => onBaseCurrencyChange("USD")}
          >
            $
          </button>
        </div>
      )}
      <div className="lf-bento-fx lf-mono">
        SPOT {spot.toFixed(2)}
        <br />
        EFF {eff.toFixed(2)} ₽/$
      </div>
      <button type="button" className="lf-bento-add lf-bento-pressable lf-mono" onClick={() => openView("operation")}>
        + Add operation
      </button>
    </header>
  );
}
