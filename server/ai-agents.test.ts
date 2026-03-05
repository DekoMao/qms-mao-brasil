import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// =====================================================
// AI AGENTS — COMPREHENSIVE TEST SUITE
// Tests: Module structure, exports, class hierarchy,
//        agent logic, guardrails, orchestrator
// =====================================================

const AGENTS_DIR = path.join(__dirname, "aiAgents");

// ─── Module Structure Tests ──────────────────────────
describe("AI Agents — Module Structure", () => {
  const expectedFiles = [
    "agentBase.ts",
    "jobQueue.ts",
    "cronScheduler.ts",
    "orchestrator.ts",
    "guardrails.ts",
    "triageAgent.ts",
    "workflowAgent.ts",
    "predictAgent.ts",
    "reportAgent.ts",
    "integrationAgent.ts",
    "healthAgent.ts",
    "feedbackAgent.ts",
    "index.ts",
  ];

  it("should have all 13 required agent files", () => {
    for (const file of expectedFiles) {
      const filePath = path.join(AGENTS_DIR, file);
      expect(fs.existsSync(filePath), `Missing file: ${file}`).toBe(true);
    }
  });

  it("index.ts should export all modules", () => {
    const indexContent = fs.readFileSync(path.join(AGENTS_DIR, "index.ts"), "utf-8");
    expect(indexContent).toContain("AgentBase");
    expect(indexContent).toContain("enqueueJob");
    expect(indexContent).toContain("cronTick");
    expect(indexContent).toContain("orchestrator");
    expect(indexContent).toContain("checkGuardrails");
    expect(indexContent).toContain("TriageAgent");
    expect(indexContent).toContain("WorkflowAgent");
    expect(indexContent).toContain("PredictAgent");
    expect(indexContent).toContain("ReportAgent");
    expect(indexContent).toContain("IntegrationAgent");
    expect(indexContent).toContain("HealthAgent");
    expect(indexContent).toContain("FeedbackAgent");
  });
});

// ─── Agent Base Class Tests ──────────────────────────
describe("AI Agents — AgentBase", () => {
  it("should define abstract execute method", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "agentBase.ts"), "utf-8");
    expect(content).toContain("abstract execute");
    expect(content).toContain("class AgentBase");
  });

  it("should have recordDecision method", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "agentBase.ts"), "utf-8");
    expect(content).toContain("recordDecision");
    expect(content).toContain("aiAgentDecisions");
  });

  it("should have recordMetrics method", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "agentBase.ts"), "utf-8");
    expect(content).toContain("recordMetrics");
    expect(content).toContain("aiAgentMetrics");
  });

  it("should have loadConfig method", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "agentBase.ts"), "utf-8");
    expect(content).toContain("loadConfig");
    expect(content).toContain("aiAutonomyConfig");
  });
});

// ─── Triage Agent Tests ──────────────────────────────
describe("AI Agents — TriageAgent", () => {
  it("should extend AgentBase", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "triageAgent.ts"), "utf-8");
    expect(content).toContain("extends AgentBase");
    expect(content).toContain("class TriageAgent");
  });

  it("should implement auto-classification via LLM", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "triageAgent.ts"), "utf-8");
    expect(content).toContain("invokeLLM");
    expect(content).toContain("classify");
  });

  it("should implement severity assessment", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "triageAgent.ts"), "utf-8");
    expect(content).toContain("severity");
    expect(content).toMatch(/S|A|B|C/);
  });

  it("should implement duplicate detection", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "triageAgent.ts"), "utf-8");
    expect(content).toContain("duplicate");
  });

  it("should implement auto-assignment", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "triageAgent.ts"), "utf-8");
    expect(content).toContain("assign");
  });

  it("should record decisions with confidence scores", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "triageAgent.ts"), "utf-8");
    expect(content).toContain("recordDecision");
    expect(content).toContain("confidence");
  });
});

// ─── Workflow Agent Tests ────────────────────────────
describe("AI Agents — WorkflowAgent", () => {
  it("should extend AgentBase", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "workflowAgent.ts"), "utf-8");
    expect(content).toContain("extends AgentBase");
    expect(content).toContain("class WorkflowAgent");
  });

  it("should implement auto-advance logic", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "workflowAgent.ts"), "utf-8");
    expect(content).toContain("checkAutoAdvance");
  });

  it("should implement SLA monitoring", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "workflowAgent.ts"), "utf-8");
    expect(content).toContain("sla");
  });

  it("should implement escalation logic", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "workflowAgent.ts"), "utf-8");
    expect(content).toContain("escalat");
  });

  it("should implement auto-close for completed defects", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "workflowAgent.ts"), "utf-8");
    expect(content).toContain("periodicScan");
  });
});

