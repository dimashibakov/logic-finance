import { describe, expect, it } from "vitest";
import { formatUpdatedDate, parseDateOnly } from "./format";

describe("parseDateOnly", () => {
  it("keeps the calendar day for YYYY-MM-DD", () => {
    const d = parseDateOnly("2026-09-01");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(1);
  });
});

describe("formatUpdatedDate", () => {
  it("formats timestamptz without noon parsing", () => {
    const label = formatUpdatedDate("2026-09-01T15:30:00+03:00");
    expect(label).toMatch(/^Updated /);
    expect(label).toContain("1");
    expect(label.toLowerCase()).toMatch(/сен/);
  });

  it("returns placeholder when missing", () => {
    expect(formatUpdatedDate(null)).toBe("Updated —");
  });
});
