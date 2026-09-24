"use client";

import { usePathname } from "next/navigation";
import { DESKTOP_NAV, navActive } from "@/lib/desktop-nav";
import { useAddSheet } from "../AddSheetContext";
import SignOutButton from "../SignOutButton";

export default function TerminalSidebar() {
  const pathname = usePathname();
  const { openMenu } = useAddSheet();

  return (
    <aside className="t-sidebar" aria-label="Main navigation">
      <div className="t-sidebar__brand">
        <span className="t-sidebar__logo" aria-hidden />
        <span className="t-sidebar__name">Logic Finance</span>
      </div>

      <nav className="t-sidebar__nav">
        {DESKTOP_NAV.map((group) => (
          <div key={group.label} className="t-sidebar__section">
            <div className="t-sidebar__grp">{group.label}</div>
            {group.items.map((item) => {
              const active = navActive(pathname, item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`t-sidebar__link${active ? " t-sidebar__link--active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="t-sidebar__ic" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      <button type="button" className="t-sidebar__add" onClick={() => openMenu()}>
        + Add operation
      </button>

      <div className="t-sidebar__foot">
        <SignOutButton compact />
      </div>
    </aside>
  );
}
