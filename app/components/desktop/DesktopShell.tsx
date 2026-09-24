"use client";

import { usePathname } from "next/navigation";
import { DesktopShellProvider } from "./DesktopShellContext";
import Sidebar from "./Sidebar";
import TerminalHeader from "../terminal/TerminalHeader";
import TerminalTicker from "../terminal/TerminalTicker";

export default function DesktopShell({
  children,
  overlay,
}: {
  children: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <DesktopShellProvider pathname={pathname}>
      <div className="lf-app-root t-app">
        <Sidebar />
        <div className="lf-app-main t-main">
          <TerminalHeader />
          <TerminalTicker />
          <div className="lf-app-content t-content">{children}</div>
          {overlay ? <div className="lf-app-overlays lf-only-desktop">{overlay}</div> : null}
        </div>
      </div>
    </DesktopShellProvider>
  );
}
