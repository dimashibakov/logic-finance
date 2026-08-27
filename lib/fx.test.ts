import { describe, expect, it } from "vitest";
import { latestByKind, getRubPerUsd, type FxRate } from "./fx";

describe("latestByKind", () => {
  it("picks the newest rate_date regardless of array order", () => {
    const rates: FxRate[] = [
      { rate_date: "2026-01-01", rub_per_usd: 77.12, kind: "spot", notes: null },
      { rate_date: "2026-08-20", rub_per_usd: 84.28, kind: "spot", notes: null },
      { rate_date: "2026-03-01", rub_per_usd: 80, kind: "spot", notes: null },
    ];
    expect(latestByKind(rates, "spot")?.rub_per_usd).toBe(84.28);
    expect(getRubPerUsd(rates, "spot")).toBe(84.28);
  });

  it("ignores other kinds", () => {
    const rates: FxRate[] = [
      { rate_date: "2026-08-01", rub_per_usd: 82, kind: "effective", notes: null },
      { rate_date: "2026-08-20", rub_per_usd: 84.28, kind: "spot", notes: null },
    ];
    expect(getRubPerUsd(rates, "spot")).toBe(84.28);
    expect(getRubPerUsd(rates, "effective")).toBe(82);
  });
});
