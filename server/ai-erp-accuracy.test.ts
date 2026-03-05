import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// =====================================================
// AI ERP/SAP INTEGRATION & TRIAGE ACCURACY MONITORING
// Tests: Backend procedures, UI components, field mappings,
//        accuracy calculations, override workflow
// =====================================================

const ROUTERS_PATH = path.join(__dirname, "routers.ts");
const AI_CONTROL_UI_PATH = path.join(__dirname, "..", "client", "src", "pages", "AiControlCenter.tsx");
const INTEGRATION_AGENT_PATH = path.join(__dirname, "aiAgents", "integrationAgent.ts");

// ─── ERP Configuration Procedures ───────────────────
describe("ERP/SAP Integration — Backend Procedures", () => {
  const routersContent = fs.readFileSync(ROUTERS_PATH, "utf-8");

  it("should have getErpConfig procedure", () => {
    expect(routersContent).toContain("getErpConfig:");
    expect(routersContent).toContain("protectedProcedure.query");
  });

  it("should have updateErpConfig mutation", () => {
    expect(routersContent).toContain("updateErpConfig:");
    expect(routersContent).toContain("protectedProcedure");
  });

  it("should have testErpConnection mutation", () => {
    expect(routersContent).toContain("testErpConnection:");
    expect(routersContent).toContain("baseUrl: z.string()");
    expect(routersContent).toContain("apiKey: z.string()");
  });

  it("should have triggerErpSync mutation", () => {
    expect(routersContent).toContain("triggerErpSync:");
    expect(routersContent).toContain('direction: z.enum(["inbound", "outbound"])');
  });

  it("getErpConfig should return all required fields", () => {
    expect(routersContent).toContain("erpType:");
    expect(routersContent).toContain("baseUrl:");
    expect(routersContent).toContain("syncDirection:");
    expect(routersContent).toContain("fieldMapping:");
    expect(routersContent).toContain("lastSyncAt:");
    expect(routersContent).toContain("lastSyncStatus:");
    expect(routersContent).toContain("totalSynced:");
    expect(routersContent).toContain("syncErrors:");
  });

  it("updateErpConfig should support all ERP types", () => {
    expect(routersContent).toContain('"sap"');
    expect(routersContent).toContain('"oracle"');
    expect(routersContent).toContain('"dynamics"');
    expect(routersContent).toContain('"custom"');
  });

  it("updateErpConfig should support all sync directions", () => {
    expect(routersContent).toContain('"inbound"');
    expect(routersContent).toContain('"outbound"');
    expect(routersContent).toContain('"bidirectional"');
  });

  it("updateErpConfig should validate sync interval range", () => {
    expect(routersContent).toContain("z.number().min(5).max(1440)");
  });

  it("testErpConnection should handle timeout", () => {
    expect(routersContent).toContain("AbortController");
    expect(routersContent).toContain("setTimeout");
    expect(routersContent).toContain("10000");
    expect(routersContent).toContain("Timeout: ERP não respondeu em 10s");
  });

  it("triggerErpSync should update last sync timestamp", () => {
    expect(routersContent).toContain("lastSyncAt");
    expect(routersContent).toContain("lastSyncStatus");
    expect(routersContent).toContain("totalSynced");
  });

  it("triggerErpSync should call integrationAgent.execute", () => {
    expect(routersContent).toContain("integrationAgent");
    expect(routersContent).toContain("integration.erp_sync");
  });
});

// ─── ERP Field Mapping ──────────────────────────────
describe("ERP/SAP Integration — Field Mapping", () => {
  const routersContent = fs.readFileSync(ROUTERS_PATH, "utf-8");

  it("should have default SAP QM field mapping", () => {
    expect(routersContent).toContain("NOTIFICATION_ID");
    expect(routersContent).toContain("VENDOR_CODE");
    expect(routersContent).toContain("MATERIAL_NUMBER");
    expect(routersContent).toContain("DEFECT_TEXT");
    expect(routersContent).toContain("PRIORITY");
  });

  it("should support custom field mapping via updateErpConfig", () => {
    expect(routersContent).toContain("fieldMapping: z.record(z.string(), z.string())");
  });
});

