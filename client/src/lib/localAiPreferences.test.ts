import { describe, expect, it } from "vitest";
import { isLocalAiMode, resolveLocalExecution } from "./localAiPreferences";

describe("local AI preferences", () => {
  it("accepts only supported local modes", () => {
    expect(isLocalAiMode("auto")).toBe(true);
    expect(isLocalAiMode("server")).toBe(false);
  });

  it("falls back to rules when selected model is not ready", () => {
    expect(resolveLocalExecution("webgpu", { phiReady: false, semanticReady: false })).toBe("rules");
    expect(resolveLocalExecution("wasm", { phiReady: false, semanticReady: false })).toBe("rules");
  });

  it("prioritizes WebGPU then WASM in automatic mode", () => {
    expect(resolveLocalExecution("auto", { phiReady: true, semanticReady: true })).toBe("local-webgpu");
    expect(resolveLocalExecution("auto", { phiReady: false, semanticReady: true })).toBe("local-wasm");
  });
});
