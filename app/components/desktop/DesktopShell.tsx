"use client";

import { usePathname } from "next/navigation";
import { DESKTOP_SHELL_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { DesktopShellProvider } from "./DesktopShellContext";
import TerminalHeader from "../terminal/TerminalHeader";
import TerminalSidebar from "../terminal/TerminalSidebar";
import TerminalTicker from "../terminal/TerminalTicker";

export default function DesktopShell({
  children,
  overlay,
}: {
  children: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDesktop = useMediaQuery(DESKTOP_SHELL_QUERY);

  return (
    <DesktopShellProvider pathname={pathname}>
      <div className={`t-app${isDesktop ? " t-app--desktop" : " t-app--mobile"}`}>
        {isDesktop ? <TerminalSidebar /> : null}
        <div className="t-main lf-app-main">
          <TerminalHeader />
          <TerminalTicker />
          <div className="t-content lf-app-content">{children}</div>
          {overlay ? <div className="lf-app-overlays lf-only-desktop">{overlay}</div> : null}
        </div>
      </div>
    </DesktopShellProvider>
  );
}
