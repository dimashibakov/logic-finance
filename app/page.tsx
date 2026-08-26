import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, toUsd } from "@/lib/fx";
import { groupAccounts, illiquidUsdTotal, liquidUsdTotal, type AccountRow } from "@/lib/liquidity";
import { computeNetWorth } from "@/lib/networth";
import { fmtNative, usd } from "@/lib/format";
import { V } from "@/lib/tokens";
import RateHeader from "./components/RateHeader";
import AccountGroup from "./components/AccountGroup";

type Obligation = {
  id: string;
  name: string;
  currency: string;
  balance: number;
  due_date: string | null;
  monthly_payment: number | null;
  kind: string;
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
  const supabase = createClient();
  const [{ data: accData }, { data: oblData }, rates] = await Promise.all([
    supabase.from("accounts").select("*").eq("in_net_worth", true),
    supabase.from("obligations").select("id, name, currency, balance, due_date, monthly_payment, kind").eq("status", "active"),
    fetchFxRates(),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const toUsdSpot = (n: number, c: string) => toUsd(n, c, spot);

  const accounts = (accData ?? []) as AccountRow[];
  const obligations = (oblData ?? []) as Obligation[];

  const { assets, debt, net } = computeNetWorth(accounts, obligations, toUsdSpot);

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
    <div className="lf-wrap">
      <div className="lf-phone">
        <RateHeader />

        <div style={{ marginTop: 6 }}>
          <div className="lf-eyebrow">Net worth</div>
          <div className="lf-net-worth lf-mono">{usd(net)}</div>
          <div className="lf-mono lf-text-faint" style={{ fontSize: 12, marginTop: 2 }}>
            assets {usd(assets)} − debt <span className="lf-text-danger">{usd(debt)}</span>
          </div>
        </div>

        <div className="lf-split">
          <div className="lf-card" style={{ padding: 14 }}>
            <div className="lf-label">Liquid</div>
            <div className="lf-split__v lf-mono">{usd(liquid)}</div>
            <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 3 }}>
              banks + cash − cards
            </div>
          </div>
          <div className="lf-card" style={{ padding: 14 }}>
            <div className="lf-label">Illiquid</div>
            <div className="lf-split__v lf-mono lf-text-faint">{usd(illiquid)}</div>
            <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 3 }}>
              real estate + vehicles
            </div>
          </div>
        </div>

        <div className="lf-asset-bar">
          <div style={{ width: `${liquidPct}%`, height: "100%", background: V.accent }} />
          <div style={{ width: `${illiquidPct}%`, height: "100%", background: V.illiquidBar }} />
        </div>
        <div className="lf-mono lf-hint" style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 10.5 }}>
          <span>liquid {liquidPct}%</span>
          <span>illiquid {illiquidPct}%</span>
        </div>

        {alertObl && (
          <>
            <div className="lf-alert lf-only-terminal">
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1, color: V.warn }} />
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                <b>{alertObl.name}</b> — due <span style={{ color: V.warn }}>{fmtDue(alertObl.due_date!)}</span>. Not covered by free{" "}
                {alertObl.currency} cash in zone; plan early payoff from RUB cash.
              </div>
            </div>
            <div className="lf-alert lf-only-brutalist">
              <span className="lf-alert__big lf-mono">{fmtNative(Math.abs(Number(alertObl.balance)), alertObl.currency)}</span>
              <span className="lf-alert__txt">
                {alertObl.name}
                <br />
                due {fmtDue(alertObl.due_date!)} — cover it
              </span>
            </div>
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <div className="lf-sec-label">
              <span className="lf-sec-label__h">Upcoming payments</span>
              <Link href="/plan" className="lf-sec-label__m">
                all →
              </Link>
            </div>
            <div className="lf-card lf-card--flush">
              {upcoming.map((o) => {
                const due = o.due_date!;
                const days = daysUntil(due);
                const hot = days <= 45 && Math.abs(Number(o.balance)) > freeCashByZone(accounts, o.currency === "RUB" ? "RF" : "US", o.currency);
                return (
                  <div key={o.id} className="lf-row">
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 550 }}>
                        {o.name}
                        {hot && <span className="lf-hot">hot</span>}
                      </div>
                      <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 2 }}>
                        {o.monthly_payment ? "installment + balance" : "autopay"}
                      </div>
                    </div>
                    <div className={`lf-mono${hot ? " lf-text-danger" : ""}`} style={{ fontSize: 14, fontWeight: 600, textAlign: "right" }}>
                      {fmtNative(Math.abs(Number(o.balance)), o.currency)}
                      <span className="lf-text-faint" style={{ display: "block", fontSize: 10, fontWeight: 500, marginTop: 2 }}>
                        {fmtDue(due)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="lf-sec-label">
          <span className="lf-sec-label__h">Accounts & assets</span>
          <span className="lf-sec-label__m">{accounts.length} accounts</span>
        </div>
        <AccountGroup title="Liquid · RF banks" accounts={groups.liquidRf} spot={spot} />
        <AccountGroup title="Liquid · US banks" accounts={groups.liquidUs} spot={spot} defaultOpen={false} />
        <AccountGroup title="Cards · debt" accounts={groups.cardsDebt} spot={spot} defaultOpen={false} />
        <AccountGroup title="Illiquid · assets" accounts={groups.illiquid} spot={spot} defaultOpen={false} />
      </div>
    </div>
  );
}
