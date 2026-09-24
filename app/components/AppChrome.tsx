"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "./ThemeProvider";
import BottomNav from "./BottomNav";
import AddSheet from "./AddSheet";
import AddSheetDesktop from "./AddSheetDesktop";
import DesktopShell from "./desktop/DesktopShell";
import { AddSheetProvider, useAddSheet } from "./AddSheetContext";
import OperationForm from "./forms/OperationForm";
import BalanceAdjustForm from "./forms/BalanceAdjustForm";
import ImportPanel from "./forms/ImportPanel";
import { TerminalShellProvider } from "./terminal/TerminalShellContext";
import TerminalFxLoader from "./terminal/TerminalFxLoader";

function ChromeInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const authShell = pathname === "/login" || pathname === "/offline" || pathname.startsWith("/auth");
  const { sheetOpen, sheetView, preset, openMenu, openView, close } = useAddSheet();

  if (authShell) {
    return <>{children}</>;
  }

  const addSheetForms = (
    <>
      {sheetView === "operation" && (
        <OperationForm preset={preset} onBack={() => openView("menu")} onDone={close} />
      )}
      {sheetView === "balance" && <BalanceAdjustForm onBack={() => openView("menu")} onDone={close} />}
      {sheetView === "import" && <ImportPanel onBack={() => openView("menu")} onDone={close} />}
    </>
  );

  return (
    <>
      <TerminalFxLoader />
      <DesktopShell
        overlay={
          sheetOpen ? (
            <AddSheetDesktop
              open={sheetOpen}
              view={sheetView}
              onClose={close}
              onNavigate={(view) => openView(view)}
            >
              {addSheetForms}
            </AddSheetDesktop>
          ) : null
        }
      >
        {children}
      </DesktopShell>
      <div className="lf-mobile-chrome">
        <BottomNav onFabClick={openMenu} />
      </div>
      <AddSheet open={sheetOpen} view={sheetView} onClose={close} onNavigate={(view) => openView(view)}>
        {addSheetForms}
      </AddSheet>
    </>
  );
}

export default function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TerminalShellProvider>
        <AddSheetProvider>
          <ChromeInner>{children}</ChromeInner>
        </AddSheetProvider>
      </TerminalShellProvider>
    </ThemeProvider>
  );
}

export { useAddSheet };
