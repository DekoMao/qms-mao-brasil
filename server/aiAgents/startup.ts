/**
 * AI Agent Startup — Initializes all agents in production mode
 * Called from server/_core/index.ts on server start
 * 
 * Responsibilities:
 * 1. Register all agents in the Orchestrator
 * 2. Subscribe agents to their event types
 * 3. Seed default autonomy configs (level=review)
 * 4. Register cron jobs (SLA check, anomaly scan, daily digest, feedback)
 * 5. Start the cron scheduler
 * 6. Start the job processor
 */
import { orchestrator } from "./orchestrator";
import { registerCronJob } from "./cronScheduler";
import { triageAgent } from "./triageAgent";
import { workflowAgent } from "./workflowAgent";
import { predictAgent } from "./predictAgent";
import { reportAgent } from "./reportAgent";
import { integrationAgent } from "./integrationAgent";
import { healthAgent } from "./healthAgent";
import { feedbackAgent } from "./feedbackAgent";
import { getDb } from "../db";
import { aiAutonomyConfig, aiCronJobs } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import type { AgentEventType } from "./orchestrator";

// =====================================================
// EVENT SUBSCRIPTIONS — Which agents listen to which events
// =====================================================
const EVENT_SUBSCRIPTIONS: Record<string, AgentEventType[]> = {
  triage: [
    "defect.created",
  ],
  workflow: [
    "defect.step_changed",
    "defect.updated",
    "defect.sla_warning",
    "defect.sla_violated",
    "defect.closed",
  ],
  predict: [
    "defect.created",
    "defect.step_changed",
    "supplier.score_changed",
  ],
  report: [
    "report.daily_digest",
    "report.weekly_summary",
  ],
  integration: [
    "integration.erp_sync",
    "integration.webhook_fire",
    "defect.updated",
    "defect.closed",
  ],
  health: [
    "system.health_check",
    "system.metrics_collect",
  ],
  feedback: [
    "feedback.override_recorded",
  ],
};

// =====================================================
// DEFAULT AUTONOMY CONFIGS — Start in "review" mode
// =====================================================
const DEFAULT_CONFIGS = [
  {
    agentName: "triage",
    enabled: true,
    autoThreshold: "0.85",
    reviewThreshold: "0.60",
    maxAutoDecisionsPerHour: 100,
    criticalActions: JSON.stringify(["severity_safety"]),
  },
  {
    agentName: "workflow",
    enabled: true,
    autoThreshold: "0.85",
    reviewThreshold: "0.60",
    maxAutoDecisionsPerHour: 50,
    criticalActions: JSON.stringify(["auto_close", "escalation"]),
  },
  {
    agentName: "predict",
    enabled: true,
    autoThreshold: "0.80",
    reviewThreshold: "0.55",
    maxAutoDecisionsPerHour: 200,
    criticalActions: JSON.stringify([]),
  },
  {
    agentName: "report",
    enabled: true,
    autoThreshold: "0.90",
    reviewThreshold: "0.70",
    maxAutoDecisionsPerHour: 20,
    criticalActions: JSON.stringify([]),
  },
  {
    agentName: "integration",
    enabled: true,
    autoThreshold: "0.90",
    reviewThreshold: "0.70",
    maxAutoDecisionsPerHour: 50,
    criticalActions: JSON.stringify(["erp_write", "erp_delete"]),
  },
  {
    agentName: "health",
    enabled: true,
    autoThreshold: "0.95",
    reviewThreshold: "0.80",
    maxAutoDecisionsPerHour: 200,
    criticalActions: JSON.stringify([]),
  },
  {
    agentName: "feedback",
    enabled: true,
    autoThreshold: "0.85",
    reviewThreshold: "0.60",
    maxAutoDecisionsPerHour: 50,
    criticalActions: JSON.stringify(["threshold_adjustment"]),
  },
];

// =====================================================
// CRON JOB DEFINITIONS
// =====================================================
const CRON_JOBS = [
  {
    name: "sla-check",
    agentName: "workflow",
    cronExpression: "*/15 * * * *", // Every 15 minutes
    jobType: "defect.sla_warning" as AgentEventType,
    payload: { _cronJob: true, action: "sla_check" },
  },
  {
    name: "anomaly-scan",
    agentName: "predict",
    cronExpression: "0 * * * *", // Every hour
    jobType: "defect.created" as AgentEventType,
    payload: { _cronJob: true, action: "anomaly_scan" },
  },
  {
    name: "daily-digest",
    agentName: "report",
    cronExpression: "0 8 * * 1-5", // Weekdays at 8:00 AM
    jobType: "report.daily_digest" as AgentEventType,
    payload: { _cronJob: true, action: "daily_digest" },
  },
  {
    name: "weekly-summary",
    agentName: "report",
    cronExpression: "0 9 * * 1", // Monday at 9:00 AM
    jobType: "report.weekly_summary" as AgentEventType,
    payload: { _cronJob: true, action: "weekly_summary" },
  },
  {
    name: "health-check",
    agentName: "health",
    cronExpression: "*/5 * * * *", // Every 5 minutes
    jobType: "system.health_check" as AgentEventType,
    payload: { _cronJob: true, action: "health_check" },
  },
  {
    name: "metrics-collect",
    agentName: "health",
    cronExpression: "0 * * * *", // Every hour
    jobType: "system.metrics_collect" as AgentEventType,
    payload: { _cronJob: true, action: "metrics_collect" },
  },
  {
    name: "feedback-analysis",
    agentName: "feedback",
    cronExpression: "0 2 * * *", // Daily at 2:00 AM
    jobType: "feedback.override_recorded" as AgentEventType,
    payload: { _cronJob: true, action: "feedback_analysis" },
  },
  {
    name: "erp-sync",
    agentName: "integration",
    cronExpression: "*/30 * * * *", // Every 30 minutes
    jobType: "integration.erp_sync" as AgentEventType,
    payload: { _cronJob: true, action: "erp_sync_inbound" },
  },
];

