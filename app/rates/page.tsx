import { fetchFxRates, getRubPerUsd, effectivePremiumPct, latestByKind } from "@/lib/fx";
import { fmtPct, fmtRate } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

export default async function RatesPage() {
  const rates = await fetchFxRates();
  const spotRate = getRubPerUsd(rates, "spot");
  const effectiveRate = getRubPerUsd(rates, "effective");
  const cbrRate = getRubPerUsd(rates, "cbr");
  const spot = latestByKind(rates, "spot");
  const effective = latestByKind(rates, "effective");
  const cbr = latestByKind(rates, "cbr");
  const premium = effectivePremiumPct(spotRate, effectiveRate);

  const rows = [
    { label: "Spot", rate: spotRate, date: spot?.rate_date },
    { label: "Your effective rate", rate: effectiveRate, date: effective?.rate_date },
    { label: "CBR on transfer date", rate: cbrRate, date: cbr?.rate_date },
  ];

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <div style={S.header}>
          <span style={S.title}>RATES · Logic Finance</span>
        </div>

        <div style={{ ...S.label, marginBottom: 4 }}>USD/RUB</div>
        <div style={{ ...S.mono, fontSize: 38, fontWeight: 600, color: C.ink, letterSpacing: "-0.02em" }}>{fmtRate(spotRate)}</div>
        {spot && <div style={{ ...S.mono, fontSize: 11, color: C.faint, marginTop: 4 }}>spot · {spot.rate_date}</div>}

        <div style={{ ...S.mono, fontSize: 13, color: C.down, marginTop: 12, fontWeight: 500 }}>
          Effective premium {fmtPct(premium)}
        </div>

        <div style={{ ...S.label, marginTop: 20, marginBottom: 8 }}>RATES</div>
        <div style={{ ...S.card, padding: 0 }}>
          {rows.map((row, i) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none",
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.ink }}>{row.label}</div>
                {row.date && <div style={{ ...S.mono, fontSize: 11, color: C.faint }}>{row.date}</div>}
              </div>
              <div style={{ ...S.mono, fontSize: 14, fontWeight: 600, color: C.ink }}>{fmtRate(row.rate)}</div>
            </div>
          ))}
          {rates.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, color: C.sub }}>No data — check fx_rates table in Supabase.</div>
          )}
        </div>

        <div style={{ ...S.card, marginTop: 12, background: "#F0F4FF", borderColor: "#1652F022", display: "flex", gap: 10 }}>
          <span style={{ ...S.mono, color: C.blue, fontWeight: 600 }}>i</span>
          <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
            Effective ≈ real ₽→$ cost via father → USDC → Coinbase.
          </div>
        </div>
      </div>
    </div>
  );
}
