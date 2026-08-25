import { supabase } from "@/lib/supabase";
import { fetchFxRates, getRubPerUsd, effRate, toUsd } from "@/lib/fx";
import { groupAccounts, illiquidUsdTotal, liquidUsdTotal, type AccountRow } from "@/lib/liquidity";
import { fmtNative, usd } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";
import RateHeader from "./components/RateHeader";
import AccountGroup from "./components/AccountGroup";

type Obligation = {
  id: string;
  name: string;
  currency: string;
  balance: number;
  due_date: string | null;
  monthly_payment: number | null;
};

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(`${dateStr}T12:00:00`).getTime() - Date.now()) / 86400000);
}

function freeCashByZone(accounts: AccountRow[], zone: string, currency: string) {
  return accounts
    .filter((a) => a.zone === zone && a.currency === currency && ["cash", "checking", "savings"].includes(a.type))
    .reduce((s, a) => s + Math.max(0, Number(a.balance)), 0);
}

export default async function Home() {
  const [{ data: accData }, { data: oblData }, rates] = await Promise.all([
    supabase.from("accounts").select("*").eq("in_net_worth", true),
    supabase.from("obligations").select("id, name, currency, balance, due_date, monthly_payment").eq("status", "active"),
    fetchFxRates(),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);
  const toUsdSpot = (n: number, c: string) => toUsd(n, c, spot);

  const accounts = (accData ?? []) as AccountRow[];
  const obligations = (oblData ?? []) as Obligation[];

  const assets = accounts.filter((a) => Number(a.balance) > 0).reduce((s, a) => s + toUsdSpot(Number(a.balance), a.currency), 0);
  const debt = accounts.filter((a) => Number(a.balance) < 0).reduce((s, a) => s + toUsdSpot(Math.abs(Number(a.balance)), a.currency), 0);
  const net = assets - debt;

  const liquid = liquidUsdTotal(accounts, toUsdSpot);
  const illiquid = illiquidUsdTotal(accounts, toUsdSpot);
  const totalPos = liquid + illiquid;
  const liquidPct = totalPos > 0 ? Math.round((liquid / totalPos) * 100) : 0;

  const groups = groupAccounts(accounts);

  const upcoming = [...obligations]
    .filter((o) => o.due_date)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
    .slice(0, 6);

  const alertObl = obligations.find((o) => {
    if (!o.due_date) return false;
    const days = daysUntil(o.due_date);
    if (days > 45) return false;
    const need = Math.abs(Number(o.balance));
    const cash = freeCashByZone(accounts, o.currency === "RUB" ? "RF" : "US", o.currency);
    return need > cash;
  });

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <RateHeader title="Overview" />

        <div style={S.label}>Net worth</div>
        <div style={{ ...S.mono, fontSize: 36, fontWeight: 600, color: C.ink, letterSpacing: "-0.02em" }}>{usd(net)}</div>
        <div style={{ ...S.mono, fontSize: 11, color: C.faint, marginTop: 6 }}>
          assets {usd(assets)} − debt <span style={{ color: C.debt }}>{usd(debt)}</span>
        </div>
        <div style={{ ...S.mono, fontSize: 10, color: C.faint, marginTop: 4 }}>
          SPOT {spot.toFixed(2)} · EFF {eff.toFixed(2)} ₽/$
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "16px 0 12px" }}>
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: 6 }}>Liquid</div>
            <div style={{ ...S.mono, fontSize: 18, fontWeight: 600, color: C.ink }}>{usd(liquid)}</div>
          </div>
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: 6 }}>Illiquid</div>
            <div style={{ ...S.mono, fontSize: 18, fontWeight: 600, color: C.ink }}>{usd(illiquid)}</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", ...S.mono, fontSize: 10, color: C.faint, marginBottom: 6 }}>
            <span>Liquid share</span>
            <span>{liquidPct}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: C.line, overflow: "hidden" }}>
            <div style={{ width: `${liquidPct}%`, height: "100%", background: C.accent, borderRadius: 99 }} />
          </div>
        </div>

        {alertObl && (
          <div style={{ ...S.card, background: C.warnBg, borderColor: `${C.warn}33`, marginBottom: 12, padding: 12 }}>
            <div style={{ ...S.label, color: C.warn, marginBottom: 4 }}>Liquidity alert</div>
            <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.45 }}>
              {alertObl.name}: {fmtNative(Number(alertObl.balance), alertObl.currency)} due {alertObl.due_date} — not covered by free {alertObl.currency} cash in zone.
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <>
            <div style={{ ...S.label, marginBottom: 8 }}>Upcoming payments</div>
            <div style={{ ...S.card, padding: 0, marginBottom: 14 }}>
              {upcoming.map((o, i) => {
                const due = o.due_date!;
                const days = daysUntil(due);
                const hot = days <= 14 && Math.abs(Number(o.balance)) > freeCashByZone(accounts, o.currency === "RUB" ? "RF" : "US", o.currency);
                return (
                  <div
                    key={o.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "11px 14px",
                      borderBottom: i < upcoming.length - 1 ? `1px solid ${C.line}` : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{o.name}</div>
                      <div style={{ ...S.mono, fontSize: 10, color: C.faint, marginTop: 2 }}>{due}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ ...S.mono, fontSize: 13, fontWeight: 600, color: C.debt }}>
                        {fmtNative(Math.abs(Number(o.balance)), o.currency)}
                      </div>
                      {hot && (
                        <span style={{ ...S.mono, fontSize: 9, color: C.debt, fontWeight: 700, letterSpacing: "0.08em" }}>DUE</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={{ ...S.label, marginBottom: 8 }}>Accounts</div>
        <AccountGroup title="Liquid · RF banks" accounts={groups.liquidRf} spot={spot} />
        <AccountGroup title="Liquid · US banks" accounts={groups.liquidUs} spot={spot} />
        <AccountGroup title="Cards · debt" accounts={groups.cardsDebt} spot={spot} />
        <AccountGroup title="Illiquid · assets" accounts={groups.illiquid} spot={spot} defaultOpen={false} />
      </div>
    </div>
  );
}
