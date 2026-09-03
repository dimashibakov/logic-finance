import Link from "next/link";
import { Fragment } from "react";
import type { AccountRow } from "@/lib/liquidity";
import {
  accountDisplayAmounts,
  fmtUpdatedShort,
  sumZoneBalances,
  type BaseCurrency,
} from "@/lib/bento-overview";
import MonogramBadge from "./MonogramBadge";

type Group = { title: string; accounts: AccountRow[] };

type Props = {
  groups: Group[];
  spot: number;
  baseCurrency: BaseCurrency;
  liquidRubBasis: number;
};

function AccountTableRow({
  account,
  spot,
  baseCurrency,
  liquidRubBasis,
}: {
  account: AccountRow;
  spot: number;
  baseCurrency: BaseCurrency;
  liquidRubBasis: number;
}) {
  const { stale, isDebt, colRub, colUsd, pct } = accountDisplayAmounts(
    account,
    spot,
    baseCurrency,
    liquidRubBasis
  );
  const sign = isDebt ? "−" : "";

  return (
    <tr>
      <td>
        <Link href={`/account/${account.id}`} className="lf-bento-acct lf-bento-pressable">
          <MonogramBadge account={account} />
          <span className="lf-bento-acct__name">{account.name}</span>
        </Link>
      </td>
      <td className="lf-bento-sub">{account.type.replace(/_/g, " ").toUpperCase()}</td>
      <td className="lf-bento-sub">{fmtUpdatedShort(account.updated_at, account.balance_date)}</td>
      <td className={`lf-bento-num${baseCurrency === "RUB" ? " lf-bento-num--primary" : ""}${isDebt ? " lf-text-danger" : ""}`}>
        {stale ? "···" : `${sign}${colRub}`}
      </td>
      <td className={`lf-bento-num lf-bento-num--alt${baseCurrency === "USD" ? " lf-bento-num--primary" : ""}${isDebt ? " lf-text-danger" : ""}`}>
        {stale ? "···" : `${sign}${colUsd}`}
      </td>
      <td className="lf-bento-num lf-bento-num--pct">{stale ? "—" : `${pct}%`}</td>
    </tr>
  );
}

export default function AccountsTable({ groups, spot, baseCurrency, liquidRubBasis }: Props) {
  return (
    <div className="lf-bento-table-wrap">
      <table className="lf-bento-table">
        <thead>
          <tr>
            <th>ACCOUNT</th>
            <th>TYPE</th>
            <th>UPDATED</th>
            <th className="lf-bento-r">₽</th>
            <th className="lf-bento-r">$</th>
            <th className="lf-bento-r">% LIQ</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            if (group.accounts.length === 0) return null;
            const totals = sumZoneBalances(group.accounts);
            const rubCol = `₽${Math.round(totals.rub).toLocaleString("en-US")}`;
            const usdCol = `$${Math.round(totals.usd).toLocaleString("en-US")}`;

            return (
              <Fragment key={group.title}>
                <tr className="lf-bento-grp">
                  <td colSpan={6}>{group.title}</td>
                </tr>
                {group.accounts.map((account) => (
                  <AccountTableRow
                    key={account.id}
                    account={account}
                    spot={spot}
                    baseCurrency={baseCurrency}
                    liquidRubBasis={liquidRubBasis}
                  />
                ))}
                <tr className="lf-bento-subtot">
                  <td colSpan={3}>Subtotal</td>
                  <td className={`lf-bento-num${baseCurrency === "RUB" ? " lf-bento-num--primary" : ""}`}>{rubCol}</td>
                  <td className={`lf-bento-num lf-bento-num--alt${baseCurrency === "USD" ? " lf-bento-num--primary" : ""}`}>{usdCol}</td>
                  <td />
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
