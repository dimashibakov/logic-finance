import { NextRequest, NextResponse } from "next/server";
import { commitImportRows, type CommitPayload } from "@/lib/import-commit";
import { importLog } from "@/lib/import-log";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const started = Date.now();
  const supabase = createClient();

  let body: CommitPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rowCount = body.rows?.length ?? 0;
  importLog("commit:request", { rowCount, controlOk: body.controlOk, parseOk: body.parseOk });

  if (body.parseOk === false) {
    importLog("commit:rejected", { reason: "parseOk false", ms: Date.now() - started });
    return NextResponse.json({ error: "Parse incomplete — fix errors and re-parse before saving" }, { status: 422 });
  }

  if (body.controlOk === false) {
    importLog("commit:rejected", { reason: "controlOk false", ms: Date.now() - started });
    return NextResponse.json({ error: "Control check failed — fix parser or statement before commit" }, { status: 422 });
  }

  const outcome = await commitImportRows(supabase, body);
  if (!outcome.ok) {
    importLog("commit:error", {
      ms: Date.now() - started,
      status: outcome.status,
      error: outcome.error,
      unresolved: outcome.unresolved,
    });
    return NextResponse.json(
      { error: outcome.error, unresolved: outcome.unresolved, detail: outcome.detail },
      { status: outcome.status }
    );
  }

  importLog("commit:done", {
    ms: Date.now() - started,
    inserted: outcome.result.inserted,
    skipped: outcome.result.skipped,
    total: outcome.result.total,
  });

  return NextResponse.json(outcome.result);
}
