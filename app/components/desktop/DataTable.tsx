import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  flush?: boolean;
};

export default function DataTable({ children, className, flush }: Props) {
  const cls = ["lf-bento-table", flush ? "lf-data-table--flush" : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <div className={flush ? "lf-desktop-panel lf-desktop-panel--flush" : undefined}>
      <table className={cls}>{children}</table>
    </div>
  );
}
