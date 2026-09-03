import { brandFor } from "@/lib/bank-brand";
import type { AccountRow } from "@/lib/liquidity";

type Props = {
  account: Pick<AccountRow, "name" | "type" | "currency">;
  className?: string;
};

export default function MonogramBadge({ account, className }: Props) {
  const brand = brandFor(account);
  return (
    <span
      className={`lf-bento-badge${brand.sm ? " lf-bento-badge--sm" : ""}${className ? ` ${className}` : ""}`}
      style={{ backgroundColor: brand.bg, color: brand.fg }}
      aria-hidden
    >
      {brand.label}
    </span>
  );
}
