"use client";

import BottomNav from "./BottomNav";
import AddSheet from "./AddSheet";
import { AddSheetProvider, useAddSheet } from "./AddSheetContext";
import OperationForm from "./forms/OperationForm";
import BalanceAdjustForm from "./forms/BalanceAdjustForm";
import ImportPanel from "./forms/ImportPanel";

function ChromeInner({ children }: { children: React.ReactNode }) {
  const { sheetOpen, sheetView, preset, openMenu, openView, close } = useAddSheet();

  return (
    <>
      {children}
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
  );
}

export default function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <AddSheetProvider>
      <ChromeInner>{children}</ChromeInner>
    </AddSheetProvider>
  );
}

export { useAddSheet };
