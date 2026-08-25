import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { fmtRate } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

type Props = { title?: string; subtitle?: string };

export default async function RateHeader({ title = "Portfolio · Logic Finance", subtitle }: Props) {
  const rates = await fetchFxRates();
  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);

  return (
    <header style={S.header}>
      <div>
        <div style={S.title}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>{subtitle}</div>}
      </div>
      <div style={{ ...S.mono, fontSize: 11, color: C.faint, textAlign: "right", lineHeight: 1.5 }}>
        SPOT <b style={{ color: C.ink, fontWeight: 600 }}>{fmtRate(spot)}</b>
        <br />
        EFF <b style={{ color: C.ink, fontWeight: 600 }}>{fmtRate(eff)}</b> ₽/$
      </div>
    </header>
  );
}
