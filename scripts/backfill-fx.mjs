import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

function ruDateToIso(d: string) {
  const [dd, mm, yyyy] = d.split(".");
  return `${yyyy}-${mm}-${dd}`;
}

function parseCbrValue(raw: string) {
  return parseFloat(raw.replace(",", ".").replace(/\s/g, ""));
}

async function fetchRange(from: Date, to: Date) {
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const url = `https://www.cbr.ru/scripts/XML_dynamic.asp?date_req1=${fmt(from)}&date_req2=${fmt(to)}&VAL_NM_RQ=R01235`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CBR archive HTTP ${res.status}`);
  return res.text();
}

function parseRecords(xml: string) {
  const rows: { rate_date: string; rub_per_usd: number }[] = [];
  const re = /<Record\s+Date="([^"]+)"[^>]*>[\s\S]*?<Value>([^<]+)<\/Value>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const rate = parseCbrValue(m[2]);
    if (!Number.isFinite(rate)) continue;
    rows.push({ rate_date: ruDateToIso(m[1]), rub_per_usd: rate });
  }
  return rows;
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const to = new Date();
const from = new Date();
from.setDate(from.getDate() - 180);

console.log(`Fetching CBR USD spot ${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}…`);
const xml = await fetchRange(from, to);
const records = parseRecords(xml);
console.log(`Parsed ${records.length} records`);

const payload = records.map((r) => ({
  ...r,
  kind: "spot",
  notes: "CBR archive (backfill)",
}));

const chunkSize = 100;
let upserted = 0;
for (let i = 0; i < payload.length; i += chunkSize) {
  const chunk = payload.slice(i, i + chunkSize);
  const { error } = await supabase.from("fx_rates").upsert(chunk, { onConflict: "rate_date,kind" });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  upserted += chunk.length;
}

console.log(`Upserted ${upserted} spot rows.`);
