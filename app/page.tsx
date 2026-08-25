import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchFxRates, getRubPerUsd, toUsd } from "@/lib/fx";
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

function fmtDue(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toLowerCase();
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
  const illiquidPct = 100 - liquidPct;

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
        <RateHeader />

        <div style={{ marginTop: 6 }}>
          <div style={S.eyebrow}>Net worth</div>
          <div style={{ ...S.mono, fontSize: 44, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.05, margin: "6px 0 2px", color: C.ink }}>
            {usd(net)}
          </div>
          <div style={{ ...S.mono, fontSize: 12, color: C.faint }}>
            assets {usd(assets)} − debt <span style={{ color: C.debt }}>{usd(debt)}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          <div style={{ ...S.card, padding: 14 }}>
            <div style={{ ...S.label, marginBottom: 0 }}>Liquid</div>
            <div style={{ ...S.mono, fontSize: 22, fontWeight: 600, marginTop: 8, color: C.ink }}>{usd(liquid)}</div>
            <div style={{ ...S.mono, fontSize: 11, color: C.faint, marginTop: 3 }}>banks + cash − cards</div>
          </div>
          <div style={{ ...S.card, padding: 14 }}>
            <div style={{ ...S.label, marginBottom: 0 }}>Illiquid</div>
            <div style={{ ...S.mono, fontSize: 22, fontWeight: 600, marginTop: 8, color: C.faint }}>{usd(illiquid)}</div>
            <div style={{ ...S.mono, fontSize: 11, color: C.faint, marginTop: 3 }}>real estate + vehicles</div>
          </div>
        </div>

        <div style={{ height: 6, borderRadius: 4, background: C.line2, overflow: "hidden", marginTop: 12, display: "flex" }}>
          <div style={{ width: `${liquidPct}%`, height: "100%", background: C.accent }} />
          <div style={{ width: `${illiquidPct}%`, height: "100%", background: C.illiquidBar }} />
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 8, ...S.mono, fontSize: 10.5, color: C.sub }}>
          <span>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: C.accent, marginRight: 5, verticalAlign: "middle" }} />
            liquid {liquidPct}%
          </span>
          <span>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: C.illiquidBar, marginRight: 5, verticalAlign: "middle" }} />
            illiquid {illiquidPct}%
          </span>
        </div>

        {alertObl && (
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              background: C.warnBg,
              border: "1px solid #f0e0bd",
              borderRadius: 12,
              padding: "12px 14px",
              marginTop: 14,
            }}
          >
            <AlertTriangle size={18} color={C.warn} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, lineHeight: 1.4, color: C.ink }}>
              <b>{alertObl.name}</b> — due <span style={{ color: C.warn }}>{fmtDue(alertObl.due_date!)}</span>. Not covered by free {alertObl.currency} cash in zone; plan early payoff from RUB cash.
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <>
            <div style={S.secLabel}>
              <span style={S.eyebrow}>Upcoming payments</span>
              <Link href="/plan" style={{ ...S.mono, fontSize: 11, color: C.accent, textDecoration: "none" }}>
                all →
              </Link>
            </div>
            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              {upcoming.map((o, i) => {
                const due = o.due_date!;
                const days = daysUntil(due);
                const hot = days <= 45 && Math.abs(Number(o.balance)) > freeCashByZone(accounts, o.currency === "RUB" ? "RF" : "US", o.currency);
                return (
                  <div
                    key={o.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      borderBottom: i < upcoming.length - 1 ? `1px solid ${C.line2}` : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 550, color: C.ink }}>{o.name}</div>
                      <div style={{ ...S.mono, fontSize: 11, color: C.faint, marginTop: 2 }}>
                        {o.monthly_payment ? "installment + balance" : "autopay"}
                        {hot && (
                          <span
                            style={{
                              ...S.mono,
                              fontSize: 9.5,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              padding: "2px 6px",
                              borderRadius: 5,
                              background: C.warnBg,
                              color: C.warn,
                              border: "1px solid #f0e0bd",
                              marginLeft: 8,
                            }}
                          >
                            hot
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ ...S.mono, fontSize: 14, fontWeight: 600, textAlign: "right", color: hot ? C.debt : C.ink }}>
                      {fmtNative(Math.abs(Number(o.balance)), o.currency)}
                      <span style={{ display: "block", fontSize: 10, fontWeight: 500, color: C.faint }}>{fmtDue(due)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={S.secLabel}>
          <span style={S.eyebrow}>Accounts & assets</span>
          <span style={{ ...S.mono, fontSize: 11, color: C.accent }}>{accounts.length} accounts</span>
        </div>
        <AccountGroup title="Liquid · RF banks" accounts={groups.liquidRf} spot={spot} />
        <AccountGroup title="Liquid · US banks" accounts={groups.liquidUs} spot={spot} defaultOpen={false} />
        <AccountGroup title="Cards · debt" accounts={groups.cardsDebt} spot={spot} defaultOpen={false} />
        <AccountGroup title="Illiquid · assets" accounts={groups.illiquid} spot={spot} defaultOpen={false} />
      </div>
    </div>
  );
}
