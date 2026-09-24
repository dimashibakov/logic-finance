const KEY = "lf-paid-events";

export function loadPaidEventIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function persistPaidEventIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify([...ids]));
}

export function markEventPaid(id: string): Set<string> {
  const next = loadPaidEventIds();
  next.add(id);
  persistPaidEventIds(next);
  return next;
}
