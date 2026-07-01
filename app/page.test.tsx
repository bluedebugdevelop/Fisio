import { beforeEach, describe, expect, it, vi } from "vitest"
import HomePage from "./page"

const redirectMock = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}))

describe("HomePage", () => {
  beforeEach(() => {
    redirectMock.mockClear()
  })

  it("redirects the root route to the panel entrypoint", () => {
    HomePage()

    expect(redirectMock).toHaveBeenCalledWith("/panel")
  })
})
