import { describe, expect, it } from "vitest"
import { safeRedirectPath } from "./redirects"

describe("safeRedirectPath", () => {
  it("allows internal absolute paths", () => {
    expect(safeRedirectPath("/portal/citas?x=1", "/panel")).toBe("/portal/citas?x=1")
  })

  it("rejects external URLs and protocol-relative URLs", () => {
    expect(safeRedirectPath("https://example.com", "/panel")).toBe("/panel")
    expect(safeRedirectPath("//example.com", "/panel")).toBe("/panel")
  })

  it("falls back for empty or relative values", () => {
    expect(safeRedirectPath("", "/panel")).toBe("/panel")
    expect(safeRedirectPath("portal", "/panel")).toBe("/panel")
  })
})
