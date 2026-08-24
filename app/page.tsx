import { supabase } from "@/lib/supabase";
import { fetchFxRates, getRubPerUsd } from "@/lib/fx";
import { fmtRate, rub, toUsd, usd } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

type Account = { name: string; currency: string; type: string; zone: string; balance: number; in_net_worth: boolean };
type Obligation = { name: string; currency: string; balance: number; apr: number | null };

export default async function Home() {
  const [{ data: accData }, { data: oblData }, rates] = await Promise.all([
    supabase.from("accounts").select("*").eq("in_net_worth", true),
    supabase.from("obligations").select("*"),
    fetchFxRates(),
  ]);
  const rubPerUsd = getRubPerUsd(rates, "spot");
  const accounts = (accData ?? []) as Account[];
  const obligations = (oblData ?? []) as Obligation[];

  const assets = accounts.reduce((s, a) => s + toUsd(Number(a.balance), a.currency, rubPerUsd), 0);
  const debt = obligations.reduce((s, o) => s + toUsd(Number(o.balance), o.currency, rubPerUsd), 0);
  const net = assets - debt;

  const rubZone = accounts.filter((a) => a.currency === "RUB").reduce((s, a) => s + Number(a.balance), 0);
  const usdZone = accounts.filter((a) => a.currency === "USD").reduce((s, a) => s + Number(a.balance), 0);

  const top = [...accounts].sort((a, b) => Math.abs(toUsd(Number(b.balance), b.currency, rubPerUsd)) - Math.abs(toUsd(Number(a.balance), a.currency, rubPerUsd))).slice(0, 6);

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <div style={S.header}>
          <span style={S.title}>ПОРТФЕЛЬ · Logic Finance</span>
          <span style={{ ...S.mono, fontSize: 12, color: C.sub }}>USD/RUB {fmtRate(rubPerUsd)}</span>
        </div>

        <div style={S.label}>ЧИСТЫЙ КАПИТАЛ</div>
        <div style={{ ...S.mono, fontSize: 38, fontWeight: 600, color: C.ink, letterSpacing: "-0.02em", marginTop: 2 }}>{usd(net)}</div>
        <div style={{ ...S.mono, fontSize: 12, color: C.sub, marginTop: 4 }}>активы {usd(assets)} − долг {usd(debt)}</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "16px 0" }}>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>RUB zone</div>
            <div style={{ ...S.mono, fontSize: 20, fontWeight: 600, color: C.ink, marginTop: 3 }}>{rub(rubZone)}</div>
            <div style={{ ...S.mono, fontSize: 11, color: C.up }}>{usd(toUsd(rubZone, "RUB", rubPerUsd))}</div>
          </div>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>USD zone</div>
            <div style={{ ...S.mono, fontSize: 20, fontWeight: 600, color: C.ink, marginTop: 3 }}>{usd(usdZone)}</div>
            <div style={{ ...S.mono, fontSize: 11, color: usdZone >= 0 ? C.up : C.down }}>наличные+карты</div>
          </div>
        </div>

        <div style={{ ...S.label, marginBottom: 8 }}>СЧЕТА И АКТИВЫ</div>
        <div style={{ ...S.card, padding: 0 }}>
          {top.map((a, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: i < top.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.ink }}>{a.name}</div>
                <div style={{ ...S.mono, fontSize: 11, color: C.faint }}>{a.type} · {a.zone}</div>
              </div>
              <div style={{ ...S.mono, fontSize: 13, fontWeight: 600, color: Number(a.balance) < 0 ? C.down : C.ink }}>
                {a.currency === "USD" ? usd(Number(a.balance)) : rub(Number(a.balance))}
              </div>
            </div>
          ))}
          {top.length === 0 && <div style={{ padding: 16, fontSize: 13, color: C.sub }}>Нет данных — проверь подключение к Supabase (.env.local).</div>}
        </div>

        <div style={{ ...S.card, marginTop: 12, background: "#F0F4FF", borderColor: "#1652F022", display: "flex", gap: 10 }}>
          <span style={{ ...S.mono, color: C.blue, fontWeight: 600 }}>i</span>
          <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
            Данные живые из Supabase ({accounts.length} счетов, {obligations.length} обязательств). Дальше — экраны Курсы · Конвертация · Долги · План.
          </div>
        </div>
      </div>
    </div>
  );
}
