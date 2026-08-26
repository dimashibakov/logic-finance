import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  id?: string;
  dedupe_key?: string;
  status: "dismissed";
};

export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const body = (await request.json()) as Body;
  if (body.status !== "dismissed" || (!body.id && !body.dedupe_key)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const now = new Date().toISOString();
  let query = supabase.from("agent_insights").update({ status: "dismissed", updated_at: now }).eq("status", "active");
  if (body.id) query = query.eq("id", body.id);
  else query = query.eq("dedupe_key", body.dedupe_key!);

  const { data, error } = await query.select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, insight: data });
}
