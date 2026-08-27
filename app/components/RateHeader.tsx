import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { fmtRate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

type Props = { title?: string; subtitle?: string };

export default async function RateHeader({ title, subtitle }: Props) {
  const supabase = createClient();
  const [{ data: { user } }, rates] = await Promise.all([
    supabase.auth.getUser(),
    fetchFxRates(),
  ]);
  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);
  const isOverview = !title;

  return (
    <header className="lf-header">
      <div className="lf-header__brand">
        {isOverview ? (
          <>
            <div className="lf-header__logo lf-only-terminal">Logic Finance</div>
            <div className="lf-header__logo lf-only-brutalist">LOGIC FINANCE</div>
          </>
        ) : (
          <>
            <div className="lf-header__logo lf-header__logo--page">{title}</div>
            {subtitle && <div className="lf-header__sub">{subtitle}</div>}
          </>
        )}
      </div>
      <div className="lf-header__right">
        <div className="lf-header__fx lf-mono">
          SPOT <b>{fmtRate(spot)}</b>
          <br />
          EFF <b>{fmtRate(eff)}</b> ₽/$
        </div>
        {user && <SignOutButton compact />}
      </div>
    </header>
  );
}
