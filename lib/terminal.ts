import { V } from "./tokens";

/** Shared layout/style helpers — values come from CSS variables. */
export const ui = {
  wrap: { className: "lf-wrap" } as const,
  phone: { className: "lf-phone" } as const,
  mono: { fontFamily: V.fontMono, fontVariantNumeric: "tabular-nums" as const } as const,
  display: { fontFamily: V.fontDisplay } as const,
};

/** @deprecated use ui + CSS classes */
export const terminal = {
  wrap: { minHeight: "100vh", display: "flex", justifyContent: "center", fontFamily: V.fontDisplay, background: V.bg } as const,
  phone: { width: 430, maxWidth: "100%", background: V.paper, minHeight: "100vh", padding: "0 20px 96px" } as const,
  mono: ui.mono,
  card: { background: V.card, border: `${V.cardBorderW} solid ${V.cardBorder}`, borderRadius: V.radius } as const,
  cardPad: { background: V.card, border: `${V.cardBorderW} solid ${V.cardBorder}`, borderRadius: V.radius, padding: 16 } as const,
  eyebrow: { fontFamily: V.fontMono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: V.muted, fontWeight: 600 } as const,
  label: { fontFamily: V.fontMono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: V.muted, fontWeight: 600 } as const,
  header: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "20px 0 8px" } as const,
  title: { fontFamily: V.fontMono, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: V.muted, fontWeight: 600 } as const,
  secLabel: { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "22px 2px 10px" } as const,
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `${V.rowBorderW} solid ${V.line2}` } as const,
  btn: { display: "block", width: "100%", textAlign: "center" as const, background: V.accent, color: V.accentInk, border: `${V.cardBorderW} solid ${V.cardBorder}`, borderRadius: V.radiusBtn, boxShadow: V.shadow, padding: "13px", fontSize: 14, fontWeight: 600, fontFamily: V.fontDisplay, cursor: "pointer", marginTop: 14 },
  btnGhost: { display: "block", width: "100%", textAlign: "center" as const, background: V.accentWeak, color: V.accent, border: `${V.cardBorderW} solid ${V.cardBorder}`, borderRadius: V.radiusBtn, padding: "13px", fontSize: 14, fontWeight: 600, fontFamily: V.fontDisplay, cursor: "pointer", marginTop: 14, boxShadow: "none" },
};
