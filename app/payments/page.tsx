import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import type { AccountRow } from "@/lib/liquidity";
import { parseObligationRow } from "@/lib/obligations";
import PaymentsTerminal from "../components/terminal/PaymentsTerminal";

export default async function PaymentsPage() {
  const supabase = createClient();
  const [{ data: oblData }, { data: accData }, rates] = await Promise.all([
    supabase
      .from("obligations")
      .select(
        "id, name, kind, currency, balance, apr, due_date, due_day, monthly_payment, min_payment, payoff_date, status, notes, account_id",
      )
      .eq("status", "active")
      .order("name"),
    supabase.from("accounts").select("id, name, currency, type, balance").eq("in_net_worth", true),
    fetchFxRates(),
  ]);
  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);

  const obligations = (oblData ?? []).map((r) => parseObligationRow(r as Record<string, unknown>));
  const accounts = (accData ?? []) as Pick<AccountRow, "id" | "name" | "currency" | "type" | "balance">[];

  return (
    <PaymentsTerminal initialObligations={obligations} initialAccounts={accounts} spot={spot} eff={eff} />
  );
}
