"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PaymentEvent } from "@/lib/payments";
import PaymentEventRow from "./PaymentEventRow";

const STORAGE_KEY = "lf-upcoming-open";

type Props = {
  events: PaymentEvent[];
  shortByCurrency: Record<"RUB" | "USD", boolean>;
  accountByObligation: Record<string, string | null | undefined>;
};

function paymentHref(event: PaymentEvent, accountByObligation: Record<string, string | null | undefined>) {
  const accountId = accountByObligation[event.obligationId];
  if (accountId) return `/account/${accountId}`;
  return `/payments#obl-${event.obligationId}`;
}

export default function UpcomingPaymentsSection({ events, shortByCurrency, accountByObligation }: Props) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "0") setOpen(false);
    } catch {
      /* ignore */
    }
  }, []);

  function toggle() {
    setOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  if (events.length === 0) return null;

  return (
    <>
      <div className="lf-sec-label">
        <button type="button" onClick={toggle} className="lf-sec-label__h lf-sec-toggle" aria-expanded={open}>
          Upcoming payments
          <span className="lf-text-faint" style={{ marginLeft: 8 }}>
            {open ? "▾" : "▸"}
          </span>
        </button>
        <Link href="/payments" className="lf-sec-label__m">
          all →
        </Link>
      </div>
      {open && (
        <div className="lf-card lf-card--flush">
          {events.map((e) => (
            <PaymentEventRow
              key={e.id}
              event={e}
              zoneShort={shortByCurrency[e.currency]}
              compact
              href={paymentHref(e, accountByObligation)}
            />
          ))}
        </div>
      )}
    </>
  );
}
