import { eq, desc, and, like, or, sql, inArray, gte, lte, isNull, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  defects, InsertDefect, Defect,
  auditLogs, InsertAuditLog,
  comments, InsertComment,
  attachments, InsertAttachment,
  importLogs, InsertImportLog
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { 
  calculateStep, calculateResponsible, calculateAging, 
  calculateYear, calculateWeekKey, calculateMonthName,
  type DefectDates, type StatusType
} from "../shared/defectLogic";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// =====================================================
// USER FUNCTIONS
// =====================================================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// =====================================================
// DEFECT FUNCTIONS
// =====================================================

// Helper to enrich defect with calculated fields
function enrichDefect(defect: Defect) {
  const dates: DefectDates = {
    openDate: defect.openDate,
    dateDisposition: defect.dateDisposition,
    dateTechAnalysis: defect.dateTechAnalysis,
    dateRootCause: defect.dateRootCause,
    dateCorrectiveAction: defect.dateCorrectiveAction,
    dateValidation: defect.dateValidation,
    targetDate: defect.targetDate,
  };

  const step = calculateStep(dates);
  const currentResponsible = calculateResponsible(step);
  const status = defect.status || (step === "CLOSED" ? "CLOSED" : "ONGOING") as StatusType;
  const aging = calculateAging(dates, step, status);

  return {
    ...defect,
    step,
    currentResponsible,
    year: calculateYear(defect.openDate),
    weekKey: calculateWeekKey(defect.openDate),
    monthName: calculateMonthName(defect.openDate),
    ...aging,
  };
}

export interface DefectFilters {
  year?: number;
  month?: string;
  weekKey?: string;
  supplier?: string;
  symptom?: string;
  status?: string;
  step?: string;
  bucketAging?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  mg?: string;
  model?: string;
  customer?: string;
  owner?: string;
  // Pagination
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}

export async function getDefects(filters?: DefectFilters) {
  const db = await getDb();
  if (!db) return { data: [], total: 0, page: 1, pageSize: 50 };

  // Build conditions - always exclude soft-deleted unless explicitly requested
  const conditions: ReturnType<typeof eq>[] = [];
  
  if (!filters?.includeDeleted) {
    conditions.push(isNull(defects.deletedAt));
  }

  if (filters?.supplier) {
    conditions.push(eq(defects.supplier, filters.supplier));
  }
  if (filters?.status) {
    conditions.push(eq(defects.status, filters.status as any));
  }
   if (filters?.step) {
    conditions.push(eq(defects.step, filters.step as any));
  }
  if (filters?.mg) {
    conditions.push(eq(defects.mg, filters.mg as any));
  }
  if (filters?.model) {
    conditions.push(eq(defects.model, filters.model));
  }
  if (filters?.customer) {
    conditions.push(eq(defects.customer, filters.customer));
  }
  if (filters?.owner) {
    conditions.push(eq(defects.owner, filters.owner));
  }
  const result = conditions.length > 0 
    ? await db.select().from(defects).where(and(...conditions)).orderBy(desc(defects.openDate))
    : await db.select().from(defects).orderBy(desc(defects.openDate));

  // Enrich with calculated fields and apply client-side filters
  let enrichedResults = result.map(enrichDefect);

  // Apply filters that need calculated fields
  if (filters?.year) {
    enrichedResults = enrichedResults.filter(d => d.year === filters.year);
  }
  if (filters?.month) {
    enrichedResults = enrichedResults.filter(d => d.monthName === filters.month);
  }
  if (filters?.weekKey) {
    enrichedResults = enrichedResults.filter(d => d.weekKey === filters.weekKey);
  }
  if (filters?.bucketAging) {
    enrichedResults = enrichedResults.filter(d => d.bucketAging === filters.bucketAging);
  }
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    enrichedResults = enrichedResults.filter(d => 
      d.docNumber?.toLowerCase().includes(searchLower) ||
      d.pn?.toLowerCase().includes(searchLower) ||
      d.description?.toLowerCase().includes(searchLower) ||
      d.symptom?.toLowerCase().includes(searchLower)
    );
  }
  
  // Date range filter
  if (filters?.dateFrom) {
    enrichedResults = enrichedResults.filter(d => {
      if (!d.openDate) return false;
      const defectDate = d.openDate.split('/').reverse().join('-');
      return defectDate >= filters.dateFrom!;
    });
  }
  if (filters?.dateTo) {
    enrichedResults = enrichedResults.filter(d => {
      if (!d.openDate) return false;
      const defectDate = d.openDate.split('/').reverse().join('-');
      return defectDate <= filters.dateTo!;
    });
  }

  // Pagination
  const total = enrichedResults.length;
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;
  
  if (filters?.page) {
    const start = (page - 1) * pageSize;
    enrichedResults = enrichedResults.slice(start, start + pageSize);
  }

  return { data: enrichedResults, total, page, pageSize };
}

