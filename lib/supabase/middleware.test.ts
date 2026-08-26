import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/supabase/middleware";

describe("isPublicPath", () => {
  it("allows auth, offline, and cron routes without session", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/offline")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/api/cron/fx")).toBe(true);
    expect(isPublicPath("/api/cron/agent")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/api/meta")).toBe(false);
  });
});
