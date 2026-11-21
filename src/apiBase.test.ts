import { describe, expect, it } from "vitest";
import { resolveApiBase } from "./apiBase";

describe("resolveApiBase", () => {
  it("uses same-origin API routes in a Vercel production build", () => {
    expect(resolveApiBase(undefined, true)).toBe("");
  });

  it("keeps the local backend default during development", () => {
    expect(resolveApiBase(undefined, false)).toBe("http://127.0.0.1:8000");
  });
});
