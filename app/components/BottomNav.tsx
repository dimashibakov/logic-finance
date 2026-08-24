"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { C } from "@/lib/tokens";

const tabs = [
  { href: "/", label: "Overview" },
  { href: "/rates", label: "Rates" },
  { href: "/convert", label: "Convert" },
  { href: "/debts", label: "Debts" },
  { href: "/plan", label: "Plan" },
  { href: "/import", label: "Import" },
];

export default function BottomNav() {
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
        display: "flex",
        zIndex: 50,
      }}
    >
      {tabs.map((tab) => {
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
              justifyContent: "center",
              padding: "8px 2px 10px",
              textDecoration: "none",
              color: active ? C.blue : C.sub,
              borderTop: active ? `2px solid ${C.blue}` : "2px solid transparent",
              marginTop: -1,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 500, letterSpacing: "0.01em", textAlign: "center", lineHeight: 1.2 }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
