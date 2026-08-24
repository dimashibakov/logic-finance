import { supabase } from "@/lib/supabase";
import { fetchFxRates, getRubPerUsd } from "@/lib/fx";
import { fmtNative, toUsd, usd } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";
import { CreditCard, Landmark, Receipt, type LucideIcon } from "lucide-react";

type Obligation = {
  id: string;
  name: string;
  kind: string;
  currency: string;
  balance: number;
  apr: number | null;
  monthly_payment: number | null;
};

const KIND_LABELS: Record<string, string> = {
  loan: "Loan",
  credit_card: "Credit card",
  tax_rf: "Tax RF",
  tax_us: "Tax US",
  other: "Other",
};

const KIND_ICONS: Record<string, LucideIcon> = {
  loan: Landmark,
  credit_card: CreditCard,
  tax_rf: Receipt,
  tax_us: Receipt,
};

const ICON_BG: Record<string, string> = {
  loan: "#E8F0FE",
  credit_card: "#FEF3E2",
  tax_rf: "#F0F2F5",
  tax_us: "#F0F2F5",
};

const ICON_COLOR: Record<string, string> = {
  loan: C.blue,
  credit_card: C.amber,
  tax_rf: C.sub,
  tax_us: C.sub,
};

function displayName(name: string) {
  return name.replace(/\s*\(карта\)\s*$/i, "");
}

function byAprDesc(a: Obligation, b: Obligation) {
  return Number(b.apr ?? 0) - Number(a.apr ?? 0);
}

function subtitle(o: Obligation) {
  const kind = KIND_LABELS[o.kind] ?? o.kind;
  if (o.kind === "loan" && o.monthly_payment != null) {
    return `${kind} · monthly ${fmtNative(Number(o.monthly_payment), o.currency)}`;
  }
  return kind;
}

function AprPill({ apr }: { apr: number | null }) {
  if (apr == null) {
    return <span style={{ ...S.mono, fontSize: 12, color: C.faint }}>—</span>;
  }

  const value = Number(apr);
  let bg = "#F0F2F5";
  let color = C.sub;
  if (value >= 20) {
    bg = "#FDECEE";
    color = C.down;
  } else if (value >= 10) {
    bg = "#FEF3E2";
    color = C.amber;
  }

  return (
    <span
      style={{
        ...S.mono,
        fontSize: 11,
        fontWeight: 600,
        color,
        background: bg,
        padding: "4px 8px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {value.toFixed(1)}% APR
    </span>
  );
}

function ObligationCard({ o, isTarget }: { o: Obligation; isTarget: boolean }) {
  const Icon = KIND_ICONS[o.kind] ?? Receipt;
  const hasDebt = Number(o.balance) !== 0;
  const iconBg = ICON_BG[o.kind] ?? "#F0F2F5";
  const iconColor = ICON_COLOR[o.kind] ?? C.sub;

  return (
    <div style={{ ...S.card, display: "flex", alignItems: "center", gap: 12, padding: "14px 14px" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={17} strokeWidth={2} color={iconColor} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>{displayName(o.name)}</span>
          {isTarget && (
            <span
              style={{
                ...S.mono,
                fontSize: 10,
                fontWeight: 600,
                color: C.up,
                background: `${C.up}18`,
                padding: "2px 7px",
                borderRadius: 999,
                whiteSpace: "nowrap",
              }}
            >
              target #1
            </span>
          )}
        </div>
        <div style={{ ...S.mono, fontSize: 11, color: C.faint, marginTop: 3 }}>{subtitle(o)}</div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ ...S.mono, fontSize: 14, fontWeight: 600, color: hasDebt ? C.down : C.faint }}>
          {fmtNative(Number(o.balance), o.currency)}
        </div>
        <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
          <AprPill apr={o.apr} />
        </div>
      </div>
    </div>
  );
}

function Section({ title, items, targetId }: { title: string; items: Obligation[]; targetId?: string }) {
  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ ...S.label, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((o) => (
          <ObligationCard key={o.id} o={o} isTarget={!!targetId && o.id === targetId} />
        ))}
      </div>
    </div>
  );
}

export default async function DebtsPage() {
  const [{ data: oblData }, rates] = await Promise.all([
    supabase.from("obligations").select("*"),
    fetchFxRates(),
  ]);
  const rubPerUsd = getRubPerUsd(rates, "spot");

  const obligations = ((oblData ?? []) as Obligation[]).filter((o) => Number(o.balance) !== 0 || o.apr != null);

  const activeDebt = obligations.filter((o) => Number(o.balance) !== 0).sort(byAprDesc);
  const cardsReserves = obligations.filter((o) => Number(o.balance) === 0).sort(byAprDesc);

  const totalDebt = obligations.reduce((s, o) => s + toUsd(Number(o.balance), o.currency, rubPerUsd), 0);
  const totalMonthly = obligations.reduce((s, o) => s + toUsd(Number(o.monthly_payment ?? 0), o.currency, rubPerUsd), 0);

  const target = activeDebt.length > 0 ? activeDebt[0] : undefined;

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <div style={S.header}>
          <span style={S.title}>DEBTS · Logic Finance</span>
          <span style={{ ...S.mono, fontSize: 12, color: C.sub }}>{obligations.length} items</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>Total debt</div>
            <div style={{ ...S.mono, fontSize: 20, fontWeight: 600, color: C.down, marginTop: 3 }}>{usd(totalDebt)}</div>
          </div>
          <div style={S.card}>
            <div style={{ ...S.mono, fontSize: 11, color: C.sub }}>Monthly service</div>
            <div style={{ ...S.mono, fontSize: 20, fontWeight: 600, color: C.ink, marginTop: 3 }}>{usd(totalMonthly)}</div>
          </div>
        </div>

        {obligations.length === 0 ? (
          <div style={{ ...S.card, padding: 16, fontSize: 13, color: C.sub }}>No obligations — check obligations table in Supabase.</div>
        ) : (
          <>
            <Section title="ACTIVE DEBT" items={activeDebt} targetId={target?.id} />
            <Section title="CARDS & RESERVES" items={cardsReserves} />
          </>
        )}

        <div style={{ ...S.card, marginTop: 4, background: "#F0F4FF", borderColor: "#1652F022", display: "flex", gap: 10 }}>
          <span style={{ ...S.mono, color: C.blue, fontWeight: 600 }}>i</span>
          <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
            Avalanche: direct extra payments to the highest-APR debt first (target #1).
          </div>
        </div>
      </div>
    </div>
  );
}
