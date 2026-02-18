/**
 * P4 — BI Widget Data Resolver
 * Resolves widget data based on dataSource type and optional filters.
 */
import { getDb } from "./db";
import { defects, defectCosts, suppliers } from "../drizzle/schema";
import { eq, and, sql, count, isNull, gte, lte, desc, asc } from "drizzle-orm";
import { biDashboards, biWidgets } from "../drizzle/schema";

// ─── Dashboard CRUD ────────────────────────────────────────────
export async function getBiDashboards(userId: number, tenantId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [isNull(biDashboards.deletedAt)];
  conditions.push(
    sql`(${biDashboards.userId} = ${userId} OR ${biDashboards.isShared} = true)`
  );
  if (tenantId) {
    conditions.push(
      sql`(${biDashboards.tenantId} = ${tenantId} OR ${biDashboards.tenantId} IS NULL)`
    );
  }

  return db
    .select()
    .from(biDashboards)
    .where(and(...conditions))
    .orderBy(desc(biDashboards.updatedAt));
}

export async function createBiDashboard(params: {
  userId: number;
  tenantId?: number;
  name: string;
  description?: string;
  isShared?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not initialized");

  const [result] = await db.insert(biDashboards).values({
    userId: params.userId,
    tenantId: params.tenantId || null,
    name: params.name,
    description: params.description || null,
    isShared: params.isShared || false,
  });

  return { id: result.insertId };
}

export async function updateBiDashboard(id: number, userId: number, params: {
  name?: string;
  description?: string;
  layout?: any;
  isShared?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not initialized");

  await db
    .update(biDashboards)
    .set(params)
    .where(and(eq(biDashboards.id, id), eq(biDashboards.userId, userId)));

  return { success: true };
}

export async function deleteBiDashboard(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not initialized");

  await db
    .update(biDashboards)
    .set({ deletedAt: new Date() })
    .where(and(eq(biDashboards.id, id), eq(biDashboards.userId, userId)));

  return { success: true };
}

// ─── Widget CRUD ───────────────────────────────────────────────
export async function getWidgetsForDashboard(dashboardId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(biWidgets)
    .where(eq(biWidgets.dashboardId, dashboardId))
    .orderBy(asc(biWidgets.id));
}

export async function createBiWidget(params: {
  dashboardId: number;
  widgetType: string;
  title: string;
  dataSource: string;
  config?: any;
  position: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not initialized");

  const [result] = await db.insert(biWidgets).values({
    dashboardId: params.dashboardId,
    widgetType: params.widgetType as any,
    title: params.title,
    dataSource: params.dataSource as any,
    config: params.config || {},
    position: params.position,
  });

  return { id: result.insertId };
}

export async function updateBiWidget(id: number, params: {
  title?: string;
  config?: any;
  position?: any;
  widgetType?: string;
  dataSource?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not initialized");

  const updateData: any = {};
  if (params.title) updateData.title = params.title;
  if (params.config) updateData.config = params.config;
  if (params.position) updateData.position = params.position;
  if (params.widgetType) updateData.widgetType = params.widgetType;
  if (params.dataSource) updateData.dataSource = params.dataSource;

  await db.update(biWidgets).set(updateData).where(eq(biWidgets.id, id));
  return { success: true };
}

export async function deleteBiWidget(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not initialized");

  await db.delete(biWidgets).where(eq(biWidgets.id, id));
  return { success: true };
}

// ─── Widget Data Resolver ──────────────────────────────────────
export async function resolveWidgetData(
  dataSource: string,
  tenantId?: number,
  config?: any
): Promise<any> {
  const db = await getDb();
  if (!db) return { error: "DB not initialized" };

  const tenantFilter = tenantId
    ? sql`AND ${defects.tenantId} = ${tenantId}`
    : sql``;

  switch (dataSource) {
    case "DEFECT_COUNT": {
      const [result] = await db.execute(
        sql`SELECT COUNT(*) as total,
            SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_count,
            SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed_count,
            SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress
            FROM defects WHERE deletedAt IS NULL ${tenantFilter}`
      );
      return result;
    }

    case "DEFECT_BY_STATUS": {
      const rows = await db.execute(
        sql`SELECT status, COUNT(*) as count FROM defects
            WHERE deletedAt IS NULL ${tenantFilter}
            GROUP BY status ORDER BY count DESC`
      );
      return rows[0];
    }

    case "DEFECT_BY_SEVERITY": {
      const rows = await db.execute(
        sql`SELECT COALESCE(mg, 'N/A') as severity, COUNT(*) as count FROM defects
            WHERE deletedAt IS NULL ${tenantFilter}
            GROUP BY mg ORDER BY count DESC`
      );
      return rows[0];
    }

    case "DEFECT_BY_SUPPLIER": {
      const rows = await db.execute(
        sql`SELECT s.name as supplier, COUNT(*) as count FROM defects d
            LEFT JOIN suppliers s ON d.supplierId = s.id
            WHERE d.deletedAt IS NULL ${tenantFilter}
            GROUP BY s.name ORDER BY count DESC LIMIT 10`
      );
      return rows[0];
    }

    case "DEFECT_BY_PLANT": {
      const rows = await db.execute(
        sql`SELECT COALESCE(category, 'N/A') as plant, COUNT(*) as count FROM defects
            WHERE deletedAt IS NULL ${tenantFilter}
            GROUP BY category ORDER BY count DESC`
      );
      return rows[0];
    }

    case "DEFECT_TREND": {
      const rows = await db.execute(
        sql`SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as count
            FROM defects WHERE deletedAt IS NULL ${tenantFilter}
            GROUP BY month ORDER BY month DESC LIMIT 12`
      );
      return (rows[0] as unknown as any[]).reverse();
    }

    case "COPQ_TOTAL": {
      const [result] = await db.execute(
        sql`SELECT COALESCE(SUM(CAST(amount AS DECIMAL(12,2))), 0) as total,
            COUNT(*) as entries FROM defect_costs`
      );
      return result;
    }

    case "COPQ_BY_CATEGORY": {
      const rows = await db.execute(
        sql`SELECT costCategory as category,
            COALESCE(SUM(CAST(amount AS DECIMAL(12,2))), 0) as total
            FROM defect_costs GROUP BY costCategory ORDER BY total DESC`
      );
      return rows[0];
    }

    case "COPQ_TREND": {
      const rows = await db.execute(
        sql`SELECT DATE_FORMAT(createdAt, '%Y-%m') as month,
            COALESCE(SUM(CAST(amount AS DECIMAL(12,2))), 0) as total
            FROM defect_costs GROUP BY month ORDER BY month DESC LIMIT 12`
      );
      return (rows[0] as unknown as any[]).reverse();
    }

    case "SLA_COMPLIANCE": {
      const [result] = await db.execute(
        sql`SELECT COUNT(*) as total,
            SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as on_time,
            SUM(CASE WHEN status = 'ONGOING' THEN 1 ELSE 0 END) as at_risk,
            SUM(CASE WHEN status = 'DELAYED' THEN 1 ELSE 0 END) as breached
            FROM defects WHERE deletedAt IS NULL ${tenantFilter}`
      );
      return result;
    }

    case "SLA_VIOLATIONS": {
      const rows = await db.execute(
        sql`SELECT DATE_FORMAT(createdAt, '%Y-%m') as month,
            SUM(CASE WHEN status = 'DELAYED' THEN 1 ELSE 0 END) as violations
            FROM defects WHERE deletedAt IS NULL ${tenantFilter}
            GROUP BY month ORDER BY month DESC LIMIT 12`
      );
      return (rows[0] as unknown as any[]).reverse();
    }

    case "SUPPLIER_SCORES": {
      const rows = await db.execute(
        sql`SELECT s.name, ssh.overallScore, ssh.grade
            FROM supplier_score_history ssh
            JOIN suppliers s ON ssh.supplierId = s.id
            WHERE ssh.periodKey = DATE_FORMAT(NOW(), '%Y-%m')
            ORDER BY ssh.overallScore DESC LIMIT 10`
      );
      return rows[0];
    }

    case "SUPPLIER_RANKING": {
      const rows = await db.execute(
        sql`SELECT s.name, COUNT(d.id) as defect_count,
            AVG(DATEDIFF(COALESCE(d.closedAt, NOW()), d.createdAt)) as avg_days
            FROM suppliers s
            LEFT JOIN defects d ON s.id = d.supplierId AND d.deletedAt IS NULL
            GROUP BY s.id, s.name ORDER BY defect_count DESC LIMIT 10`
      );
      return rows[0];
    }

    case "RESOLUTION_TIME": {
      const rows = await db.execute(
        sql`SELECT DATE_FORMAT(createdAt, '%Y-%m') as month,
            AVG(DATEDIFF(NOW(), createdAt)) as avg_days,
            MIN(DATEDIFF(NOW(), createdAt)) as min_days,
            MAX(DATEDIFF(NOW(), createdAt)) as max_days
            FROM defects WHERE status = 'CLOSED' AND deletedAt IS NULL ${tenantFilter}
            GROUP BY month ORDER BY month DESC LIMIT 12`
      );
      return (rows[0] as unknown as any[]).reverse();
    }

    case "RECURRENCE_RATE": {
      const rows = await db.execute(
        sql`SELECT COALESCE(symptom, 'N/A') as symptom, COUNT(*) as count FROM defects
            WHERE deletedAt IS NULL AND symptom IS NOT NULL ${tenantFilter}
            GROUP BY symptom HAVING count > 1
            ORDER BY count DESC LIMIT 10`
      );
      return rows[0];
    }

    case "OPEN_VS_CLOSED": {
      const rows = await db.execute(
        sql`SELECT DATE_FORMAT(createdAt, '%Y-%m') as month,
            SUM(CASE WHEN status IN ('OPEN','IN_PROGRESS') THEN 1 ELSE 0 END) as open_count,
            SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed_count
            FROM defects WHERE deletedAt IS NULL ${tenantFilter}
            GROUP BY month ORDER BY month DESC LIMIT 12`
      );
      return (rows[0] as unknown as any[]).reverse();
    }

    case "TOP_ROOT_CAUSES": {
      const rows = await db.execute(
        sql`SELECT COALESCE(cause, 'N/A') as category, COUNT(*) as count
            FROM defects WHERE cause IS NOT NULL AND deletedAt IS NULL ${tenantFilter}
            GROUP BY cause ORDER BY count DESC LIMIT 10`
      );
      return rows[0];
    }

    case "MONTHLY_COMPARISON": {
      const rows = await db.execute(
        sql`SELECT DATE_FORMAT(createdAt, '%Y-%m') as month,
            COUNT(*) as total,
            SUM(CASE WHEN mg = 'S' THEN 1 ELSE 0 END) as critical,
            SUM(CASE WHEN mg = 'A' THEN 1 ELSE 0 END) as major,
            SUM(CASE WHEN mg IN ('B','C') THEN 1 ELSE 0 END) as minor
            FROM defects WHERE deletedAt IS NULL ${tenantFilter}
            GROUP BY month ORDER BY month DESC LIMIT 12`
      );
      return (rows[0] as unknown as any[]).reverse();
    }

    default:
      return { error: `Unknown data source: ${dataSource}` };
  }
}
