"use client";

import { useEffect } from "react";
import { useTerminalShell, type TickerItem } from "./TerminalShellContext";

type Props = {
  spot: number;
  eff: number;
  ticker?: TickerItem[];
};

/** Syncs FX rates (and optional ticker) into the global Terminal shell. */
export default function TerminalFxSync({ spot, eff, ticker }: Props) {
  const { setFx, setTickerItems } = useTerminalShell();

  useEffect(() => {
    setFx(spot, eff);
  }, [spot, eff, setFx]);

  useEffect(() => {
    if (ticker) setTickerItems(ticker);
  }, [ticker, setTickerItems]);

  return null;
}
