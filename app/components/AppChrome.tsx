"use client";

import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider } from "./ThemeProvider";
import BottomNav from "./BottomNav";
import AddSheet from "./AddSheet";
import AddSheetDesktop from "./AddSheetDesktop";
import DesktopShell from "./desktop/DesktopShell";
import { AddSheetProvider, useAddSheet, type AddSheetView } from "./AddSheetContext";
import OperationForm from "./forms/OperationForm";
import BalanceAdjustForm from "./forms/BalanceAdjustForm";
import { TerminalShellProvider } from "./terminal/TerminalShellContext";
import TerminalFxLoader from "./terminal/TerminalFxLoader";

function ChromeInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authShell = pathname === "/login" || pathname === "/offline" || pathname.startsWith("/auth");
  const { sheetOpen, sheetView, preset, openMenu, openView: openViewRaw, close } = useAddSheet();

  const openView = (view: AddSheetView, presetArg?: Parameters<typeof openViewRaw>[1]) => {
    if (view === "import") {
      close();
      router.push("/import");
      return;
    }
    openViewRaw(view, presetArg);
  };

  if (authShell) {
    return <>{children}</>;
  }

  const addSheetForms = (
    <>
      {sheetView === "operation" && (
        <OperationForm preset={preset} onBack={() => openView("menu")} onDone={close} />
      )}
      {sheetView === "balance" && <BalanceAdjustForm onBack={() => openView("menu")} onDone={close} />}
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
