/** Structured server logs for statement import (visible in Vercel function logs). */
export function serializeImportError(err: unknown): { error: string; stack?: string } {
  if (err instanceof Error) {
    return { error: err.message, stack: err.stack };
  }
  return { error: String(err) };
}

export function importLog(phase: string, detail: Record<string, unknown> = {}) {
  console.log(`[import] ${phase}`, JSON.stringify(detail));
}
