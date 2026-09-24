import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nextWindDownStatus, type WindDownStatus } from "@/lib/winddown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  id: string;
  status?: WindDownStatus;
  cycle?: boolean;
  label?: string;
  amount?: number | null;
  currency?: string;
  split?: string;
  target_account?: string | null;
  moved_on?: string | null;
  note?: string | null;
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

  const patch: Record<string, unknown> = {};
  if (status) {
    if (!["todo", "moved", "na"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = status;
    if (status === "moved" && body.moved_on == null) patch.moved_on = isoToday();
    if (status !== "moved" && body.moved_on === undefined && body.cycle) patch.moved_on = null;
  }
  if (body.label != null) patch.label = body.label;
  if (body.amount !== undefined) patch.amount = body.amount;
  if (body.currency != null) patch.currency = body.currency;
  if (body.split != null) patch.split = body.split;
  if (body.target_account !== undefined) patch.target_account = body.target_account;
  if (body.moved_on !== undefined) patch.moved_on = body.moved_on;
  if (body.note !== undefined) patch.note = body.note;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase.from("joint_winddown").update(patch).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, item: data });
}
