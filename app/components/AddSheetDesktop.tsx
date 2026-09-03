"use client";

import Modal, { AddMenuItems, VIEW_TITLES } from "./desktop/Modal";
import type { AddSheetView } from "./AddSheetContext";

type Props = {
  open: boolean;
  view: AddSheetView;
  onClose: () => void;
  onNavigate: (view: AddSheetView) => void;
  children?: React.ReactNode;
};

export default function AddSheetDesktop({ open, view, onClose, onNavigate, children }: Props) {
  const isForm = view !== "menu";
  const title = isForm ? VIEW_TITLES[view] : "ADD";

  return (
    <Modal open={open} title={title} onClose={onClose} large={view === "import"} menu={view === "menu"}>
      {view === "menu" ? <AddMenuItems onNavigate={onNavigate} /> : <div>{children}</div>}
    </Modal>
  );
}
