import { createClient } from "@/lib/supabase/server";
import { fetchFxRates, getRubPerUsd, effRate } from "@/lib/fx";
import type { WindDownItem } from "@/lib/winddown";
import WindDownTerminal from "../components/terminal/WindDownTerminal";

export default async function WindDownPage() {
  const supabase = createClient();
  const [{ data: itemsData }, rates] = await Promise.all([
    supabase.from("joint_winddown").select("*").order("created_at", { ascending: true }),
    fetchFxRates(),
  ]);

  const spot = getRubPerUsd(rates, "spot");
  const eff = effRate(spot);
  const items = (itemsData ?? []) as WindDownItem[];

  return <WindDownTerminal initialItems={items} spot={spot} eff={eff} />;
}
