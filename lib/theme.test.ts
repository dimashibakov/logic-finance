import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { themeInitScript } from "./theme";

describe("theme CSS smoke", () => {
  const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");

  it("brutalist root sets --bg to paper tone and uses data-theme selector", () => {
    expect(css).toContain('[data-theme="brutalist"]');
    expect(css).toMatch(/html\[data-theme="brutalist"\][\s\S]*--bg:\s*#d9d2c0/);
    expect(css).toMatch(/html,\s*body[\s\S]*background:\s*var\(--bg\)/);
  });

  it("lf-btn reads border and shadow from theme tokens", () => {
    expect(css).toMatch(/\.lf-btn[\s\S]*border:\s*var\(--card-border-w\)\s*solid\s*var\(--card-border\)/);
    expect(css).toMatch(/\.lf-btn[\s\S]*box-shadow:\s*var\(--shadow\)/);
    expect(css).toMatch(/html\[data-theme="brutalist"\][\s\S]*--shadow:\s*5px 5px 0 #14110c/);
    expect(css).toMatch(/html\[data-theme="brutalist"\][\s\S]*--card-border-w:\s*3px/);
  });

  it("theme bootstrap script sets documentElement.dataset.theme", () => {
    expect(themeInitScript).toContain("document.documentElement.dataset.theme");
  });
});
