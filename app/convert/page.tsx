import { fetchFxRates, getRubPerUsd } from "@/lib/fx";
import { fmtRate } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";
import ConvertForm from "./ConvertForm";

export default async function ConvertPage() {
  const rates = await fetchFxRates();
  const cbrRate = getRubPerUsd(rates, "cbr");
  const effectiveRate = getRubPerUsd(rates, "effective");

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <div style={S.header}>
          <span style={S.title}>CONVERT · Logic Finance</span>
          <span style={{ ...S.mono, fontSize: 12, color: C.sub }}>{fmtRate(effectiveRate)} eff.</span>
        </div>

        <div style={{ ...S.label, marginBottom: 4 }}>₽ → $</div>
        <div style={{ ...S.mono, fontSize: 12, color: C.sub, marginBottom: 16 }}>
          at effective rate · CBR {fmtRate(cbrRate)}
        </div>

        <ConvertForm cbrRate={cbrRate} effectiveRate={effectiveRate} />
      </div>
    </div>
  );
}
