"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useTerminalShell } from "./TerminalShellContext";

function effRate(spot: number) {
  return spot * 1.015 + 3;
}

/** Loads spot/eff into the shell when a page has not already set them (e.g. mobile routes). */
export default function TerminalFxLoader() {
  const { setFx, spot } = useTerminalShell();

  useEffect(() => {
    if (spot != null) return;
    const supabase = createClient();
    void supabase
      .from("fx_rates")
      .select("rub_per_usd")
      .eq("kind", "spot")
      .order("rate_date", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.rub_per_usd) {
          const s = Number(data[0].rub_per_usd);
          setFx(s, effRate(s));
        }
      });
  }, [spot, setFx]);

  return null;
}
