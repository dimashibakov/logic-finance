"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import DesktopPageBridge from "./DesktopPageBridge";
import DataTable from "./DataTable";
import { fmtNative, formatTxDate } from "@/lib/format";

type AccountOption = { id: string; name: string };

type TxRow = {
  id: string;
  ts: string;
  amount: number;
  currency: string;
  type: string;
  merchant: string | null;
  notes: string | null;
  account_id: string | null;
  accountName?: string | null;
  categoryName?: string | null;
};

type InitialFilters = {
  account?: string;
  type?: string;
  month?: string;
};

type Props = {
  spot: number;
  eff: number;
  txs: TxRow[];
  accounts: AccountOption[];
  initialFilters: InitialFilters;
};

const TYPE_OPTIONS = ["income", "expense", "transfer"] as const;

function txLabel(tx: TxRow) {
  return tx.merchant || tx.categoryName || tx.notes || tx.type;
}

function signedAmount(tx: TxRow) {
  const amt = Math.abs(Number(tx.amount));
  const prefix = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
  return `${prefix}${fmtNative(amt, tx.currency)}`;
}

function monthOptions(txs: TxRow[]) {
  const set = new Set<string>();
  for (const tx of txs) {
    set.add(tx.ts.slice(0, 7));
  }
  return [...set].sort((a, b) => b.localeCompare(a));
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`lf-bento-nav__link lf-bento-pressable${active ? " lf-bento-nav__link--on" : ""}`}
      style={{ fontSize: 11, padding: "6px 10px" }}
    >
      {children}
    </Link>
  );
}

export default function HistoryDesktop({ spot, eff, txs, accounts, initialFilters }: Props) {
  const pathname = usePathname();
  const { account, type, month } = initialFilters;

  const months = useMemo(() => monthOptions(txs), [txs]);

  const filtered = useMemo(() => {
    return txs.filter((tx) => {
      if (account && tx.account_id !== account) return false;
      if (type && tx.type !== type) return false;
      if (month && !tx.ts.startsWith(month)) return false;
      return true;
    });
  }, [txs, account, type, month]);

  function qs(patch: Partial<InitialFilters>) {
    const next = { account, type, month, ...patch };
    const params = new URLSearchParams();
    if (next.account) params.set("account", next.account);
    if (next.type) params.set("type", next.type);
    if (next.month) params.set("month", next.month);
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  }

  function clearHref(except?: keyof InitialFilters) {
    const next: InitialFilters = {};
    if (except !== "account" && account) next.account = account;
    if (except !== "type" && type) next.type = type;
    if (except !== "month" && month) next.month = month;
    const params = new URLSearchParams();
    if (next.account) params.set("account", next.account);
    if (next.type) params.set("type", next.type);
    if (next.month) params.set("month", next.month);
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  }

  return (
    <div className="lf-page-desktop">
      <DesktopPageBridge title="History" spot={spot} eff={eff}>
        <div className="lf-desktop-page">
          <div className="lf-desktop-pagehead">
            <div className="lf-bento-nav" style={{ flexWrap: "wrap", gap: 4 }}>
              <FilterChip href={clearHref("account")} active={!account}>
                all accounts
              </FilterChip>
              {accounts.map((a) => (
                <FilterChip key={a.id} href={qs({ account: a.id })} active={account === a.id}>
                  {a.name}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="lf-desktop-pagehead" style={{ paddingTop: 0 }}>
            <div className="lf-bento-nav" style={{ flexWrap: "wrap", gap: 4 }}>
              <FilterChip href={clearHref("type")} active={!type}>
                all types
              </FilterChip>
              {TYPE_OPTIONS.map((t) => (
                <FilterChip key={t} href={qs({ type: t })} active={type === t}>
                  {t}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="lf-desktop-pagehead" style={{ paddingTop: 0 }}>
            <div className="lf-bento-nav" style={{ flexWrap: "wrap", gap: 4 }}>
              <FilterChip href={clearHref("month")} active={!month}>
                all months
              </FilterChip>
              {months.map((m) => (
                <FilterChip key={m} href={qs({ month: m })} active={month === m}>
                  {new Date(`${m}-01T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </FilterChip>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="lf-bento-sub">No transactions match these filters.</p>
          ) : (
            <DataTable flush className="lf-data-table--dense">
              <thead>
                <tr>
                  <th>DESCRIPTION</th>
                  <th>ACCOUNT</th>
                  <th className="lf-bento-r">DATE</th>
                  <th className="lf-bento-r">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <div style={{ fontWeight: 550 }}>{txLabel(tx)}</div>
                      <div className="lf-mono lf-text-faint" style={{ fontSize: 10.5, marginTop: 2 }}>
                        {tx.type}
                      </div>
                    </td>
                    <td className="lf-bento-sub">
                      {tx.account_id ? (
                        <Link href={`/account/${tx.account_id}`}>{tx.accountName ?? "—"}</Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="lf-bento-num lf-bento-sub">{formatTxDate(tx.ts)}</td>
                    <td className="lf-bento-num lf-mono">{signedAmount(tx)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </div>
      </DesktopPageBridge>
    </div>
  );
}
