/**
 * Tests for AI Agent Infrastructure (Phase 1)
 * Covers: Schema, Job Queue, Cron Scheduler, Agent Base, Guardrails, Orchestrator
 */
import { describe, it, expect, vi } from "vitest";
import { getNextCronRun } from "./aiAgents/cronScheduler";
import fs from "fs";
import path from "path";

// =====================================================
// 1. SCHEMA TESTS
// =====================================================
describe("AI Agent Schema", () => {
  const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  it("should define ai_agent_decisions table", () => {
    expect(schemaContent).toContain('mysqlTable("ai_agent_decisions"');
    expect(schemaContent).toContain("agentName");
    expect(schemaContent).toContain("confidence");
    expect(schemaContent).toContain("autonomyLevel");
    expect(schemaContent).toContain('"auto", "review", "hitl", "blocked"');
    expect(schemaContent).toContain('"PENDING", "EXECUTED", "APPROVED", "REJECTED", "OVERRIDDEN"');
  });

  it("should define ai_agent_metrics table", () => {
    expect(schemaContent).toContain('mysqlTable("ai_agent_metrics"');
    expect(schemaContent).toContain("totalDecisions");
    expect(schemaContent).toContain("autoExecuted");
    expect(schemaContent).toContain("humanApproved");
    expect(schemaContent).toContain("humanRejected");
    expect(schemaContent).toContain("humanOverridden");
    expect(schemaContent).toContain("accuracyRate");
  });

  it("should define ai_autonomy_config table", () => {
    expect(schemaContent).toContain('mysqlTable("ai_autonomy_config"');
    expect(schemaContent).toContain("autoThreshold");
    expect(schemaContent).toContain("reviewThreshold");
    expect(schemaContent).toContain("maxAutoDecisionsPerHour");
    expect(schemaContent).toContain("criticalActions");
  });

  it("should define ai_agent_jobs table (job queue)", () => {
    expect(schemaContent).toContain('mysqlTable("ai_agent_jobs"');
    expect(schemaContent).toContain("jobType");
    expect(schemaContent).toContain("priority");
    expect(schemaContent).toContain('"QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"');
    expect(schemaContent).toContain("maxAttempts");
    expect(schemaContent).toContain("scheduledAt");
  });

  it("should define ai_models table", () => {
    expect(schemaContent).toContain('mysqlTable("ai_models"');
    expect(schemaContent).toContain("modelVersion");
    expect(schemaContent).toContain("weights");
    expect(schemaContent).toContain("accuracyScore");
    expect(schemaContent).toContain("isActive");
  });

  it("should define ai_cron_jobs table", () => {
    expect(schemaContent).toContain('mysqlTable("ai_cron_jobs"');
    expect(schemaContent).toContain("cronExpression");
    expect(schemaContent).toContain("lastRunAt");
    expect(schemaContent).toContain("nextRunAt");
    expect(schemaContent).toContain('"SUCCESS", "FAILED", "SKIPPED"');
  });

  it("should have AI audit log actions", () => {
    expect(schemaContent).toContain("AI_AUTO_CLASSIFY");
    expect(schemaContent).toContain("AI_AUTO_SEVERITY");
    expect(schemaContent).toContain("AI_AUTO_ASSIGN");
    expect(schemaContent).toContain("AI_AUTO_ADVANCE");
    expect(schemaContent).toContain("AI_AUTO_ESCALATE");
    expect(schemaContent).toContain("AI_AUTO_CLOSE");
    expect(schemaContent).toContain("AI_ANOMALY_DETECTED");
    expect(schemaContent).toContain("AI_PREDICTION");
    expect(schemaContent).toContain("AI_REPORT_GENERATED");
    expect(schemaContent).toContain("AI_AGENT_RESTART");
    expect(schemaContent).toContain("AI_AGENT_FALLBACK");
    expect(schemaContent).toContain("AI_FEEDBACK_OVERRIDE");
    expect(schemaContent).toContain("AI_CONFIG_CHANGE");
  });

  it("should have proper indexes on AI tables", () => {
    expect(schemaContent).toContain("idx_ai_decisions_agent");
    expect(schemaContent).toContain("idx_ai_decisions_defect");
    expect(schemaContent).toContain("idx_ai_decisions_status");
    expect(schemaContent).toContain("idx_ai_jobs_agent");
    expect(schemaContent).toContain("idx_ai_jobs_status");
    expect(schemaContent).toContain("idx_ai_jobs_priority");
    expect(schemaContent).toContain("idx_ai_cron_name");
    expect(schemaContent).toContain("idx_ai_models_agent_version");
  });

  it("should export types for all AI tables", () => {
    expect(schemaContent).toContain("export type AiAgentDecision");
    expect(schemaContent).toContain("export type AiAgentMetric");
    expect(schemaContent).toContain("export type AiAutonomyConfig");
    expect(schemaContent).toContain("export type AiAgentJob");
    expect(schemaContent).toContain("export type AiModel");
    expect(schemaContent).toContain("export type AiCronJob");
  });
});

