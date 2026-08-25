import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import { fmtRate } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

type Props = { title: string; subtitle?: string };

export default async function RateHeader({ title, subtitle }: Props) {
  const rates = await fetchFxRates();
  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);

  return (
    <div style={S.header}>
      <div>
        <div style={S.title}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>{subtitle}</div>}
      </div>
      <div style={{ ...S.mono, fontSize: 10, color: C.faint, textAlign: "right", lineHeight: 1.5, whiteSpace: "nowrap" }}>
        SPOT {fmtRate(spot)} · EFF {fmtRate(eff)} ₽/$
      </div>
    </div>
  );
}
