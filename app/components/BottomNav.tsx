"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ArrowLeftRight, Landmark, CalendarRange } from "lucide-react";
import { C } from "@/lib/tokens";

const tabs = [
  { href: "/", label: "Overview", Icon: LayoutGrid },
  { href: "/convert", label: "Convert", Icon: ArrowLeftRight },
  { href: "/debts", label: "Debts", Icon: Landmark },
  { href: "/plan", label: "Plan", Icon: CalendarRange },
];

type Props = { onFabClick: () => void };

export default function BottomNav({ onFabClick }: Props) {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: 420,
        maxWidth: "100%",
        background: C.card,
        borderTop: `1px solid ${C.line}`,
        display: "grid",
        gridTemplateColumns: "1fr 1fr 64px 1fr 1fr",
        alignItems: "end",
        zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.slice(0, 2).map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 52,
              padding: "8px 4px 10px",
              textDecoration: "none",
              color: active ? C.accent : C.sub,
            }}
          >
            <tab.Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 500, marginTop: 4 }}>{tab.label}</span>
          </Link>
        );
      })}

      <div style={{ display: "flex", justifyContent: "center", position: "relative", top: -14 }}>
        <button
          type="button"
          aria-label="Add"
          onClick={onFabClick}
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: "none",
            background: C.accent,
            color: "#fff",
            fontSize: 26,
            lineHeight: 1,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(47,111,237,0.35)",
          }}
        >
          ＋
        </button>
      </div>

      {tabs.slice(2).map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 52,
              padding: "8px 4px 10px",
              textDecoration: "none",
              color: active ? C.accent : C.sub,
            }}
          >
            <tab.Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 500, marginTop: 4 }}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
