import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/supabase/middleware";

describe("isPublicPath", () => {
  it("allows auth and offline routes without session", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/offline")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/api/meta")).toBe(false);
  });
});
