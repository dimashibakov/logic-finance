import { C } from "./tokens";

export const terminal = {
  wrap: { minHeight: "100vh", display: "flex", justifyContent: "center", fontFamily: C.sans, background: C.app } as const,
  phone: { width: 430, maxWidth: "100%", background: C.app, minHeight: "100vh", padding: "0 20px 96px" } as const,
  mono: { fontFamily: C.mono, fontVariantNumeric: "tabular-nums" as const } as const,
  card: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14 } as const,
  cardPad: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 } as const,
  eyebrow: { fontFamily: C.mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.sub, fontWeight: 600 } as const,
  label: { fontFamily: C.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.sub, fontWeight: 600 } as const,
  header: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "20px 0 8px" } as const,
  title: { fontFamily: C.mono, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.sub, fontWeight: 600 } as const,
  secLabel: { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "22px 2px 10px" } as const,
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${C.line2}` } as const,
  btn: { display: "block", width: "100%", textAlign: "center" as const, background: C.accent, color: "#fff", border: 0, borderRadius: 11, padding: "13px", fontSize: 14, fontWeight: 600, fontFamily: C.sans, cursor: "pointer", marginTop: 14 },
  btnGhost: { display: "block", width: "100%", textAlign: "center" as const, background: C.accentWeak, color: C.accent, border: 0, borderRadius: 11, padding: "13px", fontSize: 14, fontWeight: 600, fontFamily: C.sans, cursor: "pointer", marginTop: 14 },
};
