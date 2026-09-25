import { describe, expect, it } from "vitest";
import { analyzeLocalQualityQuestion } from "./localQualityAnalytics";

describe("local quality analytics", () => {
  const stats = {
    total: 10,
    criticalCases: 3,
    byStatus: { CLOSED: 6, DELAYED: 2, ONGOING: 2 },
    topSuppliers: [{ name: "Fornecedor A", count: 5 }, { name: "Fornecedor B", count: 3 }],
    weeklyTrend: [{ weekKey: "2026-W38", total: 4, closed: 2, delayed: 1 }],
  };

  it("answers overview questions using local rules", () => {
    const result = analyzeLocalQualityQuestion("Qual é o panorama geral?", stats);
    expect(result.intent).toBe("overview");
    expect(result.execution).toBe("rules");
    expect(result.answer).toContain("10 defeito(s)");
    expect(result.focusIds).toContain("total-defects");
  });

  it("identifies the supplier concentration", () => {
    const result = analyzeLocalQualityQuestion("Quais fornecedores concentram mais defeitos?", stats);
    expect(result.intent).toBe("supplier_aging");
    expect(result.answer).toContain("Fornecedor A");
    expect(result.cards[0].value).toBe("5");
    expect(result.focusIds).toEqual(["top-suppliers"]);
  });

  it("reports triage accuracy locally", () => {
    const result = analyzeLocalQualityQuestion("Como está a acurácia do Triage Agent?", stats, [{ accuracy: 87 }]);
    expect(result.intent).toBe("triage_accuracy");
    expect(result.answer).toContain("87%");
    expect(result.sourceLabel).toContain("acurácia");
  });

  it("does not call a remote execution path for unsupported questions", () => {
    const result = analyzeLocalQualityQuestion("Explique algo fora do catálogo", stats);
    expect(result.execution).toBe("rules");
    expect(result.intent).toBe("overview");
  });
});
