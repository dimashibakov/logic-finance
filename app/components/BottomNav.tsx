"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ArrowLeftRight, Landmark, CalendarRange, Plus } from "lucide-react";
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
    <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30 }}>
      <div
        style={{
          maxWidth: 430,
          margin: "0 auto",
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(10px)",
          borderTop: `1px solid ${C.line}`,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "flex-end",
          padding: "8px 6px calc(8px + env(safe-area-inset-bottom))",
        }}
      >
        {tabs.slice(0, 2).map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "6px 0",
                minHeight: 52,
                textDecoration: "none",
                color: active ? C.accent : C.faint,
              }}
            >
              <tab.Icon size={21} strokeWidth={1.9} />
              <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.04em" }}>{tab.label}</span>
            </Link>
          );
        })}

        <div style={{ flex: "0 0 auto", width: 64, display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            aria-label="Add"
            onClick={onFabClick}
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "none",
              background: C.accent,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transform: "translateY(-14px)",
              boxShadow: "0 6px 16px rgba(47,111,237,0.4)",
            }}
          >
            <Plus size={26} strokeWidth={2.2} />
          </button>
        </div>

        {tabs.slice(2).map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "6px 0",
                minHeight: 52,
                textDecoration: "none",
                color: active ? C.accent : C.faint,
              }}
            >
              <tab.Icon size={21} strokeWidth={1.9} />
              <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.04em" }}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
