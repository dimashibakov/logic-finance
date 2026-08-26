import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { accountNameForRef } from "@/lib/account-refs";
import { daysToDeadline, provisionalSettlement, windDownItems, type WindDownItem } from "@/lib/winddown";
import RateHeader from "../components/RateHeader";
import WindDownClient from "./WindDownClient";

export default async function WindDownPage() {
  const supabase = createClient();
  const jointName = accountNameForRef("bofa-5927")!;

  const [{ data: itemsData }, { data: accData }] = await Promise.all([
    supabase.from("joint_winddown").select("*").order("created_at", { ascending: true }),
    supabase.from("accounts").select("id, balance").eq("name", jointName).maybeSingle(),
  ]);

  let txRows: { amount: number; type: string; ts: string; notes: string | null }[] = [];
  if (accData?.id) {
    const { data } = await supabase
      .from("transactions")
      .select("amount, type, ts, notes")
      .eq("account_id", accData.id)
      .in("source", ["statement", "manual"])
      .eq("type", "expense");
    txRows = (data ?? []) as typeof txRows;
  }

  const items = (itemsData ?? []) as WindDownItem[];
  const { summary } = windDownItems(items);
  const daysLeft = daysToDeadline(new Date());
  const provisional = provisionalSettlement(
    txRows.map((t) => ({
      amount: Number(t.amount),
      type: t.type,
      ts: String(t.ts),
      notes: t.notes,
    })),
    accData ? Number(accData.balance) : null
  );

  return (
    <div className="lf-wrap">
      <div className="lf-phone">
        <RateHeader title="5927 wind-down" />
        <div className="lf-sec-label" style={{ marginTop: -8 }}>
          <span className="lf-sec-label__h">Joint account closure</span>
          <Link href="/plan" className="lf-sec-label__m">
            plan →
          </Link>
        </div>
        <WindDownClient items={items} summary={summary} daysLeft={daysLeft} provisional={provisional} />
      </div>
    </div>
  );
}
