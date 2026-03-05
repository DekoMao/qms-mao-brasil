/**
 * AI Agents Module — Central export for all agents and infrastructure
 */

// Infrastructure
export { AgentBase } from "./agentBase";
export type { AgentDecision, AgentConfig, AutonomyLevel, AgentHealthStatus } from "./agentBase";
export { enqueueJob, dequeueJob, completeJob, failJob, cancelJob, getQueueStats, cleanupOldJobs } from "./jobQueue";
export { getNextCronRun, cronTick, registerCronJob, listCronJobs, toggleCronJob } from "./cronScheduler";
export { orchestrator, fireAgentEvent } from "./orchestrator";
export type { AgentEventType, AgentEvent } from "./orchestrator";
export { checkGuardrails, approveDecision, rejectDecision, overrideDecision } from "./guardrails";

// Agents
export { triageAgent, TriageAgent } from "./triageAgent";
export { workflowAgent, WorkflowAgent } from "./workflowAgent";
export { predictAgent, PredictAgent } from "./predictAgent";
export { reportAgent, ReportAgent } from "./reportAgent";
export { integrationAgent, IntegrationAgent } from "./integrationAgent";
export { healthAgent, HealthAgent } from "./healthAgent";
export { feedbackAgent, FeedbackAgent } from "./feedbackAgent";

// =====================================================
// AGENT REGISTRY
// =====================================================
import { triageAgent } from "./triageAgent";
import { workflowAgent } from "./workflowAgent";
import { predictAgent } from "./predictAgent";
import { reportAgent } from "./reportAgent";
import { integrationAgent } from "./integrationAgent";
import { healthAgent } from "./healthAgent";
import { feedbackAgent } from "./feedbackAgent";
import type { AgentBase } from "./agentBase";

export const AGENT_REGISTRY: Record<string, AgentBase> = {
  triage: triageAgent,
  workflow: workflowAgent,
  predict: predictAgent,
  report: reportAgent,
  integration: integrationAgent,
  health: healthAgent,
  feedback: feedbackAgent,
};

export const ALL_AGENT_NAMES = Object.keys(AGENT_REGISTRY);

/**
 * Initialize all agents
 */
export async function initializeAllAgents(): Promise<void> {
  for (const [name, agent] of Object.entries(AGENT_REGISTRY)) {
    try {
      await agent.initialize();
      console.log(`[AI] Agent "${name}" initialized`);
    } catch (error) {
      console.error(`[AI] Failed to initialize agent "${name}":`, error);
    }
  }
}