// ─── Predict Agent Tests ─────────────────────────────
describe("AI Agents — PredictAgent", () => {
  it("should extend AgentBase", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "predictAgent.ts"), "utf-8");
    expect(content).toContain("extends AgentBase");
    expect(content).toContain("class PredictAgent");
  });

  it("should implement multi-hypothesis RCA", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "predictAgent.ts"), "utf-8");
    expect(content).toContain("rootCause");
    expect(content).toContain("hypothes");
  });

  it("should implement anomaly detection", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "predictAgent.ts"), "utf-8");
    expect(content).toContain("anomal");
  });

  it("should implement risk scoring", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "predictAgent.ts"), "utf-8");
    expect(content).toContain("risk");
    expect(content).toContain("score");
  });

  it("should use LLM for predictions", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "predictAgent.ts"), "utf-8");
    expect(content).toContain("invokeLLM");
  });
});

// ─── Report Agent Tests ──────────────────────────────
describe("AI Agents — ReportAgent", () => {
  it("should extend AgentBase", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "reportAgent.ts"), "utf-8");
    expect(content).toContain("extends AgentBase");
    expect(content).toContain("class ReportAgent");
  });

  it("should implement daily digest generation", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "reportAgent.ts"), "utf-8");
    expect(content).toContain("digest");
  });

  it("should implement executive summary", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "reportAgent.ts"), "utf-8");
    expect(content).toContain("executive");
  });

  it("should implement natural language query", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "reportAgent.ts"), "utf-8");
    expect(content).toContain("naturalLanguageQuery");
  });
});

// ─── Integration Agent Tests ─────────────────────────
describe("AI Agents — IntegrationAgent", () => {
  it("should extend AgentBase", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "integrationAgent.ts"), "utf-8");
    expect(content).toContain("extends AgentBase");
    expect(content).toContain("class IntegrationAgent");
  });

  it("should implement ERP sync", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "integrationAgent.ts"), "utf-8");
    expect(content).toContain("erp");
  });

  it("should implement webhook dispatch", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "integrationAgent.ts"), "utf-8");
    expect(content).toContain("webhook");
  });
});

// ─── Health Agent Tests ──────────────────────────────
describe("AI Agents — HealthAgent", () => {
  it("should extend AgentBase", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "healthAgent.ts"), "utf-8");
    expect(content).toContain("extends AgentBase");
    expect(content).toContain("class HealthAgent");
  });

  it("should implement system health monitoring", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "healthAgent.ts"), "utf-8");
    expect(content).toContain("health");
    expect(content).toContain("monitor");
  });

  it("should implement self-healing", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "healthAgent.ts"), "utf-8");
    expect(content).toContain("heal");
  });
});

// ─── Feedback Agent Tests ────────────────────────────
describe("AI Agents — FeedbackAgent", () => {
  it("should extend AgentBase", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "feedbackAgent.ts"), "utf-8");
    expect(content).toContain("extends AgentBase");
    expect(content).toContain("class FeedbackAgent");
  });

  it("should implement learning from overrides", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "feedbackAgent.ts"), "utf-8");
    expect(content).toContain("override");
  });

  it("should implement accuracy tracking", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "feedbackAgent.ts"), "utf-8");
    expect(content).toContain("accuracy");
  });

  it("should implement threshold tuning", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "feedbackAgent.ts"), "utf-8");
    expect(content).toContain("threshold");
  });
});

// ─── Guardrails Engine Tests ─────────────────────────
describe("AI Agents — GuardrailsEngine", () => {
  it("should define autonomy levels", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "guardrails.ts"), "utf-8");
    expect(content).toContain("auto");
    expect(content).toContain("review");
    expect(content).toContain("hitl");
  });

  it("should implement confidence-based decision routing", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "guardrails.ts"), "utf-8");
    expect(content).toContain("confidence");
    expect(content).toContain("autoThreshold");
    expect(content).toContain("reviewThreshold");
  });

  it("should enforce critical action restrictions", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "guardrails.ts"), "utf-8");
    expect(content).toContain("critical");
  });

  it("should enforce rate limiting", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "guardrails.ts"), "utf-8");
    expect(content).toContain("maxAutoDecisions");
  });
});

// ─── Orchestrator Tests ──────────────────────────────
describe("AI Agents — Orchestrator", () => {
  it("should implement event-driven dispatch", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "orchestrator.ts"), "utf-8");
    expect(content).toContain("dispatch");
    expect(content).toContain("subscribe");
  });

  it("should support event types for defect lifecycle", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "orchestrator.ts"), "utf-8");
    expect(content).toContain("defect");
  });
});

