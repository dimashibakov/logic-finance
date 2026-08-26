import { effRate, type FxRate } from "./fx";

export type FxVerdict = "favorable" | "hold" | "neutral";

export type FxTimingStats = {
  current: number;
  eff: number;
  avg30: number;
  avg90: number;
  min90: number;
  max90: number;
  verdict: FxVerdict;
  verdictTitle: string;
  positionNote: string;
  series: { date: string; value: number }[];
};

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function pctDiff(current: number, base: number) {
  if (base <= 0) return 0;
  return ((current - base) / base) * 100;
}

export function computeFxTiming(spotRows: Pick<FxRate, "rate_date" | "rub_per_usd">[]): FxTimingStats {
  const sorted = [...spotRows].sort((a, b) => a.rate_date.localeCompare(b.rate_date));
  const values = sorted.map((r) => Number(r.rub_per_usd)).filter((n) => n > 0);
  const current = values.at(-1) ?? 0;
  const eff = effRate(current);

  const last30 = values.slice(-30);
  const avg30 = avg(last30.length ? last30 : values);
  const avg90 = avg(values);
  const min90 = values.length ? Math.min(...values) : 0;
  const max90 = values.length ? Math.max(...values) : 0;

  const diff30 = pctDiff(current, avg30);
  let verdict: FxVerdict = "neutral";
  let verdictTitle = "NEUTRAL";
  if (avg30 > 0 && diff30 <= -2) {
    verdict = "favorable";
    verdictTitle = "FAVORABLE — доллары дешевле обычного";
  } else if (avg30 > 0 && diff30 >= 2) {
    verdict = "hold";
    verdictTitle = "HOLD — дороже среднего";
  }

  let positionNote = "около среднего за 30 дней";
  if (avg30 > 0) {
    const abs = Math.abs(diff30);
    if (abs >= 0.5) {
      positionNote =
        diff30 < 0
          ? `на ${abs.toFixed(0)}% ниже среднего 30д`
          : `на ${abs.toFixed(0)}% выше среднего 30д`;
    }
  }
  if (min90 > 0 && current <= min90 * 1.005) {
    positionNote = `${positionNote} · около 90-дневного минимума`;
  } else if (max90 > 0 && current >= max90 * 0.995) {
    positionNote = `${positionNote} · около 90-дневного максимума`;
  }

  return {
    current,
    eff,
    avg30,
    avg90,
    min90,
    max90,
    verdict,
    verdictTitle,
    positionNote,
    series: sorted.map((r) => ({ date: r.rate_date, value: Number(r.rub_per_usd) })),
  };
}
