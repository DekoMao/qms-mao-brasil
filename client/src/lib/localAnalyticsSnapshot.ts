import type { AccuracyPoint, DashboardStats, LocalAnalyticsSnapshot, RootCausePoint } from "./localQualityAnalytics";

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function createLocalAnalyticsSnapshot(input: {
  tenantId?: number | null;
  dateFrom?: string;
  dateTo?: string;
  stats?: DashboardStats | null;
  accuracyTrend?: AccuracyPoint[] | null;
  topCauses?: RootCausePoint[] | null;
  capturedAt?: string;
}): LocalAnalyticsSnapshot {
  const filters = { dateFrom: input.dateFrom || undefined, dateTo: input.dateTo || undefined };
  const payload = {
    tenantId: input.tenantId ?? null,
    filters,
    stats: input.stats ?? null,
    accuracyTrend: input.accuracyTrend ?? null,
    topCauses: input.topCauses ?? null,
  };
  return {
    ...payload,
    id: `snap-${hashText(JSON.stringify(payload))}`,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
  };
}
