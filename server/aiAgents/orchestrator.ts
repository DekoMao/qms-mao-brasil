/**
 * Orchestrator Event Dispatcher — Central hub for AI agent coordination
 * Routes events to appropriate agents, manages agent lifecycle, provides health monitoring
 */
import { AgentBase, AgentHealthStatus } from "./agentBase";
import { enqueueJob } from "./jobQueue";
import { cronTick } from "./cronScheduler";

// =====================================================
// EVENT TYPES
// =====================================================
export type AgentEventType =
  | "defect.created"
  | "defect.updated"
  | "defect.step_changed"
  | "defect.sla_warning"
  | "defect.sla_violated"
  | "defect.closed"
  | "supplier.score_changed"
  | "report.daily_digest"
  | "report.weekly_summary"
  | "system.health_check"
  | "system.metrics_collect"
  | "integration.erp_sync"
  | "integration.webhook_fire"
  | "feedback.override_recorded";

export interface AgentEvent {
  type: AgentEventType;
  payload: Record<string, unknown>;
  tenantId?: number;
  timestamp: Date;
}

// =====================================================
// AGENT REGISTRY
// =====================================================
class AgentRegistry {
  private agents: Map<string, AgentBase> = new Map();
  private eventHandlers: Map<AgentEventType, string[]> = new Map();
  private cronInterval: ReturnType<typeof setInterval> | null = null;

  // Register an agent
  register(agent: AgentBase): void {
    this.agents.set(agent.agentName, agent);
    console.log(`[Orchestrator] Registered agent: ${agent.agentName}`);
  }

  // Subscribe an agent to event types
  subscribe(agentName: string, eventTypes: AgentEventType[]): void {
    for (const eventType of eventTypes) {
      const handlers = this.eventHandlers.get(eventType) || [];
      if (!handlers.includes(agentName)) {
        handlers.push(agentName);
      }
      this.eventHandlers.set(eventType, handlers);
    }
  }

  // Dispatch event to subscribed agents
  async dispatch(event: AgentEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.type) || [];

    for (const agentName of handlers) {
      const agent = this.agents.get(agentName);
      if (!agent) continue;

      try {
        // Enqueue as a job for async processing
        await enqueueJob({
          agentName,
          jobType: event.type,
          payload: {
            ...event.payload,
            _eventType: event.type,
            _eventTimestamp: event.timestamp.toISOString(),
          },
          priority: getEventPriority(event.type),
          tenantId: event.tenantId,
        });
      } catch (error) {
        console.error(`[Orchestrator] Failed to dispatch ${event.type} to ${agentName}:`, error);
      }
    }
  }

  // Get all agent health statuses
  getHealthStatuses(): AgentHealthStatus[] {
    const statuses: AgentHealthStatus[] = [];
    this.agents.forEach((agent) => {
      statuses.push(agent.getHealthStatus());
    });
    return statuses;
  }

  // Get specific agent
  getAgent(name: string): AgentBase | undefined {
    return this.agents.get(name);
  }

  // List all registered agents
  listAgents(): string[] {
    const keys: string[] = [];
    this.agents.forEach((_, k) => keys.push(k));
    return keys;
  }

  // Start cron scheduler (runs every 60 seconds)
  startCronScheduler(): void {
    if (this.cronInterval) return;
    this.cronInterval = setInterval(async () => {
      try {
        const executed = await cronTick();
        if (executed > 0) {
          console.log(`[CronScheduler] Executed ${executed} cron jobs`);
        }
      } catch (error) {
        console.error("[CronScheduler] Tick error:", error);
      }
    }, 60000);
    console.log("[Orchestrator] Cron scheduler started (60s interval)");
  }

  // Stop cron scheduler
  stopCronScheduler(): void {
    if (this.cronInterval) {
      clearInterval(this.cronInterval);
      this.cronInterval = null;
      console.log("[Orchestrator] Cron scheduler stopped");
    }
  }

  // Initialize all agents
  async initializeAll(): Promise<void> {
    const entries = Array.from(this.agents.entries());
    for (const [name, agent] of entries) {
      try {
        await agent.initialize();
      } catch (error) {
        console.error(`[Orchestrator] Failed to initialize agent ${name}:`, error);
      }
    }
  }
}

// =====================================================
// EVENT PRIORITY MAPPING
// =====================================================
function getEventPriority(eventType: AgentEventType): number {
  const priorities: Record<string, number> = {
    "defect.sla_violated": 1,
    "defect.sla_warning": 2,
    "defect.created": 3,
    "defect.step_changed": 3,
    "defect.updated": 4,
    "defect.closed": 4,
    "supplier.score_changed": 5,
    "system.health_check": 5,
    "report.daily_digest": 6,
    "report.weekly_summary": 7,
    "integration.erp_sync": 5,
    "integration.webhook_fire": 4,
    "feedback.override_recorded": 5,
    "system.metrics_collect": 8,
  };
  return priorities[eventType] ?? 5;
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================
export const orchestrator = new AgentRegistry();

// =====================================================
// HELPER — Fire event from anywhere in the codebase
// =====================================================
export async function fireAgentEvent(
  type: AgentEventType,
  payload: Record<string, unknown>,
  tenantId?: number
): Promise<void> {
  await orchestrator.dispatch({
    type,
    payload,
    tenantId,
    timestamp: new Date(),
  });
}