// Backward-compatible wrapper that returns flat array
export async function getDefectsFlat(filters?: DefectFilters) {
  const result = await getDefects(filters);
  return result.data;
}

export async function getDefectById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(defects).where(
    and(eq(defects.id, id), isNull(defects.deletedAt))
  ).limit(1);
  if (result.length === 0) return null;

  return enrichDefect(result[0]);
}

export async function getDefectByDocNumber(docNumber: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(defects).where(
    and(eq(defects.docNumber, docNumber), isNull(defects.deletedAt))
  ).limit(1);
  if (result.length === 0) return null;

  return enrichDefect(result[0]);
}

export async function createDefect(data: InsertDefect, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calculate derived fields
  const year = calculateYear(data.openDate);
  const weekKey = calculateWeekKey(data.openDate);
  const monthName = calculateMonthName(data.openDate);

  // Resolve supplierId from supplier name if not provided
  let supplierId = data.supplierId;
  if (!supplierId && data.supplier) {
    const supplierRecord = await getSupplierByName(data.supplier);
    if (supplierRecord) {
      supplierId = supplierRecord.id;
    }
  }

  const insertData = {
    ...data,
    year,
    weekKey,
    monthName,
    supplierId,
    createdBy: userId,
    updatedBy: userId,
  };

  const result = await db.insert(defects).values(insertData);
  const insertId = result[0].insertId;

  return getDefectById(insertId);
}

export async function updateDefect(id: number, data: Partial<InsertDefect>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Recalculate derived fields if openDate changed
  const updateData: any = { ...data, updatedBy: userId };
  if (data.openDate) {
    updateData.year = calculateYear(data.openDate);
    updateData.weekKey = calculateWeekKey(data.openDate);
    updateData.monthName = calculateMonthName(data.openDate);
  }

  // Resolve supplierId if supplier name changed
  if (data.supplier) {
    const supplierRecord = await getSupplierByName(data.supplier);
    if (supplierRecord) {
      updateData.supplierId = supplierRecord.id;
    }
  }

  await db.update(defects).set(updateData).where(eq(defects.id, id));
  return getDefectById(id);
}

// Soft delete defect (sets deletedAt instead of removing)
export async function deleteDefect(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(defects).set({ 
    deletedAt: new Date(),
    updatedBy: userId 
  }).where(eq(defects.id, id));
  return true;
}

// Restore soft-deleted defect
export async function restoreDefect(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(defects).set({ 
    deletedAt: null,
    updatedBy: userId 
  }).where(eq(defects.id, id));
  return getDefectById(id);
}

// =====================================================
// AUDIT LOG FUNCTIONS
// =====================================================
export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;

  await db.insert(auditLogs).values(data);
}

export async function getAuditLogsForDefect(defectId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(auditLogs)
    .where(eq(auditLogs.defectId, defectId))
    .orderBy(desc(auditLogs.timestamp));
}

// =====================================================
// COMMENT FUNCTIONS
// =====================================================
export async function createComment(data: InsertComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(comments).values(data);
  return result[0].insertId;
}

export async function getCommentsForDefect(defectId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(comments)
    .where(and(eq(comments.defectId, defectId), isNull(comments.deletedAt)))
    .orderBy(desc(comments.createdAt));
}

// =====================================================
// ATTACHMENT FUNCTIONS
// =====================================================
export async function createAttachment(data: InsertAttachment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(attachments).values(data);
  return result[0].insertId;
}

export async function getAttachmentsForDefect(defectId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(attachments)
    .where(and(eq(attachments.defectId, defectId), isNull(attachments.deletedAt)))
    .orderBy(desc(attachments.createdAt));
}

// Soft delete attachment
export async function deleteAttachment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(attachments).set({ deletedAt: new Date() }).where(eq(attachments.id, id));
  return true;
}

// =====================================================
// IMPORT LOG FUNCTIONS
// =====================================================
export async function createImportLog(data: InsertImportLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(importLogs).values(data);
  return result[0].insertId;
}

export async function getImportLogs() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(importLogs).orderBy(desc(importLogs.createdAt));
}

