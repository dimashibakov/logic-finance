import { NextRequest, NextResponse } from "next/server";
import { commitImportRows, type CommitPayload } from "@/lib/import-commit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  let body: CommitPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const outcome = await commitImportRows(supabase, body);
  if (!outcome.ok) {
    return NextResponse.json(
      { error: outcome.error, unresolved: outcome.unresolved, detail: outcome.detail },
      { status: outcome.status }
    );
  }

  return NextResponse.json(outcome.result);
}