// ─── Integration Agent ──────────────────────────────
describe("ERP/SAP Integration — Integration Agent", () => {
  it("integrationAgent.ts should exist", () => {
    expect(fs.existsSync(INTEGRATION_AGENT_PATH)).toBe(true);
  });

  it("should extend AgentBase", () => {
    const content = fs.readFileSync(INTEGRATION_AGENT_PATH, "utf-8");
    expect(content).toContain("extends AgentBase");
    expect(content).toContain("class IntegrationAgent");
  });

  it("should handle ERP sync events", () => {
    const content = fs.readFileSync(INTEGRATION_AGENT_PATH, "utf-8");
    expect(content).toContain("erp");
  });

  it("should implement execute method", () => {
    const content = fs.readFileSync(INTEGRATION_AGENT_PATH, "utf-8");
    expect(content).toContain("execute");
  });
});

// ─── Triage Accuracy Procedures ─────────────────────
describe("Triage Accuracy Monitoring — Backend Procedures", () => {
  const routersContent = fs.readFileSync(ROUTERS_PATH, "utf-8");

  it("should have triageAccuracy query procedure", () => {
    expect(routersContent).toContain("triageAccuracy:");
    expect(routersContent).toContain("protectedProcedure.query");
  });

  it("triageAccuracy should return total, overridden, approved, accuracy", () => {
    expect(routersContent).toContain("allDecisions.length");
    expect(routersContent).toContain("OVERRIDDEN");
    expect(routersContent).toContain("APPROVED");
    expect(routersContent).toContain("EXECUTED");
  });

  it("triageAccuracy should calculate accuracy percentage", () => {
    expect(routersContent).toContain("(approved / total) * 100");
  });

  it("triageAccuracy should breakdown by decision type (byField)", () => {
    expect(routersContent).toContain("byField");
    expect(routersContent).toContain("d.decisionType");
  });

  it("triageAccuracy should return recent overrides", () => {
    expect(routersContent).toContain("recentOverrides");
    expect(routersContent).toContain(".slice(0, 20)");
  });

  it("should have overrideTriageDecision mutation", () => {
    expect(routersContent).toContain("overrideTriageDecision:");
    expect(routersContent).toContain("decisionId: z.number()");
    expect(routersContent).toContain("humanValue: z.string()");
    expect(routersContent).toContain("reason: z.string().optional()");
  });

  it("overrideTriageDecision should set status to OVERRIDDEN", () => {
    expect(routersContent).toContain('status: "OVERRIDDEN"');
  });

  it("overrideTriageDecision should record reviewer info", () => {
    expect(routersContent).toContain("reviewedBy: ctx.user.id");
    expect(routersContent).toContain("reviewedAt:");
  });

  it("overrideTriageDecision should trigger feedback agent", () => {
    expect(routersContent).toContain("feedbackAgent");
    expect(routersContent).toContain("feedback.override");
  });

  it("should have accuracyTrend query procedure", () => {
    expect(routersContent).toContain("accuracyTrend:");
    expect(routersContent).toContain("protectedProcedure.query");
  });

  it("accuracyTrend should group by week", () => {
    expect(routersContent).toContain("weekMap");
    expect(routersContent).toContain("weekStart");
    expect(routersContent).toContain("getDay()");
  });

  it("accuracyTrend should return weekly accuracy data", () => {
    expect(routersContent).toContain("week");
    expect(routersContent).toContain("total: data.total");
    expect(routersContent).toContain("correct: data.correct");
    expect(routersContent).toContain("accuracy:");
  });
});

