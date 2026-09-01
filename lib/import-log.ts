/** Structured server logs for statement import (visible in Vercel function logs). */
export function importLog(phase: string, detail: Record<string, unknown> = {}) {
  console.log(`[import] ${phase}`, JSON.stringify(detail));
}
