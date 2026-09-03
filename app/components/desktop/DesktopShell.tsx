"use client";

import { usePathname } from "next/navigation";
import { DesktopShellProvider } from "./DesktopShellContext";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function DesktopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <DesktopShellProvider pathname={pathname}>
      <div className="lf-app-root">
        <Sidebar />
        <div className="lf-app-main">
          <TopBar />
          <div className="lf-app-content">{children}</div>
        </div>
      </div>
    </DesktopShellProvider>
  );
}
