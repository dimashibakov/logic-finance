import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { fmtRate } from "@/lib/format";
import ThemeToggle from "./ThemeToggle";

type Props = { title?: string; subtitle?: string };

export default async function RateHeader({ title = "Portfolio · Logic Finance", subtitle }: Props) {
  const rates = await fetchFxRates();
  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);

  return (
    <>
      <div className="lf-theme-bar">
        <ThemeToggle />
      </div>
      <header className="lf-header">
        <div>
          {title === "Portfolio · Logic Finance" ? (
            <>
              <div className="lf-header__title lf-only-terminal">Portfolio · Logic Finance</div>
              <div className="lf-header__title lf-only-brutalist">◼ Logic Finance</div>
            </>
          ) : (
            <div className="lf-header__title">{title}</div>
          )}
          {subtitle && <div className="lf-header__sub">{subtitle}</div>}
        </div>
        <div className="lf-header__fx lf-mono">
          SPOT <b>{fmtRate(spot)}</b>
          <br />
          EFF <b>{fmtRate(eff)}</b> ₽/$
        </div>
      </header>
    </>
  );
}
