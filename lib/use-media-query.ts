"use client";

import { useEffect, useState } from "react";

/** Subscribes to a CSS media query; false until mounted (mobile-first). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export const DESKTOP_SHELL_QUERY = "(min-width: 1024px)";
