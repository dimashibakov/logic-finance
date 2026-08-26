import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { fmtRate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "./ThemeToggle";
import SignOutButton from "./SignOutButton";

type Props = { title?: string; subtitle?: string };

export default async function RateHeader({ title = "Portfolio · Logic Finance", subtitle }: Props) {
  const supabase = createClient();
  const [{ data: { user } }, rates] = await Promise.all([
    supabase.auth.getUser(),
    fetchFxRates(),
  ]);
  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);

  return (
    <>
      <div className="lf-theme-bar" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
        <ThemeToggle />
        {user && <SignOutButton />}
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
