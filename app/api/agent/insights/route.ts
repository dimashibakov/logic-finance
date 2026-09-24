import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AgentInsightSeverity } from "@/lib/agent/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  id?: string;
  dedupe_key?: string;
  status?: "dismissed" | "resolved" | "active";
  title?: string;
  body?: string | null;
  severity?: AgentInsightSeverity;
};

export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const body = (await request.json()) as Body;
  if (!body.id && !body.dedupe_key) {
    return NextResponse.json({ error: "Missing id or dedupe_key" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) patch.status = body.status;
  if (body.title != null) patch.title = body.title;
  if (body.body !== undefined) patch.body = body.body;
  if (body.severity) patch.severity = body.severity;

  if (Object.keys(patch).length <= 1) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  let query = supabase.from("agent_insights").update(patch);
  if (body.id) query = query.eq("id", body.id);
  else query = query.eq("dedupe_key", body.dedupe_key!);

  const { data, error } = await query.select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, insight: data });
}
