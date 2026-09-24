import type { ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: ReactNode;
  headExtra?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean;
  gradient?: boolean;
};

export default function TerminalPanel({
  title,
  subtitle,
  headExtra,
  children,
  className,
  flush,
  gradient,
}: Props) {
  const cls = ["t-panel", gradient ? "t-panel--gradient" : "", className ?? ""].filter(Boolean).join(" ");

  return (
    <section className={cls}>
      {title ? (
        <div className="t-panel__head">
          <div>
            <span className="t-panel__title">{title}</span>
            {subtitle ? <span className="t-panel__sub">{subtitle}</span> : null}
          </div>
          {headExtra}
        </div>
      ) : null}
      <div className={flush ? "t-panel__body t-panel__body--flush" : "t-panel__body"}>{children}</div>
    </section>
  );
}
