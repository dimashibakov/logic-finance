import { brandFor } from "@/lib/bank-brand";
import type { AccountRow } from "@/lib/liquidity";

type Props = {
  account: Pick<AccountRow, "name" | "type" | "currency">;
};

export default function AccountBadge({ account }: Props) {
  const brand = brandFor(account);
  // TODO: optional logo fallback by institution domain (e.g. logo.clearbit.com) when monogram is insufficient.

  return (
    <span
      className={`lf-acct-badge${brand.sm ? " lf-acct-badge--sm" : ""}`}
      style={{ backgroundColor: brand.bg, color: brand.fg }}
      aria-hidden
    >
      {brand.label}
    </span>
  );
}
