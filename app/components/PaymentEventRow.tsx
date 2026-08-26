import { fmtNative } from "@/lib/format";
import { fmtDueShort, type PaymentEvent } from "@/lib/payments";

type Props = {
  event: PaymentEvent;
  zoneShort: boolean;
  compact?: boolean;
};

export default function PaymentEventRow({ event, zoneShort, compact }: Props) {
  const covCls = zoneShort ? "lf-pay-cov lf-pay-cov--short" : "lf-pay-cov lf-pay-cov--ok";
  const covLabel = zoneShort ? "short" : "covered";

  return (
    <div className="lf-row lf-pay-row">
      <div className="lf-pay-row__main">
        <div style={{ fontSize: compact ? 14 : 14.5, fontWeight: 550, lineHeight: 1.35 }}>
          {event.recurring && <span className="lf-pay-rec" title="Recurring">↻</span>}
          {event.name}
          {event.hot && <span className="lf-hot">hot</span>}
          {event.highApr && event.apr != null && (
            <span className="lf-apr lf-apr--hi">APR {event.apr.toFixed(0)}%</span>
          )}
          <span className={covCls}>{covLabel}</span>
        </div>
        <div className="lf-mono lf-text-faint" style={{ fontSize: 11, marginTop: 3 }}>
          {fmtDueShort(event.date)}
          {!compact && (
            <>
              {" · "}
              {event.daysUntil === 0 ? "today" : event.daysUntil === 1 ? "1 day" : `${event.daysUntil} days`}
            </>
          )}
          {event.estimated && " · ≈ estimate"}
        </div>
      </div>
      <div
        className={`lf-mono lf-pay-row__amt${event.hot ? " lf-text-danger" : ""}`}
        style={{ fontSize: 14, fontWeight: 600, textAlign: "right", flexShrink: 0 }}
      >
        {event.estimated && <span className="lf-text-faint">≈ </span>}
        {fmtNative(event.amount, event.currency)}
      </div>
    </div>
  );
}
