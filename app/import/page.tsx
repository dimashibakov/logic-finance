import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import type { AccountOption, CategoryOption } from "@/lib/transactions";
import ImportTerminal from "../components/terminal/ImportTerminal";

export default async function ImportPage() {
  const supabase = createClient();
  const [{ data: accData }, { data: catData }, rates] = await Promise.all([
    supabase.from("accounts").select("id, name, currency, zone").eq("in_net_worth", true).order("name"),
    supabase.from("categories").select("id, name, kind, zone").order("name"),
    fetchFxRates(),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);

  return (
    <ImportTerminal
      accounts={(accData ?? []) as AccountOption[]}
      categories={(catData ?? []) as CategoryOption[]}
      spot={spot}
      eff={eff}
    />
  );
}