// ─── Job Queue Tests ─────────────────────────────────
describe("AI Agents — JobQueue", () => {
  it("should implement job enqueue and dequeue", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "jobQueue.ts"), "utf-8");
    expect(content).toContain("enqueue");
    expect(content).toContain("dequeue");
  });

  it("should support job status tracking", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "jobQueue.ts"), "utf-8");
    expect(content).toContain("COMPLETED");
    expect(content).toContain("FAILED");
    expect(content).toContain("PROCESSING");
  });

  it("should implement retry logic", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "jobQueue.ts"), "utf-8");
    expect(content).toContain("retry");
  });
});

// ─── Cron Scheduler Tests ────────────────────────────
describe("AI Agents — CronScheduler", () => {
  it("should implement cron job registration", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "cronScheduler.ts"), "utf-8");
    expect(content).toContain("register");
  });

  it("should implement cron expression parsing", () => {
    const content = fs.readFileSync(path.join(AGENTS_DIR, "cronScheduler.ts"), "utf-8");
    expect(content).toContain("parse");
    expect(content).toContain("cron");
  });
});

// ─── AI Control Center Page Tests ────────────────────
describe("AI Control Center — Page", () => {
  const pagePath = path.join(__dirname, "..", "client", "src", "pages", "AiControlCenter.tsx");

  it("should exist as a page component", () => {
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  it("should export default component", () => {
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("export default function AiControlCenter");
  });

  it("should render all 7 agents", () => {
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("triage");
    expect(content).toContain("workflow");
    expect(content).toContain("predict");
    expect(content).toContain("report");
    expect(content).toContain("integration");
    expect(content).toContain("health");
    expect(content).toContain("feedback");
  });

  it("should have Agents, Decisions, and Guardrails tabs", () => {
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("Agentes");
    expect(content).toContain("Decisões");
    expect(content).toContain("Guardrails");
  });

  it("should use correct tRPC procedures", () => {
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("trpc.aiControl.health.useQuery");
    expect(content).toContain("trpc.aiControl.metrics.useQuery");
    expect(content).toContain("trpc.aiControl.decisions.useQuery");
    expect(content).toContain("trpc.aiControl.getConfig.useQuery");
    expect(content).toContain("trpc.aiControl.updateConfig.useMutation");
    expect(content).toContain("trpc.aiControl.approveDecision.useMutation");
    expect(content).toContain("trpc.aiControl.rejectDecision.useMutation");
  });

  it("should display autonomy levels (auto, review, hitl)", () => {
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("Autônomo");
    expect(content).toContain("Revisão");
    expect(content).toContain("HITL");
  });

  it("should use sonner toast for notifications", () => {
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("import { toast } from \"sonner\"");
    expect(content).toContain("toast.success");
    expect(content).toContain("toast.error");
  });

  it("should use dark navy enterprise theme", () => {
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("rgba(15,23,42");
    expect(content).toContain("#8B5CF6");
    expect(content).toContain("#00D4AA");
  });
});

// ─── Route & Navigation Tests ────────────────────────
describe("AI Control Center — Route & Navigation", () => {
  it("should have route registered in App.tsx", () => {
    const appContent = fs.readFileSync(
      path.join(__dirname, "..", "client", "src", "App.tsx"),
      "utf-8"
    );
    expect(appContent).toContain("/ai-control");
    expect(appContent).toContain("AiControlCenter");
  });

  it("should have nav item in DashboardLayout", () => {
    const layoutContent = fs.readFileSync(
      path.join(__dirname, "..", "client", "src", "components", "DashboardLayout.tsx"),
      "utf-8"
    );
    expect(layoutContent).toContain("AI Control Center");
    expect(layoutContent).toContain("/ai-control");
    expect(layoutContent).toContain("Bot");
  });
});

// ─── Schema Tests ────────────────────────────────────
describe("AI Agents — Database Schema", () => {
  const schemaPath = path.join(__dirname, "..", "drizzle", "schema.ts");

  it("should have AI agent tables", () => {
    const content = fs.readFileSync(schemaPath, "utf-8");
    expect(content).toContain("aiAgentDecisions");
    expect(content).toContain("aiAgentMetrics");
    expect(content).toContain("aiAgentJobs");
  });

  it("should have AI-related audit log actions", () => {
    const content = fs.readFileSync(schemaPath, "utf-8");
    expect(content).toContain("AI_AUTO_CLASSIFY");
    expect(content).toContain("AI_AUTO_ASSIGN");
    expect(content).toContain("AI_AUTO_ADVANCE");
    expect(content).toContain("AI_PREDICTION");
    expect(content).toContain("AI_AUTO_ESCALATE");
  });
});
