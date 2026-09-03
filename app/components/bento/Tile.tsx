import type { ReactNode } from "react";

type Props = {
  label: string;
  children: ReactNode;
  className?: string;
  wide?: boolean;
  hero?: boolean;
  headExtra?: ReactNode;
};

export default function Tile({ label, children, className, wide, hero, headExtra }: Props) {
  return (
    <section
      className={[
        "lf-bento-tile",
        hero ? "lf-bento-tile--hero" : "",
        wide ? "lf-bento-tile--wide" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {headExtra ? (
        <div className="lf-bento-tile__head">
          <div className="lf-bento-lab">{label}</div>
          {headExtra}
        </div>
      ) : (
        <div className="lf-bento-lab">{label}</div>
      )}
      {children}
    </section>
  );
}
