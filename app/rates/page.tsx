import { supabase } from "@/lib/supabase";
import { fetchFxRates, latestByKind, deltaForKind } from "@/lib/fx";
import { fmtDelta, fmtRate } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

const KIND_LABELS: Record<string, string> = {
  spot: "Spot USD/RUB",
  effective: "Effective USD/RUB",
  cbr: "Курс ЦБ",
};

export default async function RatesPage() {
  const rates = await fetchFxRates();
  const spot = latestByKind(rates, "spot");
  const effective = latestByKind(rates, "effective");
  const cbr = latestByKind(rates, "cbr");

  const quotes = (["spot", "effective", "cbr"] as const).map((kind) => {
    const latest = latestByKind(rates, kind);
    const delta = deltaForKind(rates, kind);
    return { kind, latest, delta };
  });

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <div style={S.header}>
          <span style={S.title}>КУРСЫ · Logic Finance</span>
          {spot && <span style={{ ...S.mono, fontSize: 12, color: C.sub }}>{fmtRate(Number(spot.rub_per_usd))}</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>Spot USD/RUB</div>
            <div style={{ ...S.mono, fontSize: 22, fontWeight: 600, color: C.ink, marginTop: 4 }}>
              {spot ? fmtRate(Number(spot.rub_per_usd)) : "—"}
            </div>
            {spot && <div style={{ ...S.mono, fontSize: 11, color: C.faint, marginTop: 2 }}>{spot.rate_date}</div>}
          </div>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>Effective USD/RUB</div>
            <div style={{ ...S.mono, fontSize: 22, fontWeight: 600, color: C.ink, marginTop: 4 }}>
              {effective ? fmtRate(Number(effective.rub_per_usd)) : "—"}
            </div>
            {effective && <div style={{ ...S.mono, fontSize: 11, color: C.faint, marginTop: 2 }}>{effective.rate_date}</div>}
          </div>
        </div>

        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>Курс ЦБ</div>
          <div style={{ ...S.mono, fontSize: 28, fontWeight: 600, color: C.ink, marginTop: 4 }}>
            {cbr ? fmtRate(Number(cbr.rub_per_usd)) : "—"}
          </div>
          {cbr && <div style={{ ...S.mono, fontSize: 11, color: C.faint, marginTop: 2 }}>на {cbr.rate_date}</div>}
        </div>

        <div style={{ ...S.label, marginBottom: 8 }}>КОТИРОВКИ</div>
        <div style={{ ...S.card, padding: 0 }}>
          {quotes.map(({ kind, latest, delta }, i) => (
            <div
              key={kind}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                borderBottom: i < quotes.length - 1 ? `1px solid ${C.line}` : "none",
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.ink }}>{KIND_LABELS[kind]}</div>
                <div style={{ ...S.mono, fontSize: 11, color: C.faint }}>{latest?.rate_date ?? "нет данных"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ ...S.mono, fontSize: 14, fontWeight: 600, color: C.ink }}>
                  {latest ? fmtRate(Number(latest.rub_per_usd)) : "—"}
                </div>
                {delta !== null && (
                  <div style={{ ...S.mono, fontSize: 11, color: delta <= 0 ? C.up : C.down, marginTop: 2 }}>
                    {fmtDelta(delta)}
                  </div>
                )}
              </div>
            </div>
          ))}
          {rates.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, color: C.sub }}>Нет данных — проверь таблицу fx_rates в Supabase.</div>
          )}
        </div>
      </div>
    </div>
  );
}
