import { describe, expect, it } from "vitest";
import { analyzeLocalQualityQuestion, detectIntent, localChartSpecSchema, type LocalAnalyticsSnapshot } from "./localQualityAnalytics";

const snapshot: LocalAnalyticsSnapshot = {
  id: "snap-test",
  capturedAt: "2026-09-25T12:00:00.000Z",
  tenantId: 1,
  filters: { dateFrom: "2026-09-01", dateTo: "2026-09-25" },
  stats: {
    total: 10,
    criticalCases: 3,
    byStatus: { CLOSED: 6, DELAYED: 2, ONGOING: 2 },
    topSuppliers: [{ name: "Fornecedor A", count: 5 }, { name: "Fornecedor B", count: 3 }],
    supplierMetrics: [
      { name: "Fornecedor A", total: 5, averageAging: 42, critical: 3, severities: { S: 1, A: 2 } },
      { name: "Fornecedor B", total: 3, averageAging: 15, critical: 0, severities: { B: 3 } },
    ],
    weeklyTrend: [{ weekKey: "2026-W38", total: 4, closed: 2, delayed: 1 }],
  },
  accuracyTrend: [{ accuracy: 87 }],
  topCauses: [{ cause: "Falha de processo", count: 4, cumulativePercentage: "40.0" }],
};

describe("local quality analytics", () => {
  it("answers overview questions with snapshot metadata", () => {
    const result = analyzeLocalQualityQuestion("Qual é o panorama geral?", snapshot);
    expect(result.intent).toBe("overview");
    expect(result.execution).toBe("rules");
    expect(result.answer).toContain("10 defeito(s)");
    expect(result.snapshot.id).toBe("snap-test");
    expect(result.evidence[0].calculation).toContain("6 encerrados");
  });

  it("uses aging instead of occurrence count for supplier ranking", () => {
    const result = analyzeLocalQualityQuestion("Quais fornecedores têm maior aging?", snapshot);
    expect(result.intent).toBe("supplier_aging");
    expect(result.answer).toContain("42 dias");
    expect(result.chart?.unit).toBe("dias");
  });

  it("supports the full initial intent catalog", () => {
    expect(detectIntent("Compare severidade por fornecedor")).toBe("severity_supplier");
    expect(detectIntent("Quais causas raiz aparecem mais?")).toBe("root_cause");
    expect(detectIntent("Gere um gráfico de Pareto")).toBe("pareto");
    expect(detectIntent("Como está a acurácia do Triage Agent?")).toBe("triage_accuracy");
  });

  it("returns an honest unsupported result", () => {
    const result = analyzeLocalQualityQuestion("Explique o clima de amanhã", snapshot);
    expect(result.intent).toBe("unsupported");
    expect(result.execution).toBe("rules");
    expect(result.suggestions?.length).toBeGreaterThan(0);
  });

  it("rejects unsafe or unknown chart types", () => {
    expect(() => localChartSpecSchema.parse({ type: "html", title: "X", data: [], color: "teal" })).toThrow();
    expect(localChartSpecSchema.parse({ type: "line", title: "Tendência", data: [{ label: "W1", value: 1 }], color: "teal" }).type).toBe("line");
  });
});
