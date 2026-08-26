import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CbrDaily = {
  Date: string;
  Valute: { USD: { Value: number; Nominal?: number } };
};

function parseCbrDate(raw: string): string {
  return raw.slice(0, 10);
}

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: CbrDaily;
  try {
    const res = await fetch("https://www.cbr-xml-daily.ru/daily_json.js", { cache: "no-store" });
    if (!res.ok) throw new Error(`CBR HTTP ${res.status}`);
    payload = (await res.json()) as CbrDaily;
  } catch (e) {
    return NextResponse.json(
      { error: "CBR fetch failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }

  const usd = payload.Valute?.USD;
  if (!usd?.Value) {
    return NextResponse.json({ error: "CBR response missing USD rate" }, { status: 502 });
  }

  const rubPerUsd = usd.Value / (usd.Nominal || 1);
  const rateDate = parseCbrDate(payload.Date);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("fx_rates")
      .upsert(
        {
          rate_date: rateDate,
          rub_per_usd: rubPerUsd,
          kind: "spot",
          notes: "CBR daily (auto)",
        },
        { onConflict: "rate_date,kind" }
      )
      .select("rate_date, rub_per_usd, kind")
      .single();

    if (error) {
      return NextResponse.json({ error: "Supabase upsert failed", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, rate: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Admin client error" },
      { status: 500 }
    );
  }
}
