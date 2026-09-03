export type NavItem = { href: string; label: string; icon: string };

export type NavGroup = { label: string; items: NavItem[] };

export const DESKTOP_NAV: NavGroup[] = [
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
      { href: "/cash", label: "Cash planner", icon: "₽" },
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
    items: [{ href: "/winddown", label: "BoFA wind-down", icon: "✕" }],
  },
];

const TITLE_BY_HREF: Record<string, string> = Object.fromEntries(
  DESKTOP_NAV.flatMap((g) => g.items.map((i) => [i.href, i.label]))
);

export function defaultDesktopTitle(pathname: string): string {
  if (pathname.startsWith("/account/")) return "Account";
  if (pathname in TITLE_BY_HREF) return TITLE_BY_HREF[pathname]!;
  for (const [href, title] of Object.entries(TITLE_BY_HREF)) {
    if (href !== "/" && pathname.startsWith(href)) return title;
  }
  return "Logic Finance";
}

export function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
