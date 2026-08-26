import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nextWindDownStatus, type WindDownStatus } from "@/lib/winddown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  id: string;
  status?: WindDownStatus;
  cycle?: boolean;
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const body = (await request.json()) as Body;
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let status = body.status;
  if (body.cycle) {
    const { data: row, error: readErr } = await supabase
      .from("joint_winddown")
      .select("status")
      .eq("id", body.id)
      .single();
    if (readErr || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    status = nextWindDownStatus(row.status as WindDownStatus);
  }

  if (!status || !["todo", "moved", "na"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const patch: { status: WindDownStatus; moved_on: string | null } = {
    status,
    moved_on: status === "moved" ? isoToday() : null,
  };

  const { data, error } = await supabase.from("joint_winddown").update(patch).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, item: data });
}
