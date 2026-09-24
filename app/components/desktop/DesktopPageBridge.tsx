"use client";

import type { ReactNode } from "react";
import TerminalFxSync from "../terminal/TerminalFxSync";
import { DesktopPageMeta } from "./DesktopShellContext";

type Props = {
  title: string;
  spot: number;
  eff: number;
  children: ReactNode;
};

export default function DesktopPageBridge({ title, spot, eff, children }: Props) {
  return (
    <>
      <TerminalFxSync spot={spot} eff={eff} />
      <DesktopPageMeta title={title} spot={spot} eff={eff} />
      {children}
    </>
  );
}
