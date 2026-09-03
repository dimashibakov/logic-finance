"use client";

import { usePathname } from "next/navigation";
import { LayoutGrid, ArrowLeftRight, Landmark, CalendarRange, Plus } from "lucide-react";

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
    <nav className="lf-nav">
      <div className="lf-nav__inner">
        {tabs.slice(0, 2).map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <a
              key={tab.href}
              href={tab.href}
              className={`lf-nav__tab${active ? " lf-nav__tab--on" : ""}`}
            >
              <tab.Icon size={21} strokeWidth={1.9} />
              <span className="lf-nav__tab-label">{tab.label}</span>
            </a>
          );
        })}

        <div className="lf-nav__fab-wrap">
          <button type="button" aria-label="Add" onClick={onFabClick} className="lf-nav__fab">
            <Plus size={26} strokeWidth={2.2} />
          </button>
        </div>

        {tabs.slice(2).map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <a
              key={tab.href}
              href={tab.href}
              className={`lf-nav__tab${active ? " lf-nav__tab--on" : ""}`}
            >
              <tab.Icon size={21} strokeWidth={1.9} />
              <span className="lf-nav__tab-label">{tab.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
