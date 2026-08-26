"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "./ThemeProvider";
import BottomNav from "./BottomNav";
import AddSheet from "./AddSheet";
import { AddSheetProvider, useAddSheet } from "./AddSheetContext";
import OperationForm from "./forms/OperationForm";
import BalanceAdjustForm from "./forms/BalanceAdjustForm";
import ImportPanel from "./forms/ImportPanel";

function ChromeInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const authShell = pathname === "/login" || pathname.startsWith("/auth");
  const { sheetOpen, sheetView, preset, openMenu, openView, close } = useAddSheet();

  return (
    <>
      {children}
      {!authShell && (
        <>
          <BottomNav onFabClick={openMenu} />
          <AddSheet
            open={sheetOpen}
            view={sheetView}
            onClose={close}
            onNavigate={(view) => openView(view)}
          >
            {sheetView === "operation" && (
              <OperationForm preset={preset} onBack={() => openView("menu")} onDone={close} />
            )}
            {sheetView === "balance" && <BalanceAdjustForm onBack={() => openView("menu")} onDone={close} />}
            {sheetView === "import" && <ImportPanel onBack={() => openView("menu")} onDone={close} />}
          </AddSheet>
        </>
      )}
    </>
  );
}

export default function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AddSheetProvider>
        <ChromeInner>{children}</ChromeInner>
      </AddSheetProvider>
    </ThemeProvider>
  );
}

export { useAddSheet };