// ─── AI Control Center UI — ERP Tab ─────────────────
describe("AI Control Center UI — ERP/SAP Tab", () => {
  const uiContent = fs.readFileSync(AI_CONTROL_UI_PATH, "utf-8");

  it("should have ERP/SAP tab trigger", () => {
    expect(uiContent).toContain('value="erp"');
    expect(uiContent).toContain("ERP/SAP");
  });

  it("should have ErpIntegrationConfig component", () => {
    expect(uiContent).toContain("function ErpIntegrationConfig");
    expect(uiContent).toContain("<ErpIntegrationConfig");
  });

  it("should use getErpConfig query", () => {
    expect(uiContent).toContain("trpc.aiControl.getErpConfig.useQuery()");
  });

  it("should use updateErpConfig mutation", () => {
    expect(uiContent).toContain("trpc.aiControl.updateErpConfig.useMutation()");
  });

  it("should use triggerErpSync mutation", () => {
    expect(uiContent).toContain("trpc.aiControl.triggerErpSync.useMutation()");
  });

  it("should have ERP type selector with SAP, Oracle, Dynamics, TOTVS, Custom", () => {
    expect(uiContent).toContain("SAP ECC/S4HANA");
    expect(uiContent).toContain("Oracle EBS");
    expect(uiContent).toContain("Microsoft Dynamics");
    expect(uiContent).toContain("TOTVS Protheus");
    expect(uiContent).toContain("API Customizada");
  });

  it("should have authentication type selector", () => {
    expect(uiContent).toContain("API Key");
    expect(uiContent).toContain("OAuth 2.0");
    expect(uiContent).toContain("Basic Auth");
    expect(uiContent).toContain("Certificado mTLS");
  });

  it("should have sync direction selector", () => {
    expect(uiContent).toContain("Bidirecional");
    expect(uiContent).toContain("ERP → QTrack");
    expect(uiContent).toContain("QTrack → ERP");
  });

  it("should have sync interval options", () => {
    expect(uiContent).toContain("5 minutos");
    expect(uiContent).toContain("15 minutos");
    expect(uiContent).toContain("30 minutos");
    expect(uiContent).toContain("1 hora");
    expect(uiContent).toContain("6 horas");
    expect(uiContent).toContain("24 horas");
  });

  it("should have field mapping editor", () => {
    expect(uiContent).toContain("fieldMapping");
    expect(uiContent).toContain("Mapeamento de Campos");
    expect(uiContent).toContain("textarea");
  });

  it("should have SAP transaction codes reference", () => {
    expect(uiContent).toContain("QM01");
    expect(uiContent).toContain("QM02");
    expect(uiContent).toContain("QM03");
    expect(uiContent).toContain("BAPI_QUALNOT");
    expect(uiContent).toContain("RFC_READ_TABLE");
  });

  it("should have manual sync buttons", () => {
    expect(uiContent).toContain("Sync ERP → QTrack");
    expect(uiContent).toContain("Sync QTrack → ERP");
  });

  it("should show configuration status badge", () => {
    expect(uiContent).toContain("Configurado");
    expect(uiContent).toContain("Não Configurado");
  });

  it("should have connection status summary cards", () => {
    expect(uiContent).toContain("Tipo ERP");
    expect(uiContent).toContain("Direção");
    expect(uiContent).toContain("Intervalo");
    expect(uiContent).toContain("Última Sync");
  });
});

// ─── AI Control Center UI — Accuracy Tab ────────────
describe("AI Control Center UI — Triage Accuracy Tab", () => {
  const uiContent = fs.readFileSync(AI_CONTROL_UI_PATH, "utf-8");

  it("should have Accuracy tab trigger", () => {
    expect(uiContent).toContain('value="accuracy"');
    expect(uiContent).toContain("Acurácia");
  });

  it("should have TriageAccuracyMonitor component", () => {
    expect(uiContent).toContain("function TriageAccuracyMonitor");
    expect(uiContent).toContain("<TriageAccuracyMonitor");
  });

  it("should use triageAccuracy query", () => {
    expect(uiContent).toContain("trpc.aiControl.triageAccuracy.useQuery()");
  });

  it("should use overrideTriageDecision mutation", () => {
    expect(uiContent).toContain("trpc.aiControl.overrideTriageDecision.useMutation()");
  });

  it("should display accuracy KPI cards", () => {
    expect(uiContent).toContain("Acurácia");
    expect(uiContent).toContain("Total Decisões");
    expect(uiContent).toContain("Aprovadas");
    expect(uiContent).toContain("Overrides");
  });

  it("should have accuracy quality labels", () => {
    expect(uiContent).toContain("Excelente");
    expect(uiContent).toContain("Bom");
    expect(uiContent).toContain("Precisa Ajuste");
    expect(uiContent).toContain("Crítico");
  });

  it("should display accuracy by field breakdown", () => {
    expect(uiContent).toContain("Acurácia por Campo");
    expect(uiContent).toContain("byField");
  });

  it("should have override form", () => {
    expect(uiContent).toContain("Corrigir Decisão");
    expect(uiContent).toContain("Valor Correto");
    expect(uiContent).toContain("Motivo (opcional)");
    expect(uiContent).toContain("Registrar Override");
  });

  it("should display recent overrides table", () => {
    expect(uiContent).toContain("Overrides Recentes");
    expect(uiContent).toContain("recentOverrides");
  });

  it("should have feedback loop info section", () => {
    expect(uiContent).toContain("Feedback Loop Automático");
    expect(uiContent).toContain("Feedback Agent");
    expect(uiContent).toContain("acurácia ≥ 90%");
    expect(uiContent).toContain("override ≤ 10%");
  });

  it("should show empty state when no overrides", () => {
    expect(uiContent).toContain("Nenhum override registrado");
    expect(uiContent).toContain("acurácia total");
  });
});

