import { describe, expect, it } from "vitest";
import { detectLocalRuntime, isLocalOnly } from "./localRuntime";

describe("local runtime", () => {
  it("never allows external calls in local mode", async () => {
    const status = await detectLocalRuntime();
    expect(status.externalCallsAllowed).toBe(false);
    expect(isLocalOnly(status)).toBe(true);
  });

  it("reports a supported local fallback", async () => {
    const status = await detectLocalRuntime();
    expect(["webgpu", "wasm", "rules"]).toContain(status.runtime);
    expect(status.label).toBeTruthy();
  });
});
