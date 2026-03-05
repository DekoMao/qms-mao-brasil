/**
 * Cron Scheduler — Periodic task execution for AI agents
 * Parses cron expressions, tracks last/next run, and enqueues jobs
 */
import { getDb } from "../db";
import { aiCronJobs } from "../../drizzle/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { enqueueJob } from "./jobQueue";

// =====================================================
// CRON EXPRESSION PARSER (minute hour day month weekday)
// =====================================================
function parseCronField(field: string, min: number, max: number): number[] {
  const values: number[] = [];

  for (const part of field.split(",")) {
    if (part === "*") {
      for (let i = min; i <= max; i++) values.push(i);
    } else if (part.includes("/")) {
      const [range, stepStr] = part.split("/");
      const step = parseInt(stepStr, 10);
      const start = range === "*" ? min : parseInt(range, 10);
      for (let i = start; i <= max; i += step) values.push(i);
    } else if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      for (let i = start; i <= end; i++) values.push(i);
    } else {
      values.push(parseInt(part, 10));
    }
  }

  return Array.from(new Set(values)).sort((a, b) => a - b);
}

export function getNextCronRun(cronExpression: string, after: Date = new Date()): Date {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`Invalid cron: ${cronExpression} (need 5 fields)`);

  const minutes = parseCronField(parts[0], 0, 59);
  const hours = parseCronField(parts[1], 0, 23);
  const days = parseCronField(parts[2], 1, 31);
  const months = parseCronField(parts[3], 1, 12);
  const weekdays = parseCronField(parts[4], 0, 6);

  const next = new Date(after);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  // Search up to 366 days ahead
  for (let i = 0; i < 527040; i++) {
    const m = next.getMonth() + 1;
    const d = next.getDate();
    const wd = next.getDay();
    const h = next.getHours();
    const min = next.getMinutes();

    if (months.includes(m) && days.includes(d) && weekdays.includes(wd) &&
        hours.includes(h) && minutes.includes(min)) {
      return next;
    }

    next.setMinutes(next.getMinutes() + 1);
  }

  throw new Error(`No next run found for cron: ${cronExpression}`);
}

// =====================================================
// TICK — Check and execute due cron jobs
// =====================================================
export async function cronTick(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();
  const dueJobs = await db.select().from(aiCronJobs)
    .where(and(
      eq(aiCronJobs.enabled, true),
      lte(aiCronJobs.nextRunAt, now)
    ));

  let executed = 0;

  for (const cronJob of dueJobs) {
    try {
      // Enqueue the job
      await enqueueJob({
        agentName: cronJob.agentName,
        jobType: cronJob.jobType,
        payload: (cronJob.payload as Record<string, unknown>) ?? {},
        priority: 3,
        tenantId: cronJob.tenantId ?? undefined,
      });

      // Calculate next run
      const nextRun = getNextCronRun(cronJob.cronExpression, now);

      await db.update(aiCronJobs)
        .set({
          lastRunAt: now,
          nextRunAt: nextRun,
          lastStatus: "SUCCESS",
        })
        .where(eq(aiCronJobs.id, cronJob.id));

      executed++;
    } catch (error) {
      console.error(`[CronScheduler] Failed to execute cron job ${cronJob.name}:`, error);
      await db.update(aiCronJobs)
        .set({
          lastRunAt: now,
          lastStatus: "FAILED",
        })
        .where(eq(aiCronJobs.id, cronJob.id));
    }
  }

  return executed;
}

// =====================================================
// REGISTER — Create or update a cron job
// =====================================================
export async function registerCronJob(params: {
  name: string;
  cronExpression: string;
  agentName: string;
  jobType: string;
  payload?: Record<string, unknown>;
  tenantId?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const nextRun = getNextCronRun(params.cronExpression);

  // Check if exists
  const existing = await db.select().from(aiCronJobs)
    .where(eq(aiCronJobs.name, params.name)).limit(1);

  if (existing.length > 0) {
    await db.update(aiCronJobs)
      .set({
        cronExpression: params.cronExpression,
        agentName: params.agentName,
        jobType: params.jobType,
        payload: params.payload ?? null,
        nextRunAt: nextRun,
        enabled: true,
      })
      .where(eq(aiCronJobs.id, existing[0].id));
    return existing[0].id;
  }

  const result = await db.insert(aiCronJobs).values({
    name: params.name,
    cronExpression: params.cronExpression,
    agentName: params.agentName,
    jobType: params.jobType,
    payload: params.payload ?? null,
    enabled: true,
    nextRunAt: nextRun,
    tenantId: params.tenantId ?? null,
  });

  return Number(result[0].insertId);
}

// =====================================================
// LIST — Get all cron jobs
// =====================================================
export async function listCronJobs(agentName?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = agentName ? [eq(aiCronJobs.agentName, agentName)] : [];

  return db.select().from(aiCronJobs)
    .where(conditions.length > 0 ? and(...conditions) : sql`1=1`);
}

// =====================================================
// TOGGLE — Enable/disable a cron job
// =====================================================
export async function toggleCronJob(id: number, enabled: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const updates: Record<string, unknown> = { enabled };
  if (enabled) {
    const job = await db.select().from(aiCronJobs).where(eq(aiCronJobs.id, id)).limit(1);
    if (job.length > 0) {
      updates.nextRunAt = getNextCronRun(job[0].cronExpression);
    }
  }

  await db.update(aiCronJobs).set(updates).where(eq(aiCronJobs.id, id));
}