// ─── AI Control Center UI — Tab Structure ───────────
describe("AI Control Center UI — Tab Structure", () => {
  const uiContent = fs.readFileSync(AI_CONTROL_UI_PATH, "utf-8");

  it("should have at least 5 tab triggers", () => {
    const tabTriggerValues = uiContent.match(/TabsTrigger[^>]*value="[^"]+"/g) || [];
    expect(tabTriggerValues.length).toBeGreaterThanOrEqual(5);
  });

  it("should have all 5 tab values", () => {
    expect(uiContent).toContain('value="agents"');
    expect(uiContent).toContain('value="decisions"');
    expect(uiContent).toContain('value="guardrails"');
    expect(uiContent).toContain('value="erp"');
    expect(uiContent).toContain('value="accuracy"');
  });

  it("should have all 5 TabsContent sections", () => {
    const tabContents = uiContent.match(/<TabsContent/g) || [];
    expect(tabContents.length).toBeGreaterThanOrEqual(5);
  });

  it("should maintain dark navy enterprise theme", () => {
    expect(uiContent).toContain("rgba(15,23,42,0.8)");
    expect(uiContent).toContain("rgba(255,255,255,0.08)");
  });

  it("should use proper icons for new tabs", () => {
    expect(uiContent).toContain("Server");
    expect(uiContent).toContain("Target");
  });
});

// ─── Guardrails for ERP Operations ──────────────────
describe("ERP/SAP Integration — Guardrails", () => {
  const routersContent = fs.readFileSync(ROUTERS_PATH, "utf-8");

  it("ERP config operations should use protectedProcedure", () => {
    // All ERP procedures should require authentication
    const erpSection = routersContent.substring(
      routersContent.indexOf("getErpConfig:"),
      routersContent.indexOf("triggerErpSync:") + 200
    );
    expect(erpSection).toContain("protectedProcedure");
  });

  it("Override operations should use protectedProcedure", () => {
    const overrideSection = routersContent.substring(
      routersContent.indexOf("overrideTriageDecision:"),
      routersContent.indexOf("overrideTriageDecision:") + 300
    );
    expect(overrideSection).toContain("protectedProcedure");
  });

  it("Override should store reviewer identity", () => {
    expect(routersContent).toContain("reviewedBy: ctx.user.id");
  });
});

// ─── Data Integrity ─────────────────────────────────
describe("ERP/SAP Integration — Data Integrity", () => {
  const routersContent = fs.readFileSync(ROUTERS_PATH, "utf-8");

  it("should persist ERP config in aiAutonomyConfig table", () => {
    const erpSection = routersContent.substring(
      routersContent.indexOf("getErpConfig:"),
      routersContent.indexOf("testErpConnection:")
    );
    expect(erpSection).toContain("aiAutonomyConfig");
    expect(erpSection).toContain('agentName, "integration"');
  });

  it("should use criticalActions JSON field for ERP params", () => {
    expect(routersContent).toContain("criticalActions");
    expect(routersContent).toContain("erpBaseUrl");
    expect(routersContent).toContain("erpApiKey");
    expect(routersContent).toContain("syncDirection");
    expect(routersContent).toContain("syncIntervalMinutes");
  });

  it("triageAccuracy should query from aiAgentDecisions table", () => {
    const accuracySection = routersContent.substring(
      routersContent.indexOf("triageAccuracy:"),
      routersContent.indexOf("overrideTriageDecision:")
    );
    expect(accuracySection).toContain("aiAgentDecisions");
    expect(accuracySection).toContain('agentName, "triage"');
  });
});
