import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "@/lib/auth-redirect";

describe("auth callback redirect", () => {
  it("defaults to the student dashboard", () => {
    expect(getSafeRedirectPath(null)).toBe("/dashboard");
  });

  it("allows a local path and its query string", () => {
    expect(getSafeRedirectPath("/dashboard?welcome=1")).toBe("/dashboard?welcome=1");
  });

  it("rejects external redirect targets", () => {
    expect(getSafeRedirectPath("//example.com")).toBe("/dashboard");
    expect(getSafeRedirectPath("https://example.com")).toBe("/dashboard");
  });
});
