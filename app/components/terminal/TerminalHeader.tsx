"use client";

import { fmtRate } from "@/lib/format";
import { useTerminalShell, type ZoneFilter } from "./TerminalShellContext";

const ZONES: ZoneFilter[] = ["RF", "US", "ALL"];

export default function TerminalHeader() {
  const { zone, setZone, displayCurrency, setDisplayCurrency, searchQuery, setSearchQuery, spot, eff } =
    useTerminalShell();

  return (
    <header className="t-hdr">
      <div className="t-hdr__brand">
        <div className="t-hdr__logo" aria-hidden />
        <span className="t-hdr__name">Logic Finance</span>
      </div>

      <div className="t-hdr__search">
        <span className="t-hdr__search-ic" aria-hidden>
          ⌕
        </span>
        <input
          type="search"
          className="t-hdr__search-input"
          placeholder="Search accounts, banks, debts, funds…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Global search"
        />
      </div>

      <div className="t-hdr__actions">
        <div className="t-seg" role="group" aria-label="Display currency">
          <button
            type="button"
            className={`t-seg__btn${displayCurrency === "RUB" ? " t-seg__btn--on" : ""}`}
            onClick={() => setDisplayCurrency("RUB")}
          >
            ₽
          </button>
          <button
            type="button"
            className={`t-seg__btn${displayCurrency === "USD" ? " t-seg__btn--on" : ""}`}
            onClick={() => setDisplayCurrency("USD")}
          >
            $
          </button>
        </div>

        <div className="t-seg t-seg--dark" role="group" aria-label="Zone filter">
          {ZONES.map((z) => (
            <button
              key={z}
              type="button"
              className={`t-seg__btn${zone === z ? " t-seg__btn--on" : ""}`}
              onClick={() => setZone(z)}
            >
              {z}
            </button>
          ))}
        </div>

        {spot != null && eff != null && (
          <div className="t-hdr__fx num">
            SPOT {fmtRate(spot)}
            <br />
            EFF {fmtRate(eff)}
          </div>
        )}

        <div className="t-hdr__avatar" aria-hidden title="Profile" />
      </div>
    </header>
  );
}
