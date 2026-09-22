import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const FETCH_TIMEOUT_MS = 8000;
const RETRY_BACKOFF_MS = [300, 800];

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function archiveUrl(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `https://www.cbr-xml-daily.ru/archive/${y}/${m}/${day}/daily_json.js`;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

async function fetchWithTimeout(url) {
  let lastErr;
  const attempts = RETRY_BACKOFF_MS.length + 1;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < RETRY_BACKOFF_MS.length) {
        await sleep(RETRY_BACKOFF_MS[attempt]);
      }
    }
  }

  throw lastErr;
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const end = new Date();
const start = new Date();
start.setDate(start.getDate() - 180);

console.log(`Backfill CBR spot via cbr-xml-daily.ru ${isoDate(start)} → ${isoDate(end)}…`);

const rows = [];
let skipped = 0;
let errors = 0;

for (let offset = 180; offset >= 0; offset--) {
  const day = new Date();
  day.setDate(day.getDate() - offset);
  const label = isoDate(day);
  const url = archiveUrl(day);

  try {
    const res = await fetchWithTimeout(url);

    if (res.status === 404) {
      skipped++;
      console.log(`${label} skip`);
      continue;
    }

    if (!res.ok) {
      errors++;
      console.log(`${label} skip`);
      continue;
    }

    const payload = await res.json();
    const usd = payload.Valute?.USD;
    if (!usd?.Value) {
      skipped++;
      console.log(`${label} skip`);
      continue;
    }

    const rubPerUsd = usd.Value / (usd.Nominal || 1);
    const rateDate = payload.Date ? String(payload.Date).slice(0, 10) : label;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rateDate) || !Number.isFinite(rubPerUsd)) {
      skipped++;
      console.log(`${label} skip`);
      continue;
    }

    rows.push({
      rate_date: rateDate,
      rub_per_usd: rubPerUsd,
      kind: "spot",
      notes: "CBR backfill",
    });
    console.log(`${label} ok ${rubPerUsd.toFixed(2)}`);
  } catch {
    skipped++;
    console.log(`${label} skip`);
  }
}

const byDate = new Map();
for (const row of rows) {
  byDate.set(row.rate_date, row);
}
const uniqueRows = [...byDate.values()];

let written = 0;
const chunkSize = 100;
for (let i = 0; i < uniqueRows.length; i += chunkSize) {
  const chunk = uniqueRows.slice(i, i + chunkSize);
  const { error } = await supabase.from("fx_rates").upsert(chunk, { onConflict: "rate_date,kind" });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  written += chunk.length;
}

console.log(`записано ${written}, пропущено ${skipped}, ошибок ${errors}`);
