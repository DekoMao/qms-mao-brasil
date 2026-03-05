/**
 * Job Queue Engine — Database-backed async job processing for AI agents
 * Supports enqueue, dequeue, retry, dead letter, and priority scheduling
 */
import { getDb } from "../db";
import { aiAgentJobs } from "../../drizzle/schema";
import { eq, and, sql, lte, isNull, or, asc } from "drizzle-orm";

export interface JobPayload {
  agentName: string;
  jobType: string;
  payload: Record<string, unknown>;
  priority?: number;
  maxAttempts?: number;
  scheduledAt?: Date;
  tenantId?: number;
}

export interface JobResult {
  jobId: number;
  status: "COMPLETED" | "FAILED";
  result?: Record<string, unknown>;
  error?: string;
}

// =====================================================
// ENQUEUE
// =====================================================
export async function enqueueJob(job: JobPayload): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(aiAgentJobs).values({
    agentName: job.agentName,
    jobType: job.jobType,
    priority: job.priority ?? 5,
    payload: job.payload,
    status: "QUEUED",
    attempts: 0,
    maxAttempts: job.maxAttempts ?? 3,
    scheduledAt: job.scheduledAt ?? null,
    tenantId: job.tenantId ?? null,
  });

  return Number(result[0].insertId);
}

// =====================================================
// DEQUEUE — Fetch next job for processing (FIFO with priority)
// =====================================================
export async function dequeueJob(agentName?: string): Promise<typeof aiAgentJobs.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const conditions = [
    eq(aiAgentJobs.status, "QUEUED"),
    or(
      isNull(aiAgentJobs.scheduledAt),
      lte(aiAgentJobs.scheduledAt, now)
    ),
  ];

  if (agentName) {
    conditions.push(eq(aiAgentJobs.agentName, agentName));
  }

  // Get highest priority job (lowest number = highest priority)
  const jobs = await db.select().from(aiAgentJobs)
    .where(and(...conditions))
    .orderBy(asc(aiAgentJobs.priority), asc(aiAgentJobs.createdAt))
    .limit(1);

  if (jobs.length === 0) return null;

  const job = jobs[0];

  // Mark as processing
  await db.update(aiAgentJobs)
    .set({
      status: "PROCESSING",
      startedAt: now,
      attempts: (job.attempts ?? 0) + 1,
    })
    .where(eq(aiAgentJobs.id, job.id));

  return { ...job, status: "PROCESSING", startedAt: now, attempts: (job.attempts ?? 0) + 1 };
}

// =====================================================
// COMPLETE — Mark job as completed
// =====================================================
export async function completeJob(jobId: number, result?: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(aiAgentJobs)
    .set({
      status: "COMPLETED",
      result: result ?? null,
      completedAt: new Date(),
    })
    .where(eq(aiAgentJobs.id, jobId));
}

// =====================================================
// FAIL — Mark job as failed, retry if attempts < maxAttempts
// =====================================================
export async function failJob(jobId: number, error: string): Promise<"REQUEUED" | "DEAD_LETTER"> {
  const db = await getDb();
  if (!db) return "DEAD_LETTER";

  const jobs = await db.select().from(aiAgentJobs)
    .where(eq(aiAgentJobs.id, jobId)).limit(1);

  if (jobs.length === 0) return "DEAD_LETTER";

  const job = jobs[0];
  const attempts = job.attempts ?? 0;
  const maxAttempts = job.maxAttempts ?? 3;

  if (attempts < maxAttempts) {
    // Exponential backoff: 30s, 120s, 480s
    const backoffMs = Math.pow(4, attempts) * 30000;
    const nextRun = new Date(Date.now() + backoffMs);

    await db.update(aiAgentJobs)
      .set({
        status: "QUEUED",
        error,
        scheduledAt: nextRun,
      })
      .where(eq(aiAgentJobs.id, jobId));

    return "REQUEUED";
  }

  // Dead letter — exceeded max attempts
  await db.update(aiAgentJobs)
    .set({
      status: "FAILED",
      error,
      completedAt: new Date(),
    })
    .where(eq(aiAgentJobs.id, jobId));

  return "DEAD_LETTER";
}

// =====================================================
// CANCEL — Cancel a queued job
// =====================================================
export async function cancelJob(jobId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.update(aiAgentJobs)
    .set({ status: "CANCELLED", completedAt: new Date() })
    .where(and(
      eq(aiAgentJobs.id, jobId),
      eq(aiAgentJobs.status, "QUEUED")
    ));

  return (result[0].affectedRows ?? 0) > 0;
}

// =====================================================
// STATS — Get queue statistics
// =====================================================
export async function getQueueStats(agentName?: string) {
  const db = await getDb();
  if (!db) return { queued: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 };

  const conditions = agentName ? [eq(aiAgentJobs.agentName, agentName)] : [];

  const stats = await db.select({
    status: aiAgentJobs.status,
    count: sql<number>`count(*)`,
  }).from(aiAgentJobs)
    .where(conditions.length > 0 ? and(...conditions) : sql`1=1`)
    .groupBy(aiAgentJobs.status);

  const result: Record<string, number> = { queued: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 };
  for (const row of stats) {
    if (row.status) result[row.status.toLowerCase()] = row.count;
  }
  return result;
}

// =====================================================
// CLEANUP — Remove old completed/failed jobs
// =====================================================
export async function cleanupOldJobs(daysOld: number = 30): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const cutoff = new Date(Date.now() - daysOld * 86400000);
  const result = await db.delete(aiAgentJobs)
    .where(and(
      or(eq(aiAgentJobs.status, "COMPLETED"), eq(aiAgentJobs.status, "FAILED"), eq(aiAgentJobs.status, "CANCELLED")),
      lte(aiAgentJobs.createdAt, cutoff)
    ));

  return result[0].affectedRows ?? 0;
}
