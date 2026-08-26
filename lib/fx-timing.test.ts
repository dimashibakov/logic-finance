import { describe, expect, it } from "vitest";
import { computeFxTiming } from "./fx-timing";

function rows(values: number[], start = "2026-01-01") {
  return values.map((v, i) => {
    const d = new Date(`${start}T12:00:00`);
    d.setDate(d.getDate() + i);
    return { rate_date: d.toISOString().slice(0, 10), rub_per_usd: v };
  });
}

describe("computeFxTiming", () => {
  it("marks favorable when current is ≥2% below 30d average", () => {
    const history = rows(Array.from({ length: 29 }, () => 100).concat(95));
    const stats = computeFxTiming(history);
    expect(stats.verdict).toBe("favorable");
    expect(stats.current).toBe(95);
  });

  it("marks hold when current is ≥2% above 30d average", () => {
    const history = rows(Array.from({ length: 29 }, () => 100).concat(105));
    const stats = computeFxTiming(history);
    expect(stats.verdict).toBe("hold");
  });

  it("marks neutral near average", () => {
    const history = rows(Array.from({ length: 30 }, () => 80));
    const stats = computeFxTiming(history);
    expect(stats.verdict).toBe("neutral");
    expect(stats.avg30).toBe(80);
  });
});