// =====================================================
// JOB PROCESSOR — Processes queued jobs
// =====================================================
let jobProcessorInterval: ReturnType<typeof setInterval> | null = null;

async function processJobQueue(): Promise<void> {
  const { dequeueJob, completeJob, failJob } = await import("./jobQueue");
  const { AGENT_REGISTRY } = await import("./index");

  try {
    const job = await dequeueJob();
    if (!job) return;

    const agent = AGENT_REGISTRY[job.agentName];
    if (!agent) {
      await failJob(job.id, `Agent "${job.agentName}" not found in registry`);
      return;
    }

    // Check if agent is enabled
    const config = await agent.loadConfig();
    if (!config.enabled) {
      await failJob(job.id, `Agent "${job.agentName}" is disabled`);
      return;
    }

    try {
      const payload = typeof job.payload === "string" ? JSON.parse(job.payload) : (job.payload as Record<string, unknown>);
      const result = await agent.execute(payload);
      await completeJob(job.id, result);
    } catch (execError: any) {
      await failJob(job.id, execError.message || "Execution failed");
    }
  } catch (error) {
    console.error("[JobProcessor] Error processing job:", error);
  }
}

function startJobProcessor(): void {
  if (jobProcessorInterval) return;
  // Process jobs every 5 seconds
  jobProcessorInterval = setInterval(processJobQueue, 5000);
  console.log("[AI Startup] Job processor started (5s interval)");
}

function stopJobProcessor(): void {
  if (jobProcessorInterval) {
    clearInterval(jobProcessorInterval);
    jobProcessorInterval = null;
  }
}

// =====================================================
// SEED AUTONOMY CONFIGS
// =====================================================
async function seedAutonomyConfigs(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  let seeded = 0;
  for (const config of DEFAULT_CONFIGS) {
    try {
      const existing = await db.select().from(aiAutonomyConfig)
        .where(eq(aiAutonomyConfig.agentName, config.agentName))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(aiAutonomyConfig).values(config);
        seeded++;
        console.log(`[AI Startup] Seeded config for "${config.agentName}" (review mode)`);
      }
    } catch (error) {
      console.warn(`[AI Startup] Failed to seed config for "${config.agentName}":`, error);
    }
  }
  return seeded;
}

// =====================================================
// SEED CRON JOBS
// =====================================================
async function seedCronJobs(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  let seeded = 0;
  for (const cron of CRON_JOBS) {
    try {
      const existing = await db.select().from(aiCronJobs)
        .where(eq(aiCronJobs.name, cron.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(aiCronJobs).values({
          name: cron.name,
          agentName: cron.agentName,
          cronExpression: cron.cronExpression,
          jobType: cron.jobType,
          payload: cron.payload,
          enabled: true,
        });
        seeded++;
      }

      // Also register in the in-memory cron scheduler
      await registerCronJob({
        name: cron.name,
        agentName: cron.agentName,
        cronExpression: cron.cronExpression,
        jobType: cron.jobType,
        payload: cron.payload,
      });
    } catch (error) {
      console.warn(`[AI Startup] Failed to seed cron job "${cron.name}":`, error);
    }
  }
  return seeded;
}

// =====================================================
// MAIN STARTUP FUNCTION
// =====================================================
export async function startAIAgents(): Promise<void> {
  console.log("[AI Startup] Initializing AI Agent System...");

  try {
    // 1. Register all agents in the orchestrator
    orchestrator.register(triageAgent);
    orchestrator.register(workflowAgent);
    orchestrator.register(predictAgent);
    orchestrator.register(reportAgent);
    orchestrator.register(integrationAgent);
    orchestrator.register(healthAgent);
    orchestrator.register(feedbackAgent);
    console.log(`[AI Startup] Registered ${orchestrator.listAgents().length} agents`);

    // 2. Subscribe agents to events
    for (const [agentName, events] of Object.entries(EVENT_SUBSCRIPTIONS)) {
      orchestrator.subscribe(agentName, events);
    }
    console.log("[AI Startup] Event subscriptions configured");

    // 3. Initialize all agents (loads configs from DB)
    await orchestrator.initializeAll();
    console.log("[AI Startup] All agents initialized");

    // 4. Seed default autonomy configs (review mode)
    const configsSeeded = await seedAutonomyConfigs();
    if (configsSeeded > 0) {
      console.log(`[AI Startup] Seeded ${configsSeeded} autonomy configs (review mode)`);
    }

    // 5. Seed and register cron jobs
    const cronSeeded = await seedCronJobs();
    if (cronSeeded > 0) {
      console.log(`[AI Startup] Seeded ${cronSeeded} cron jobs`);
    }

    // 6. Start the cron scheduler
    orchestrator.startCronScheduler();

    // 7. Start the job processor
    startJobProcessor();

    console.log("[AI Startup] AI Agent System fully operational (review mode)");
    console.log("[AI Startup] Agents will suggest actions and await human approval for confidence < 0.85");

  } catch (error) {
    console.error("[AI Startup] Failed to initialize AI Agent System:", error);
    console.log("[AI Startup] System will continue in manual mode");
  }
}

// =====================================================
// SHUTDOWN
// =====================================================
export function stopAIAgents(): void {
  orchestrator.stopCronScheduler();
  stopJobProcessor();
  console.log("[AI Startup] AI Agent System stopped");
}