// =====================================================
// 2. CRON PARSER TESTS
// =====================================================
describe("Cron Scheduler - Parser", () => {
  it("should parse every minute cron", () => {
    const now = new Date("2026-03-04T10:30:00Z");
    const next = getNextCronRun("* * * * *", now);
    expect(next.getTime()).toBeGreaterThan(now.getTime());
    expect(next.getMinutes()).toBe(31);
  });

  it("should parse specific minute cron", () => {
    const now = new Date("2026-03-04T10:30:00Z");
    const next = getNextCronRun("0 * * * *", now);
    expect(next.getMinutes()).toBe(0);
    // Next run should be after 'now' with minute=0
    expect(next.getTime()).toBeGreaterThan(now.getTime());
  });

  it("should parse hourly cron", () => {
    const now = new Date("2026-03-04T10:30:00Z");
    const next = getNextCronRun("30 * * * *", now);
    expect(next.getMinutes()).toBe(30);
    // Next run should be after 'now'
    expect(next.getTime()).toBeGreaterThan(now.getTime());
  });

  it("should parse daily cron at 9:00", () => {
    const now = new Date("2026-03-04T10:30:00Z");
    const next = getNextCronRun("0 9 * * *", now);
    expect(next.getMinutes()).toBe(0);
    expect(next.getHours()).toBe(9);
    // Next run should be after 'now'
    expect(next.getTime()).toBeGreaterThan(now.getTime());
  });

  it("should parse step values (*/15)", () => {
    const now = new Date("2026-03-04T10:02:00Z");
    const next = getNextCronRun("*/15 * * * *", now);
    expect(next.getMinutes()).toBe(15);
  });

  it("should parse range values (9-17)", () => {
    const now = new Date("2026-03-04T18:30:00Z");
    const next = getNextCronRun("0 9-17 * * *", now);
    expect(next.getHours()).toBeGreaterThanOrEqual(9);
    expect(next.getHours()).toBeLessThanOrEqual(17);
  });

  it("should parse weekday filter (1-5 = Mon-Fri)", () => {
    // March 4, 2026 is a Wednesday
    const now = new Date("2026-03-04T10:30:00Z");
    const next = getNextCronRun("0 9 * * 1-5", now);
    const dayOfWeek = next.getDay();
    expect(dayOfWeek).toBeGreaterThanOrEqual(1);
    expect(dayOfWeek).toBeLessThanOrEqual(5);
  });

  it("should reject invalid cron expression", () => {
    expect(() => getNextCronRun("invalid")).toThrow("Invalid cron");
    expect(() => getNextCronRun("* * *")).toThrow("Invalid cron");
  });
});

// =====================================================
// 3. AGENT BASE CLASS TESTS
// =====================================================
describe("Agent Base Class", () => {
  it("should export AgentBase class", async () => {
    const { AgentBase } = await import("./aiAgents/agentBase");
    expect(AgentBase).toBeDefined();
    expect(typeof AgentBase).toBe("function");
  });

  it("should be a class that can be extended", async () => {
    const { AgentBase } = await import("./aiAgents/agentBase");
    // AgentBase is a class with execute as abstract method
    expect(typeof AgentBase).toBe("function");
    expect(AgentBase.prototype.initialize).toBeDefined();
  });

  it("should have lifecycle methods", async () => {
    const { AgentBase } = await import("./aiAgents/agentBase");
    expect(AgentBase.prototype.initialize).toBeDefined();
    expect(AgentBase.prototype.loadConfig).toBeDefined();
    expect(AgentBase.prototype.determineAutonomyLevel).toBeDefined();
    expect(AgentBase.prototype.recordDecision).toBeDefined();
    expect(AgentBase.prototype.recordMetrics).toBeDefined();
    expect(AgentBase.prototype.getHealthStatus).toBeDefined();
  });
});

