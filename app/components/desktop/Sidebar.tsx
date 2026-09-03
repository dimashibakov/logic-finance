"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DESKTOP_NAV, navActive } from "@/lib/desktop-nav";
import { useAddSheet } from "../AddSheetContext";
import SignOutButton from "../SignOutButton";

export default function Sidebar() {
  const pathname = usePathname();
  const { openMenu } = useAddSheet();

  return (
    <aside className="lf-sidebar lf-only-desktop">
      <div className="lf-sidebar__wordmark">
        LOGIC
        <br />
        FINANCE
      </div>
      {DESKTOP_NAV.map((group) => (
        <div key={group.label}>
          <div className="lf-sidebar__grp">{group.label}</div>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`lf-sidebar__link${navActive(pathname, item.href) ? " lf-sidebar__link--on" : ""}`}
            >
              <span className="lf-sidebar__ic" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      ))}
      <button type="button" className="lf-sidebar__add lf-bento-pressable lf-mono" onClick={openMenu}>
        + Add operation
      </button>
      <div className="lf-sidebar__foot lf-mono">
        <SignOutButton compact />
      </div>
    </aside>
  );
}