// =====================================================
// STATISTICS FUNCTIONS
// =====================================================
export async function getDefectStats(filters?: { dateFrom?: string; dateTo?: string }) {
  const db = await getDb();
  if (!db) return null;

  let { data: allDefects } = await getDefects();
  
  // Apply period filter
  if (filters?.dateFrom || filters?.dateTo) {
    allDefects = allDefects.filter(d => {
      if (!d.openDate) return false;
      // Parse dd.mm.yy format
      const parts = d.openDate.split('.');
      if (parts.length !== 3) return false;
      const defectDate = new Date(2000 + parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (isNaN(defectDate.getTime())) return false;
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        if (defectDate < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (defectDate > to) return false;
      }
      return true;
    });
  }

  // Count by status
  const byStatus = allDefects.reduce((acc, d) => {
    const status = d.status || "ONGOING";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count by step
  const byStep = allDefects.reduce((acc, d) => {
    acc[d.step] = (acc[d.step] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count by bucket aging
  const byBucketAging = allDefects.reduce((acc, d) => {
    acc[d.bucketAging] = (acc[d.bucketAging] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Top 5 symptoms
  const symptomCounts = allDefects.reduce((acc, d) => {
    if (d.symptom) {
      acc[d.symptom] = (acc[d.symptom] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Top 5 suppliers
  const supplierCounts = allDefects.reduce((acc, d) => {
    if (d.supplier) {
      acc[d.supplier] = (acc[d.supplier] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const topSuppliers = Object.entries(supplierCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Critical cases (DELAYED or aging > 30)
  const criticalCases = allDefects.filter(d => 
    d.status === "DELAYED" || d.agingTotal > 30
  );

  // Weekly trend
  const weeklyTrend = allDefects.reduce((acc, d) => {
    if (d.weekKey) {
      if (!acc[d.weekKey]) {
        acc[d.weekKey] = { weekKey: d.weekKey, total: 0, closed: 0, ongoing: 0, delayed: 0 };
      }
      acc[d.weekKey].total++;
      if (d.status === "CLOSED") acc[d.weekKey].closed++;
      else if (d.status === "DELAYED") acc[d.weekKey].delayed++;
      else acc[d.weekKey].ongoing++;
    }
    return acc;
  }, {} as Record<string, { weekKey: string; total: number; closed: number; ongoing: number; delayed: number }>);

  return {
    total: allDefects.length,
    byStatus,
    byStep,
    byBucketAging,
    topSymptoms,
    topSuppliers,
    criticalCases: criticalCases.length,
    criticalCasesList: criticalCases.slice(0, 10),
    weeklyTrend: Object.values(weeklyTrend).sort((a, b) => a.weekKey.localeCompare(b.weekKey)),
  };
}

// =====================================================
// FILTER OPTIONS
// =====================================================
export async function getFilterOptions() {
  const db = await getDb();
  if (!db) return null;

  const { data: allDefects } = await getDefects();
  
  // Get suppliers from suppliers table (source of truth)
  const allSuppliers = await getSuppliers();
  const supplierNames = allSuppliers.map(s => s.name).sort();

  const years = Array.from(new Set(allDefects.map(d => d.year).filter((y): y is number => y !== null))).sort((a, b) => b - a);
  const months = Array.from(new Set(allDefects.map(d => d.monthName).filter((m): m is string => m !== null)));
  const weekKeys = Array.from(new Set(allDefects.map(d => d.weekKey).filter((w): w is string => w !== null))).sort().reverse();
  const symptoms = Array.from(new Set(allDefects.map(d => d.symptom).filter((s): s is string => s !== null))).sort();

  return {
    years,
    months,
    weekKeys,
    suppliers: supplierNames,
    symptoms,
    statuses: ["CLOSED", "ONGOING", "DELAYED", "Waiting for CHK Solution"],
    steps: [
      "Aguardando Disposição",
      "Aguardando Análise Técnica",
      "Aguardando Causa Raiz",
      "Aguardando Ação Corretiva",
      "Aguardando Validação de Ação Corretiva",
      "CLOSED"
    ],
    bucketAgings: ["<=4", "5-14", "15-29", "30-59", ">60"],
    models: Array.from(new Set(allDefects.map(d => d.model).filter((m): m is string => m !== null && m !== ""))).sort(),
    customers: Array.from(new Set(allDefects.map(d => d.customer).filter((c): c is string => c !== null && c !== ""))).sort(),
    owners: Array.from(new Set(allDefects.map(d => d.owner).filter((o): o is string => o !== null && o !== ""))).sort(),
    severities: ["S", "A", "B", "C"],
  };
}


// =====================================================
// SUPPLIER FUNCTIONS (Portal do Fornecedor)
// =====================================================
import { 
  suppliers, InsertSupplier, Supplier,
  slaConfigs, InsertSlaConfig,
  notifications, InsertNotification,
  notificationRecipients, InsertNotificationRecipient,
  rootCauseCategories, InsertRootCauseCategory
} from "../drizzle/schema";

export async function getSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers)
    .where(isNull(suppliers.deletedAt))
    .orderBy(suppliers.name);
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(suppliers).where(
    and(eq(suppliers.id, id), isNull(suppliers.deletedAt))
  ).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getSupplierByAccessCode(accessCode: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(suppliers)
    .where(and(
      eq(suppliers.accessCode, accessCode), 
      eq(suppliers.isActive, true),
      isNull(suppliers.deletedAt)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getSupplierByName(name: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(suppliers).where(
    and(eq(suppliers.name, name), isNull(suppliers.deletedAt))
  ).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createSupplier(data: InsertSupplier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Generate unique access code
  const accessCode = `SUP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  const result = await db.insert(suppliers).values({ ...data, accessCode });
  return getSupplierById(result[0].insertId);
}

export async function updateSupplier(id: number, data: Partial<InsertSupplier>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get current supplier to check if name is changing
  const currentSupplier = await getSupplierById(id);
  if (!currentSupplier) {
    throw new Error("Fornecedor não encontrado");
  }
  
  // Check if name is being updated and if it already exists for another supplier
  if (data.name && data.name !== currentSupplier.name) {
    const existingSupplier = await getSupplierByName(data.name);
    if (existingSupplier && existingSupplier.id !== id) {
      throw new Error(`Já existe um fornecedor com o nome "${data.name}". Por favor, escolha outro nome ou exclua o fornecedor duplicado.`);
    }
    
    // Update supplier name in all related defects (transactional)
    await db.update(defects)
      .set({ supplier: data.name })
      .where(eq(defects.supplier, currentSupplier.name));
  }
  
  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
  return getSupplierById(id);
}

// Soft delete supplier
export async function deleteSupplier(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(suppliers).set({ deletedAt: new Date() }).where(eq(suppliers.id, id));
  return true;
}

export async function getDefectsForSupplier(supplierName: string) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(defects)
    .where(and(
      eq(defects.supplier, supplierName),
      isNull(defects.deletedAt)
    ))
    .orderBy(desc(defects.openDate));
  
  return result.map(enrichDefect);
}

// =====================================================
// SLA CONFIGURATION FUNCTIONS
// =====================================================
export async function getSlaConfigs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(slaConfigs).where(eq(slaConfigs.isActive, true));
}

export async function createSlaConfig(data: InsertSlaConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(slaConfigs).values(data);
  return result[0].insertId;
}

export async function updateSlaConfig(id: number, data: Partial<InsertSlaConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(slaConfigs).set(data).where(eq(slaConfigs.id, id));
}

export async function getDefaultSlaForStep(step: string, severity?: string) {
  const configs = await getSlaConfigs();
  
  // Try to find specific config for step + severity
  let config = configs.find(c => c.step === step && c.severityMg === severity);
  
  // Fallback to step-only config
  if (!config) {
    config = configs.find(c => c.step === step && !c.severityMg);
  }
  
  // Default SLA values
  return config || { maxDays: 7, warningDays: 5 };
}

// =====================================================
// NOTIFICATION FUNCTIONS
// =====================================================
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function getNotifications(defectId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (defectId) {
    return db.select().from(notifications)
      .where(eq(notifications.defectId, defectId))
      .orderBy(desc(notifications.createdAt));
  }
  
  return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100);
}

export async function updateNotificationStatus(id: number, status: "SENT" | "FAILED" | "READ" | "DELETED", errorMessage?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { status };
  if (status === "SENT") {
    updateData.sentAt = new Date();
  }
  if (errorMessage) {
    updateData.errorMessage = errorMessage;
  }
  
  await db.update(notifications).set(updateData).where(eq(notifications.id, id));
}

export async function getPendingNotifications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.status, "PENDING"));
}

// =====================================================
// NOTIFICATION RECIPIENTS FUNCTIONS
// =====================================================
export async function getNotificationRecipients(type?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (type) {
    return db.select().from(notificationRecipients)
      .where(and(
        eq(notificationRecipients.isActive, true),
        or(eq(notificationRecipients.notificationType, type as any), eq(notificationRecipients.notificationType, "ALL"))
      ));
  }
  
  return db.select().from(notificationRecipients).where(eq(notificationRecipients.isActive, true));
}

export async function createNotificationRecipient(data: InsertNotificationRecipient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notificationRecipients).values(data);
  return result[0].insertId;
}

export async function deleteNotificationRecipient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notificationRecipients).set({ isActive: false }).where(eq(notificationRecipients.id, id));
}

// =====================================================
// ROOT CAUSE ANALYSIS FUNCTIONS
// =====================================================
export async function getRootCauseCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rootCauseCategories).where(eq(rootCauseCategories.isActive, true));
}

export async function createRootCauseCategory(data: InsertRootCauseCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(rootCauseCategories).values(data);
  return result[0].insertId;
}

export async function getRootCauseAnalysis(filters?: { dateFrom?: string; dateTo?: string }) {
  let { data: allDefects } = await getDefects();
  
  // Apply period filter
  if (filters?.dateFrom || filters?.dateTo) {
    allDefects = allDefects.filter(d => {
      if (!d.openDate) return false;
      const parts = d.openDate.split('.');
      if (parts.length !== 3) return false;
      const defectDate = new Date(2000 + parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (isNaN(defectDate.getTime())) return false;
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        if (defectDate < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (defectDate > to) return false;
      }
      return true;
    });
  }
  
  // Extract and categorize root causes
  const causeCounts: Record<string, { count: number; defects: typeof allDefects }> = {};
  
  allDefects.forEach(d => {
    if (d.cause) {
      const causeKey = extractCauseCategory(d.cause);
      if (!causeCounts[causeKey]) {
        causeCounts[causeKey] = { count: 0, defects: [] };
      }
      causeCounts[causeKey].count++;
      causeCounts[causeKey].defects.push(d);
    }
  });
  
  // Sort by count (Pareto)
  const sortedCauses = Object.entries(causeCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([cause, data], index) => ({
      rank: index + 1,
      cause,
      count: data.count,
      percentage: (data.count / allDefects.length * 100).toFixed(1),
      defectIds: data.defects.map(d => d.id),
      suppliers: Array.from(new Set(data.defects.map(d => d.supplier).filter(Boolean))),
      symptoms: Array.from(new Set(data.defects.map(d => d.symptom).filter(Boolean))),
    }));
  
  // Calculate cumulative percentage for Pareto
  let cumulative = 0;
  const paretoData = sortedCauses.map(item => {
    cumulative += parseFloat(item.percentage);
    return { ...item, cumulativePercentage: cumulative.toFixed(1) };
  });
  
  return {
    totalWithCause: allDefects.filter(d => d.cause).length,
    totalWithoutCause: allDefects.filter(d => !d.cause).length,
    topCauses: paretoData.slice(0, 10),
    allCauses: paretoData,
  };
}

// Helper to extract category from cause text
function extractCauseCategory(cause: string): string {
  const categories = [
    { keywords: ["material", "matéria-prima", "componente", "peça"], category: "Material/Componente" },
    { keywords: ["processo", "procedimento", "método"], category: "Processo/Método" },
    { keywords: ["máquina", "equipamento", "ferramenta"], category: "Máquina/Equipamento" },
    { keywords: ["operador", "mão de obra", "treinamento"], category: "Mão de Obra" },
    { keywords: ["medição", "inspeção", "teste"], category: "Medição/Inspeção" },
    { keywords: ["ambiente", "temperatura", "umidade"], category: "Meio Ambiente" },
    { keywords: ["fornecedor", "supplier"], category: "Fornecedor" },
    { keywords: ["design", "projeto", "especificação"], category: "Design/Projeto" },
  ];
  
  const causeLower = cause.toLowerCase();
  
  for (const cat of categories) {
    if (cat.keywords.some(kw => causeLower.includes(kw))) {
      return cat.category;
    }
  }
  
  return cause.substring(0, 50).trim() + (cause.length > 50 ? "..." : "");
}

// =====================================================
// SLA CHECK FUNCTIONS
// =====================================================
export async function checkSlaViolations() {
  const { data: allDefects } = await getDefects();
  const slaConfigsList = await getSlaConfigs();
  
  const violations: Array<{
    defect: ReturnType<typeof enrichDefect>;
    slaConfig: { maxDays: number; warningDays: number };
    daysInStep: number;
    violationType: "WARNING" | "EXCEEDED";
  }> = [];
  
  for (const defect of allDefects) {
    if (defect.status === "CLOSED") continue;
    
    const sla = await getDefaultSlaForStep(defect.step, defect.mg || undefined);
    const daysInStep = defect.agingByStep;
    
    if (daysInStep >= sla.maxDays) {
      violations.push({
        defect,
        slaConfig: sla,
        daysInStep,
        violationType: "EXCEEDED",
      });
    } else if (daysInStep >= sla.warningDays) {
      violations.push({
        defect,
        slaConfig: sla,
        daysInStep,
        violationType: "WARNING",
      });
    }
  }
  
  return violations;
}


// =====================================================
// SUPPLIER MERGE FUNCTION
// =====================================================
export async function mergeSuppliers(
  targetId: number, 
  sourceIds: number[],
  userId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get target supplier
  const target = await getSupplierById(targetId);
  if (!target) throw new Error("Fornecedor destino não encontrado");
  
  // Get source suppliers
  const sources: Array<{ id: number; name: string }> = [];
  for (const sourceId of sourceIds) {
    const source = await getSupplierById(sourceId);
    if (!source) throw new Error(`Fornecedor origem (ID ${sourceId}) não encontrado`);
    if (source.id === targetId) throw new Error("Fornecedor destino não pode ser igual ao origem");
    sources.push({ id: source.id, name: source.name });
  }
  
  let totalDefectsMoved = 0;
  
  // For each source supplier, move defects to target
  for (const source of sources) {
    // Update defects: change supplier name and supplierId to target
    const result = await db.update(defects)
      .set({ 
        supplier: target.name, 
        supplierId: targetId 
      })
      .where(and(
        eq(defects.supplier, source.name),
        isNull(defects.deletedAt)
      ));
    
    // Count moved defects
    const movedDefects = await db.select({ count: sql<number>`count(*)` })
      .from(defects)
      .where(and(
        eq(defects.supplierId, targetId),
        isNull(defects.deletedAt)
      ));
    
    // Soft delete the source supplier
    await db.update(suppliers)
      .set({ deletedAt: new Date() })
      .where(eq(suppliers.id, source.id));
    
    totalDefectsMoved++;
  }
  
  // Count total defects now under target
  const finalCount = await db.select({ count: sql<number>`count(*)` })
    .from(defects)
    .where(and(
      eq(defects.supplier, target.name),
      isNull(defects.deletedAt)
    ));
  
  return {
    targetSupplier: target.name,
    mergedSuppliers: sources.map(s => s.name),
    totalDefectsUnderTarget: Number(finalCount[0]?.count || 0),
  };
}


// =====================================================
// COPQ (Cost of Poor Quality) FUNCTIONS
// =====================================================
import {
  defectCosts, InsertDefectCost,
  costDefaults, InsertCostDefault,
  supplierScoreConfigs, InsertSupplierScoreConfig,
  supplierScoreHistory, InsertSupplierScoreHistory,
  aiSuggestions, InsertAiSuggestion,
} from "../drizzle/schema";

// costType → costCategory mapping (RN-COPQ-02)
const COST_TYPE_CATEGORY_MAP: Record<string, string> = {
  SCRAP: "INTERNAL_FAILURE",
  REWORK: "INTERNAL_FAILURE",
  REINSPECTION: "INTERNAL_FAILURE",
  DOWNTIME: "INTERNAL_FAILURE",
  WARRANTY: "EXTERNAL_FAILURE",
  RETURN: "EXTERNAL_FAILURE",
  RECALL: "EXTERNAL_FAILURE",
  COMPLAINT: "EXTERNAL_FAILURE",
  INSPECTION: "APPRAISAL",
  TESTING: "APPRAISAL",
  AUDIT: "APPRAISAL",
  TRAINING: "PREVENTION",
  PLANNING: "PREVENTION",
  QUALIFICATION: "PREVENTION",
  OTHER: "INTERNAL_FAILURE",
};

export function inferCostCategory(costType: string): string {
  return COST_TYPE_CATEGORY_MAP[costType] || "INTERNAL_FAILURE";
}

export async function getCostsByDefect(defectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(defectCosts)
    .where(and(eq(defectCosts.defectId, defectId), isNull(defectCosts.deletedAt)))
    .orderBy(desc(defectCosts.createdAt));
}

export async function addDefectCost(data: InsertDefectCost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(defectCosts).values(data);
  return result[0].insertId;
}

export async function updateDefectCost(id: number, data: Partial<InsertDefectCost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(defectCosts).set(data).where(eq(defectCosts.id, id));
}

export async function softDeleteDefectCost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(defectCosts).set({ deletedAt: new Date() }).where(eq(defectCosts.id, id));
}

export async function getCopqDashboard(filters?: { startDate?: string; endDate?: string; supplierId?: number }) {
  const db = await getDb();
  if (!db) return null;

  // Get all non-deleted costs
  let allCosts = await db.select().from(defectCosts).where(isNull(defectCosts.deletedAt));

  // Join with defects for supplier info
  const allDefectsResult = await getDefects({ pageSize: 10000 });
  const defectMap = new Map(allDefectsResult.data.map((d: any) => [d.id, d]));

  // Apply filters
  if (filters?.startDate) {
    const start = new Date(filters.startDate);
    allCosts = allCosts.filter(c => c.createdAt >= start);
  }
  if (filters?.endDate) {
    const end = new Date(filters.endDate);
    allCosts = allCosts.filter(c => c.createdAt <= end);
  }
  if (filters?.supplierId) {
    allCosts = allCosts.filter(c => {
      const defect = defectMap.get(c.defectId);
      return defect && defect.supplierId === filters.supplierId;
    });
  }

  // Total by category
  const totalByCategory: Record<string, number> = {
    INTERNAL_FAILURE: 0, EXTERNAL_FAILURE: 0, APPRAISAL: 0, PREVENTION: 0,
  };
  let totalCost = 0;
  const defectsWithCostSet = new Set<number>();

  for (const cost of allCosts) {
    const amount = parseFloat(cost.amount);
    totalByCategory[cost.costCategory] = (totalByCategory[cost.costCategory] || 0) + amount;
    totalCost += amount;
    defectsWithCostSet.add(cost.defectId);
  }

  // Top suppliers by cost (RN-COPQ-05)
  const supplierCosts: Record<string, { name: string; total: number }> = {};
  for (const cost of allCosts) {
    const defect = defectMap.get(cost.defectId);
    const supplierName = defect?.supplier || "Desconhecido";
    if (!supplierCosts[supplierName]) supplierCosts[supplierName] = { name: supplierName, total: 0 };
    supplierCosts[supplierName].total += parseFloat(cost.amount);
  }
  const topSuppliers = Object.values(supplierCosts)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Monthly trend (RN-COPQ-06) - last 12 months
  const monthlyTrend: Array<{ month: number; year: number; label: string; total: number; byCategory: Record<string, number> }> = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const label = `${year}-${String(month).padStart(2, "0")}`;
    const monthlyCosts = allCosts.filter(c => {
      const cd = c.createdAt;
      return cd.getFullYear() === year && cd.getMonth() + 1 === month;
    });
    const byCategory: Record<string, number> = { INTERNAL_FAILURE: 0, EXTERNAL_FAILURE: 0, APPRAISAL: 0, PREVENTION: 0 };
    let monthTotal = 0;
    for (const mc of monthlyCosts) {
      const amt = parseFloat(mc.amount);
      byCategory[mc.costCategory] += amt;
      monthTotal += amt;
    }
    monthlyTrend.push({ month, year, label, total: monthTotal, byCategory });
  }

  const defectsWithCost = defectsWithCostSet.size;
  const defectsWithoutCost = allDefectsResult.total - defectsWithCost;
  const avgCostPerDefect = defectsWithCost > 0 ? totalCost / defectsWithCost : 0;

  return {
    totalByCategory,
    topSuppliers,
    monthlyTrend,
    totalCost,
    avgCostPerDefect,
    defectsWithCost,
    defectsWithoutCost,
  };
}

export async function getCostDefaults() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(costDefaults).where(eq(costDefaults.isActive, true));
}

export async function upsertCostDefault(data: InsertCostDefault) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(costDefaults).values(data);
  return result[0].insertId;
}

// =====================================================
// SUPPLIER SCORECARD FUNCTIONS
// =====================================================
export async function getScoreConfigs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supplierScoreConfigs).where(eq(supplierScoreConfigs.isActive, true));
}

export async function updateScoreConfig(id: number, data: Partial<InsertSupplierScoreConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(supplierScoreConfigs).set(data).where(eq(supplierScoreConfigs.id, id));
}

export async function saveScoreHistory(data: InsertSupplierScoreHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(supplierScoreHistory).values(data);
  return result[0].insertId;
}

export async function getScoreHistory(supplierId: number, limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supplierScoreHistory)
    .where(eq(supplierScoreHistory.supplierId, supplierId))
    .orderBy(desc(supplierScoreHistory.periodKey))
    .limit(limit);
}

export async function calculateSupplierScore(supplierId: number) {
  const allDefectsResult = await getDefects({ pageSize: 10000 });
  const supplierDefects = allDefectsResult.data.filter((d: any) => d.supplierId === supplierId);
  const configs = await getScoreConfigs();
  const slaConfigs = await getSlaConfigs();

  const totalDefects = supplierDefects.length;
  if (totalDefects === 0) return { overallScore: 100, grade: "A" as const, metrics: {} };

  // PPM Score (RN-SC-01): 0 defeitos=100, >10=0, linear
  const ppmScore = Math.max(0, Math.min(100, 100 - (totalDefects * 10)));

  // SLA Compliance (RN-SC-02)
  let withinSla = 0;
  for (const d of supplierDefects) {
    const sla = slaConfigs.find((s: any) => s.step === d.step && s.severityMg === d.mg)
      || slaConfigs.find((s: any) => s.step === d.step && !s.severityMg);
    const maxDays = sla?.maxDays || 7;
    if ((d.agingTotal || 0) <= maxDays) withinSla++;
  }
  const slaScore = totalDefects > 0 ? (withinSla / totalDefects) * 100 : 100;

  // Corrective Action Effectiveness (RN-SC-03)
  const withCA = supplierDefects.filter((d: any) => d.correctiveActions);
  const closedWithCA = withCA.filter((d: any) => d.status === "CLOSED");
  const caScore = withCA.length > 0 ? (closedWithCA.length / withCA.length) * 100 : 100;

  // Average Resolution Time (RN-SC-04): <=7d=100, >=60d=0
  const avgAging = supplierDefects.reduce((sum: number, d: any) => sum + (d.agingTotal || 0), 0) / totalDefects;
  const resolutionScore = Math.max(0, Math.min(100, 100 - ((avgAging - 7) / 53) * 100));

  // Response Rate (RN-SC-05)
  const withFeedback = supplierDefects.filter((d: any) => d.supplyFeedback);
  const responseScore = totalDefects > 0 ? (withFeedback.length / totalDefects) * 100 : 0;

  // Weighted composite score (RN-SC-06)
  const metricWeights: Record<string, number> = {};
  const metricScores: Record<string, number> = {
    ppm: ppmScore,
    slaCompliance: slaScore,
    correctiveEffectiveness: caScore,
    resolutionTime: resolutionScore,
    responseRate: responseScore,
  };

  for (const config of configs) {
    metricWeights[config.metricKey] = parseFloat(config.weight as string);
  }

  // Default weights if no config
  const defaultWeights: Record<string, number> = { ppm: 3, slaCompliance: 2, correctiveEffectiveness: 2, resolutionTime: 1, responseRate: 1 };
  let totalWeightedScore = 0;
  let totalWeight = 0;
  for (const [key, score] of Object.entries(metricScores)) {
    const weight = metricWeights[key] ?? defaultWeights[key] ?? 1;
    totalWeightedScore += score * weight;
    totalWeight += weight;
  }
  const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

  // Grade (RN-SC-07)
  let grade: "A" | "B" | "C" | "D";
  if (overallScore >= 80) grade = "A";
  else if (overallScore >= 60) grade = "B";
  else if (overallScore >= 40) grade = "C";
  else grade = "D";

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    grade,
    metrics: metricScores,
    totalDefects,
  };
}

export async function getAllSupplierScores() {
  const allSuppliers = await getSuppliers();
  const scores = [];
  for (const supplier of allSuppliers) {
    const score = await calculateSupplierScore(supplier.id);
    const history = await getScoreHistory(supplier.id, 6);
    const historyScores = history.map((h: any) => parseFloat(h.overallScore));
    const avgLast3 = historyScores.length >= 3
      ? historyScores.slice(0, 3).reduce((a: number, b: number) => a + b, 0) / 3
      : null;
    let trend: "UP" | "DOWN" | "STABLE" = "STABLE";
    if (avgLast3 !== null) {
      if (score.overallScore > avgLast3 + 5) trend = "UP";
      else if (score.overallScore < avgLast3 - 5) trend = "DOWN";
    }
    scores.push({
      supplierId: supplier.id,
      name: supplier.name,
      ...score,
      trend,
      history: historyScores,
    });
  }
  return scores.sort((a, b) => b.overallScore - a.overallScore);
}

// =====================================================
// AI SUGGESTIONS FUNCTIONS
// =====================================================
export async function getAiSuggestions(defectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiSuggestions)
    .where(eq(aiSuggestions.defectId, defectId))
    .orderBy(desc(aiSuggestions.createdAt));
}

export async function createAiSuggestion(data: InsertAiSuggestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(aiSuggestions).values(data);
  return result[0].insertId;
}

export async function updateAiSuggestion(id: number, data: Partial<InsertAiSuggestion>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(aiSuggestions).set(data).where(eq(aiSuggestions.id, id));
}

export async function getSimilarDefects(params: { supplier?: string; model?: string; category?: string }, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const conditions: ReturnType<typeof eq>[] = [isNull(defects.deletedAt)];
  if (params.supplier) conditions.push(eq(defects.supplier, params.supplier));
  const result = await db.select().from(defects)
    .where(and(...conditions))
    .orderBy(desc(defects.createdAt))
    .limit(limit);
  return result.map(d => ({
    id: d.id,
    description: d.description || "",
    cause: d.cause || "",
    correctiveActions: d.correctiveActions || "",
    category: d.category || "",
    symptom: d.symptom || "",
  }));
}

export async function initializeScoreConfigs() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(supplierScoreConfigs);
  if (existing.length > 0) return;
  const defaults = [
    { metricKey: "ppm", metricName: "PPM (Parts Per Million)", weight: "3.00", description: "Taxa de defeitos por milhão de peças" },
    { metricKey: "slaCompliance", metricName: "Conformidade SLA", weight: "2.00", description: "Percentual de defeitos resolvidos dentro do SLA" },
    { metricKey: "correctiveEffectiveness", metricName: "Eficácia de Ação Corretiva", weight: "2.00", description: "Percentual de defeitos sem recorrência após ação corretiva" },
    { metricKey: "resolutionTime", metricName: "Tempo de Resolução", weight: "1.00", description: "Tempo médio de resolução normalizado" },
    { metricKey: "responseRate", metricName: "Taxa de Resposta", weight: "1.00", description: "Percentual de defeitos com feedback do fornecedor" },
  ];
  for (const d of defaults) {
    await db.insert(supplierScoreConfigs).values(d as any);
  }
}