// =====================================================
// 4. JOB QUEUE TESTS
// =====================================================
describe("Job Queue Engine", () => {
  it("should export all job queue functions", async () => {
    const jq = await import("./aiAgents/jobQueue");
    expect(jq.enqueueJob).toBeDefined();
    expect(jq.dequeueJob).toBeDefined();
    expect(jq.completeJob).toBeDefined();
    expect(jq.failJob).toBeDefined();
    expect(jq.cancelJob).toBeDefined();
    expect(jq.getQueueStats).toBeDefined();
    expect(jq.cleanupOldJobs).toBeDefined();
  });

  it("should have correct function signatures", async () => {
    const jq = await import("./aiAgents/jobQueue");
    expect(typeof jq.enqueueJob).toBe("function");
    expect(typeof jq.dequeueJob).toBe("function");
    expect(typeof jq.completeJob).toBe("function");
    expect(typeof jq.failJob).toBe("function");
  });
});

// =====================================================
// 5. GUARDRAILS TESTS
// =====================================================
describe("Guardrails Engine", () => {
  it("should export guardrail functions", async () => {
    const gr = await import("./aiAgents/guardrails");
    expect(gr.checkGuardrails).toBeDefined();
    expect(gr.approveDecision).toBeDefined();
    expect(gr.rejectDecision).toBeDefined();
    expect(gr.overrideDecision).toBeDefined();
  });

  it("should block when agent is disabled", async () => {
    const { checkGuardrails } = await import("./aiAgents/guardrails");
    const result = await checkGuardrails("test-agent", {
      decisionType: "test",
      input: {},
      output: {},
      confidence: 0.95,
    }, {
      enabled: false,
      autoThreshold: 0.85,
      reviewThreshold: 0.60,
      maxAutoDecisionsPerHour: 100,
      criticalActions: [],
    });
    expect(result.autonomyLevel).toBe("blocked");
    expect(result.allowed).toBe(false);
  });

  it("should require HITL for safety severity", async () => {
    const { checkGuardrails } = await import("./aiAgents/guardrails");
    const result = await checkGuardrails("test-agent", {
      decisionType: "auto_classify",
      input: { severity: "S" },
      output: {},
      confidence: 0.99,
    }, {
      enabled: true,
      autoThreshold: 0.85,
      reviewThreshold: 0.60,
      maxAutoDecisionsPerHour: 100,
      criticalActions: [],
    });
    expect(result.autonomyLevel).toBe("hitl");
    expect(result.requiresApproval).toBe(true);
  });

  it("should auto-execute high confidence decisions", async () => {
    const { checkGuardrails } = await import("./aiAgents/guardrails");
    const result = await checkGuardrails("test-agent", {
      decisionType: "auto_classify",
      input: {},
      output: {},
      confidence: 0.92,
    }, {
      enabled: true,
      autoThreshold: 0.85,
      reviewThreshold: 0.60,
      maxAutoDecisionsPerHour: 100,
      criticalActions: [],
    });
    expect(result.autonomyLevel).toBe("auto");
    expect(result.requiresApproval).toBe(false);
  });

  it("should review medium confidence decisions", async () => {
    const { checkGuardrails } = await import("./aiAgents/guardrails");
    const result = await checkGuardrails("test-agent", {
      decisionType: "auto_classify",
      input: {},
      output: {},
      confidence: 0.72,
    }, {
      enabled: true,
      autoThreshold: 0.85,
      reviewThreshold: 0.60,
      maxAutoDecisionsPerHour: 100,
      criticalActions: [],
    });
    expect(result.autonomyLevel).toBe("review");
    expect(result.requiresApproval).toBe(true);
  });

  it("should require HITL for low confidence decisions", async () => {
    const { checkGuardrails } = await import("./aiAgents/guardrails");
    const result = await checkGuardrails("test-agent", {
      decisionType: "auto_classify",
      input: {},
      output: {},
      confidence: 0.45,
    }, {
      enabled: true,
      autoThreshold: 0.85,
      reviewThreshold: 0.60,
      maxAutoDecisionsPerHour: 100,
      criticalActions: [],
    });
    expect(result.autonomyLevel).toBe("hitl");
    expect(result.requiresApproval).toBe(true);
  });

  it("should require HITL for configured critical actions", async () => {
    const { checkGuardrails } = await import("./aiAgents/guardrails");
    const result = await checkGuardrails("test-agent", {
      decisionType: "auto_close",
      input: {},
      output: {},
      confidence: 0.99,
    }, {
      enabled: true,
      autoThreshold: 0.85,
      reviewThreshold: 0.60,
      maxAutoDecisionsPerHour: 100,
      criticalActions: ["auto_close"],
    });
    expect(result.autonomyLevel).toBe("hitl");
    expect(result.requiresApproval).toBe(true);
  });

  it("should always HITL for always-critical actions", async () => {
    const { checkGuardrails } = await import("./aiAgents/guardrails");
    const result = await checkGuardrails("test-agent", {
      decisionType: "auto_close_safety_defect",
      input: {},
      output: {},
      confidence: 0.99,
    }, {
      enabled: true,
      autoThreshold: 0.85,
      reviewThreshold: 0.60,
      maxAutoDecisionsPerHour: 100,
      criticalActions: [],
    });
    expect(result.autonomyLevel).toBe("hitl");
  });
});

