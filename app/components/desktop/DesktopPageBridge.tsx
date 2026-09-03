"use client";

import type { ReactNode } from "react";
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
      <DesktopPageMeta title={title} spot={spot} eff={eff} />
      {children}
    </>
  );
}
