import { C } from "./tokens";

export const terminal = {
  wrap: { minHeight: "100vh", display: "flex", justifyContent: "center", fontFamily: C.sans } as const,
  phone: { width: 420, maxWidth: "100%", background: C.app, minHeight: "100vh", padding: "16px 16px 88px" } as const,
  mono: { fontFamily: C.mono } as const,
  card: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 } as const,
  label: { fontSize: 11, color: C.sub, letterSpacing: "0.04em" } as const,
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0 16px" } as const,
  title: { fontSize: 13, fontWeight: 600, color: C.sub, letterSpacing: "0.04em" } as const,
};