// =====================================================
// 6. ORCHESTRATOR TESTS
// =====================================================
describe("Orchestrator Event Dispatcher", () => {
  it("should export orchestrator singleton", async () => {
    const { orchestrator } = await import("./aiAgents/orchestrator");
    expect(orchestrator).toBeDefined();
    expect(orchestrator.listAgents).toBeDefined();
    expect(orchestrator.getHealthStatuses).toBeDefined();
  });

  it("should export fireAgentEvent helper", async () => {
    const { fireAgentEvent } = await import("./aiAgents/orchestrator");
    expect(typeof fireAgentEvent).toBe("function");
  });

  it("should list registered agents", async () => {
    const { orchestrator } = await import("./aiAgents/orchestrator");
    const agents = orchestrator.listAgents();
    expect(Array.isArray(agents)).toBe(true);
  });

  it("should return health statuses", async () => {
    const { orchestrator } = await import("./aiAgents/orchestrator");
    const statuses = orchestrator.getHealthStatuses();
    expect(Array.isArray(statuses)).toBe(true);
  });
});

// =====================================================
// 7. ROUTER TESTS
// =====================================================
describe("AI Control Router", () => {
  const routersPath = path.join(__dirname, "routers.ts");
  const routersContent = fs.readFileSync(routersPath, "utf-8");

  it("should define aiControlRouter", () => {
    expect(routersContent).toContain("aiControlRouter");
    expect(routersContent).toContain("aiControl: aiControlRouter");
  });

  it("should have health endpoint", () => {
    expect(routersContent).toContain("health: protectedProcedure.query");
    expect(routersContent).toContain("orchestrator.getHealthStatuses()");
  });

  it("should have config management endpoints", () => {
    expect(routersContent).toContain("getConfig: protectedProcedure");
    expect(routersContent).toContain("updateConfig: protectedProcedure");
  });

  it("should have decision management endpoints", () => {
    expect(routersContent).toContain("decisions: protectedProcedure");
    expect(routersContent).toContain("approveDecision: protectedProcedure");
    expect(routersContent).toContain("rejectDecision: protectedProcedure");
    expect(routersContent).toContain("overrideDecision: protectedProcedure");
  });

  it("should have metrics and queue endpoints", () => {
    expect(routersContent).toContain("metrics: protectedProcedure");
    expect(routersContent).toContain("queueStats: protectedProcedure");
    expect(routersContent).toContain("cronJobs: protectedProcedure");
    expect(routersContent).toContain("toggleCronJob: protectedProcedure");
  });
});

// =====================================================
// 8. INDEX EXPORTS TEST
// =====================================================
describe("AI Agents Module Exports", () => {
  it("should export all infrastructure from index", async () => {
    const mod = await import("./aiAgents/index");
    expect(mod.AgentBase).toBeDefined();
    expect(mod.enqueueJob).toBeDefined();
    expect(mod.dequeueJob).toBeDefined();
    expect(mod.completeJob).toBeDefined();
    expect(mod.failJob).toBeDefined();
    expect(mod.getNextCronRun).toBeDefined();
    expect(mod.cronTick).toBeDefined();
    expect(mod.registerCronJob).toBeDefined();
    expect(mod.orchestrator).toBeDefined();
    expect(mod.fireAgentEvent).toBeDefined();
    expect(mod.checkGuardrails).toBeDefined();
    expect(mod.approveDecision).toBeDefined();
    expect(mod.rejectDecision).toBeDefined();
    expect(mod.overrideDecision).toBeDefined();
  });
});
