import { C } from "./tokens";

export const terminal = {
  wrap: { minHeight: "100vh", display: "flex", justifyContent: "center", fontFamily: C.sans, background: C.app } as const,
  phone: { width: 420, maxWidth: "100%", background: C.app, minHeight: "100vh", padding: "12px 16px 108px" } as const,
  mono: { fontFamily: C.mono, fontVariantNumeric: "tabular-nums" as const } as const,
  card: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 } as const,
  label: { fontSize: 10, color: C.sub, letterSpacing: "0.12em", textTransform: "uppercase" as const, fontWeight: 600 } as const,
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "4px 0 14px", gap: 8 } as const,
  title: { fontSize: 11, fontWeight: 600, color: C.sub, letterSpacing: "0.14em", textTransform: "uppercase" as const } as const,
};
