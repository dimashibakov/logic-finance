"use client";

import { usePathname } from "next/navigation";
import { useAddSheet } from "../AddSheetContext";
import SignOutButton from "../SignOutButton";

const SIDEBAR_GROUPS = [
  {
    label: "MAIN",
    items: [
      { href: "/", label: "Overview", icon: "▤" },
      { href: "/payments", label: "Payments", icon: "▦" },
      { href: "/convert", label: "Convert", icon: "⇄" },
    ],
  },
  {
    label: "MONEY",
    items: [
      { href: "/debts", label: "Debts", icon: "▧" },
      { href: "/cash", label: "Cash Planner", icon: "₽" },
      { href: "/funds", label: "Funds", icon: "◎" },
      { href: "/plan", label: "Plan · Fact", icon: "▥" },
    ],
  },
  {
    label: "RECORDS",
    items: [
      { href: "/history", label: "History", icon: "≣" },
      { href: "/import", label: "Import", icon: "↧" },
      { href: "/agent", label: "Agent", icon: "◆" },
    ],
  },
  {
    label: "ADMIN",
    items: [{ href: "/winddown", label: "BoFA Wind-down", icon: "✕" }],
  },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
  const { openMenu } = useAddSheet();

  return (
    <aside className="lf-sidebar" aria-label="Main navigation">
      <div className="lf-sidebar__wordmark">
        <span className="lf-sidebar__logo" aria-hidden />
        Logic Finance
      </div>
      {SIDEBAR_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="lf-sidebar__grp">{group.label}</div>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`lf-sidebar__link${active ? " lf-sidebar__link--on" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="lf-sidebar__ic" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </a>
            );
          })}
        </div>
      ))}
      <button type="button" className="lf-sidebar__add" onClick={() => openMenu()}>
        + Add operation
      </button>
      <div className="lf-sidebar__foot">
        <SignOutButton compact />
      </div>
    </aside>
  );
}
