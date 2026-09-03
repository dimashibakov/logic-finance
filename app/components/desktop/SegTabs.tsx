import type { ReactNode } from "react";

type Tab = { id: string; label: string };

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
};

export default function SegTabs({ tabs, active, onChange, className }: Props) {
  return (
    <div className={["lf-seg", "lf-bento-pressable", className ?? ""].filter(Boolean).join(" ")} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`lf-seg__btn${active === tab.id ? " lf-seg__btn--on" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export type { Tab as SegTab };
