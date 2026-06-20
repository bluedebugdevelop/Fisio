import { describe, it, expect } from "vitest"
import { renderTemplate } from "./render-template"

describe("renderTemplate", () => {
  it("replaces simple placeholders", () => {
    expect(renderTemplate("Hola {{name}}", { name: "Ana" })).toBe("Hola Ana")
  })
  it("leaves missing placeholders as empty string", () => {
    expect(renderTemplate("Hola {{name}}", {})).toBe("Hola ")
  })
  it("ignores unknown keys without throwing", () => {
    expect(renderTemplate("Hola {{x}}", { name: "Ana" })).toBe("Hola ")
  })
})
