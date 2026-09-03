import Link from "next/link";
import { fmtNative } from "@/lib/format";
import { fmtDueShort, type PaymentEvent } from "@/lib/payments";
import MonogramBadge from "./MonogramBadge";

type Props = {
  event: PaymentEvent;
  zoneShort: boolean;
  href?: string;
};

function PaymentCardContent({ event, zoneShort }: Omit<Props, "href">) {
  const covered = !zoneShort;
  return (
    <>
      <div className="lf-bento-pcard__due">{fmtDueShort(event.date)}</div>
      <div className="lf-bento-pcard__name">
        <MonogramBadge
          account={{ name: event.name, type: event.kind, currency: event.currency }}
          className="lf-bento-pcard__badge"
        />
        <span>{event.name}</span>
      </div>
      <div className={`lf-bento-pcard__amt${event.hot ? " lf-text-danger" : ""}`}>
        {event.estimated && <span className="lf-text-faint">≈ </span>}
        {fmtNative(event.amount, event.currency)}
      </div>
      <div className="lf-bento-pcard__tags">
        {event.hot && <span className="lf-bento-tag lf-bento-tag--hot">HOT</span>}
        {covered && <span className="lf-bento-tag lf-bento-tag--covered">COVERED</span>}
        {event.highApr && event.apr != null && (
          <span className="lf-bento-tag lf-bento-tag--apr">APR {event.apr.toFixed(0)}%</span>
        )}
      </div>
    </>
  );
}

export default function PaymentCard({ event, zoneShort, href }: Props) {
  const cls = `lf-bento-pcard lf-bento-pressable${event.hot ? " lf-bento-pcard--hot" : ""}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        <PaymentCardContent event={event} zoneShort={zoneShort} />
      </Link>
    );
  }
  return (
    <div className={cls}>
      <PaymentCardContent event={event} zoneShort={zoneShort} />
    </div>
  );
}
