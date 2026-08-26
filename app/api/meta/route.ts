import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("id, name, currency, type, zone, balance, balance_date").order("name"),
    supabase.from("categories").select("id, name, kind, zone").order("name"),
  ]);
  return NextResponse.json({ accounts: accounts ?? [], categories: categories ?? [] });
}
