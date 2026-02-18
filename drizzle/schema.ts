import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json, index } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// =====================================================
// USERS TABLE (Core auth)
// =====================================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "sqa", "supplier", "viewer"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  activeTenantId: int("activeTenantId"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// =====================================================
// SUPPLIERS TABLE (Supplier Portal)
// =====================================================
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  code: varchar("code", { length: 50 }),
  email: varchar("email", { length: 320 }),
  contactName: varchar("contactName", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  accessCode: varchar("accessCode", { length: 100 }),
  isActive: boolean("isActive").default(true),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_suppliers_access_code").on(table.accessCode),
  index("idx_suppliers_name").on(table.name),
  index("idx_suppliers_is_active").on(table.isActive),
]);

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// =====================================================
// DEFECTS TABLE (Main entity)
// =====================================================
export const defects = mysqlTable("defects", {
  // Identification
  id: int("id").autoincrement().primaryKey(),
  docNumber: varchar("docNumber", { length: 20 }).notNull().unique(),
  openDate: varchar("openDate", { length: 20 }).notNull(),
  year: int("year"),
  weekKey: varchar("weekKey", { length: 10 }),
  monthName: varchar("monthName", { length: 20 }),

  // Classification
  mg: mysqlEnum("mg", ["S", "A", "B", "C"]),
  defectsSeverity: varchar("defectsSeverity", { length: 100 }),
  category: varchar("category", { length: 100 }),

  // Product
  model: varchar("model", { length: 100 }),
  customer: varchar("customer", { length: 100 }),
  pn: varchar("pn", { length: 100 }),
  material: varchar("material", { length: 200 }),

  // Defect
  symptom: varchar("symptom", { length: 500 }),
  detection: varchar("detection", { length: 200 }),
  rate: decimal("rate", { precision: 10, scale: 4 }),
  qty: int("qty"),

  // Description
  description: text("description"),
  evidence: text("evidence"),

  // 8D Process
  cause: text("cause"),
  correctiveActions: text("correctiveActions"),
  trackingProgress: text("trackingProgress"),

  // Supplier (FK reference)
  supplierId: int("supplierId"),
  supplier: varchar("supplier", { length: 200 }),
  supplyFeedback: text("supplyFeedback"),
  statusSupplyFB: mysqlEnum("statusSupplyFB", ["On Time", "Late Replay", "DELAYED", "ONGOING"]),

  // Governance
  owner: varchar("owner", { length: 100 }),
  targetDate: varchar("targetDate", { length: 20 }),
  checkSolution: boolean("checkSolution").default(false),
  qcrNumber: varchar("qcrNumber", { length: 50 }),
  occurrence: varchar("occurrence", { length: 20 }),

  // 8D Dates
  dateDisposition: varchar("dateDisposition", { length: 20 }),
  dateTechAnalysis: varchar("dateTechAnalysis", { length: 20 }),
  dateRootCause: varchar("dateRootCause", { length: 20 }),
  dateCorrectiveAction: varchar("dateCorrectiveAction", { length: 20 }),
  dateValidation: varchar("dateValidation", { length: 20 }),

  // Workflow
  step: mysqlEnum("step", [
    "Aguardando Disposição",
    "Aguardando Análise Técnica",
    "Aguardando Causa Raiz",
    "Aguardando Ação Corretiva",
    "Aguardando Validação de Ação Corretiva",
    "CLOSED"
  ]).default("Aguardando Disposição"),
  status: mysqlEnum("status", ["CLOSED", "ONGOING", "DELAYED", "Waiting for CHK Solution"]).default("ONGOING"),
  closeWeekKey: varchar("closeWeekKey", { length: 10 }),

  // Multi-tenancy
  tenantId: int("tenantId"),

  // Soft delete
  deletedAt: timestamp("deletedAt"),

  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy"),
  updatedBy: int("updatedBy"),
}, (table) => [
  index("idx_defects_supplier").on(table.supplier),
  index("idx_defects_supplier_id").on(table.supplierId),
  index("idx_defects_status").on(table.status),
  index("idx_defects_step").on(table.step),
  index("idx_defects_open_date").on(table.openDate),
  index("idx_defects_year").on(table.year),
  index("idx_defects_week_key").on(table.weekKey),
  index("idx_defects_doc_number").on(table.docNumber),
  index("idx_defects_deleted_at").on(table.deletedAt),
  index("idx_defects_tenant_id").on(table.tenantId),
]);

export type Defect = typeof defects.$inferSelect;
export type InsertDefect = typeof defects.$inferInsert;

// =====================================================
// AUDIT LOG TABLE (Immutable history)
// =====================================================
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  defectId: int("defectId").notNull(),
  userId: int("userId"),
  userName: varchar("userName", { length: 100 }),
  action: mysqlEnum("action", ["CREATE", "UPDATE", "DELETE", "ADVANCE_STEP", "RESTORE", "RBAC_SEED", "RBAC_SET_PERMISSIONS", "RBAC_ASSIGN_ROLE", "RBAC_REMOVE_ROLE", "WORKFLOW_CREATE", "WORKFLOW_NEW_VERSION", "WORKFLOW_CREATE_INSTANCE", "WORKFLOW_ADVANCE", "TENANT_CREATE", "TENANT_ADD_USER", "TENANT_REMOVE_USER", "WEBHOOK_CREATE", "WEBHOOK_DELETE", "WEBHOOK_TEST", "DOCUMENT_CREATE", "DOCUMENT_STATUS_CHANGE", "DOCUMENT_ADD_VERSION", "DOCUMENT_DELETE", "TENANT_SWITCH", "API_KEY_CREATE", "API_KEY_REVOKE"]).notNull(),
  fieldName: varchar("fieldName", { length: 100 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: json("metadata"),
}, (table) => [
  index("idx_audit_logs_defect_id").on(table.defectId),
  index("idx_audit_logs_timestamp").on(table.timestamp),
]);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// =====================================================
// COMMENTS TABLE (Collaboration)
// =====================================================
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  defectId: int("defectId").notNull(),
  userId: int("userId"),
  userName: varchar("userName", { length: 100 }),
  content: text("content").notNull(),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_comments_defect_id").on(table.defectId),
]);

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// =====================================================
// ATTACHMENTS TABLE (Evidence files)
// =====================================================
export const attachments = mysqlTable("attachments", {
  id: int("id").autoincrement().primaryKey(),
  defectId: int("defectId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  uploadedBy: int("uploadedBy"),
  uploadedByName: varchar("uploadedByName", { length: 100 }),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_attachments_defect_id").on(table.defectId),
]);

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;

// =====================================================
// IMPORT LOGS TABLE (Data import tracking)
// =====================================================
export const importLogs = mysqlTable("import_logs", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  totalRows: int("totalRows").notNull(),
  successRows: int("successRows").notNull(),
  errorRows: int("errorRows").notNull(),
  errors: json("errors"),
  importedBy: int("importedBy"),
  importedByName: varchar("importedByName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImportLog = typeof importLogs.$inferSelect;
export type InsertImportLog = typeof importLogs.$inferInsert;

// =====================================================
// SLA CONFIGURATION TABLE
// =====================================================
export const slaConfigs = mysqlTable("sla_configs", {
  id: int("id").autoincrement().primaryKey(),
  step: mysqlEnum("step", [
    "Aguardando Disposição",
    "Aguardando Análise Técnica",
    "Aguardando Causa Raiz",
    "Aguardando Ação Corretiva",
    "Aguardando Validação de Ação Corretiva"
  ]).notNull(),
  severityMg: mysqlEnum("severityMg", ["S", "A", "B", "C"]),
  maxDays: int("maxDays").notNull().default(7),
  warningDays: int("warningDays").notNull().default(5),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_sla_configs_step").on(table.step),
]);

export type SlaConfig = typeof slaConfigs.$inferSelect;
export type InsertSlaConfig = typeof slaConfigs.$inferInsert;

// =====================================================
// NOTIFICATIONS TABLE (Email alerts)
// =====================================================
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  defectId: int("defectId").notNull(),
  type: mysqlEnum("type", ["SLA_WARNING", "SLA_EXCEEDED", "STEP_CHANGE", "SUPPLIER_UPDATE"]).notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientName: varchar("recipientName", { length: 200 }),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["PENDING", "SENT", "FAILED", "READ", "DELETED"]).default("PENDING"),
  sentAt: timestamp("sentAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_notifications_defect_id").on(table.defectId),
  index("idx_notifications_status").on(table.status),
]);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// =====================================================
// NOTIFICATION RECIPIENTS TABLE
// =====================================================
export const notificationRecipients = mysqlTable("notification_recipients", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 200 }),
  notificationType: mysqlEnum("notificationType", ["SLA_WARNING", "SLA_EXCEEDED", "STEP_CHANGE", "SUPPLIER_UPDATE", "ALL"]).notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NotificationRecipient = typeof notificationRecipients.$inferSelect;
export type InsertNotificationRecipient = typeof notificationRecipients.$inferInsert;

// =====================================================
// ROOT CAUSE CATEGORIES TABLE (RCA Analysis)
// =====================================================
export const rootCauseCategories = mysqlTable("root_cause_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  description: text("description"),
  parentId: int("parentId"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RootCauseCategory = typeof rootCauseCategories.$inferSelect;
export type InsertRootCauseCategory = typeof rootCauseCategories.$inferInsert;

// =====================================================
// DRIZZLE RELATIONS (for type-safe joins)
// =====================================================
export const defectsRelations = relations(defects, ({ one, many }) => ({
  supplierRef: one(suppliers, {
    fields: [defects.supplierId],
    references: [suppliers.id],
  }),
  createdByUser: one(users, {
    fields: [defects.createdBy],
    references: [users.id],
  }),
  auditLogs: many(auditLogs),
  comments: many(comments),
  attachments: many(attachments),
  notifications: many(notifications),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  defects: many(defects),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  defect: one(defects, {
    fields: [auditLogs.defectId],
    references: [defects.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  defect: one(defects, {
    fields: [comments.defectId],
    references: [defects.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  defect: one(defects, {
    fields: [attachments.defectId],
    references: [defects.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  defect: one(defects, {
    fields: [notifications.defectId],
    references: [defects.id],
  }),
}));


// =====================================================
// COPQ (Cost of Poor Quality) TABLES
// =====================================================
export const defectCosts = mysqlTable("defect_costs", {
  id: int("id").autoincrement().primaryKey(),
  defectId: int("defectId").notNull(),
  costType: mysqlEnum("costType", [
    "SCRAP","REWORK","REINSPECTION","DOWNTIME","WARRANTY","RETURN",
    "RECALL","COMPLAINT","INSPECTION","TESTING","AUDIT","TRAINING",
    "PLANNING","QUALIFICATION","OTHER"
  ]).notNull(),
  costCategory: mysqlEnum("costCategory", [
    "INTERNAL_FAILURE","EXTERNAL_FAILURE","APPRAISAL","PREVENTION"
  ]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("BRL"),
  description: text("description"),
  evidenceUrl: text("evidenceUrl"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => [
  index("idx_defect_costs_defectId").on(table.defectId),
  index("idx_defect_costs_category").on(table.costCategory),
]);

export type InsertDefectCost = typeof defectCosts.$inferInsert;
export type DefectCost = typeof defectCosts.$inferSelect;

export const costDefaults = mysqlTable("cost_defaults", {
  id: int("id").autoincrement().primaryKey(),
  costType: mysqlEnum("costType", [
    "SCRAP","REWORK","REINSPECTION","DOWNTIME","WARRANTY","RETURN",
    "RECALL","COMPLAINT","INSPECTION","TESTING","AUDIT","TRAINING",
    "PLANNING","QUALIFICATION","OTHER"
  ]).notNull(),
  costCategory: mysqlEnum("costCategory", [
    "INTERNAL_FAILURE","EXTERNAL_FAILURE","APPRAISAL","PREVENTION"
  ]).notNull(),
  defaultAmount: decimal("defaultAmount", { precision: 12, scale: 2 }),
  unitType: mysqlEnum("unitType", ["PER_UNIT","PER_HOUR","PER_INCIDENT","FIXED"]).default("PER_INCIDENT"),
  description: text("description"),
  isActive: boolean("isActive").default(true),
});

export type InsertCostDefault = typeof costDefaults.$inferInsert;
export type CostDefault = typeof costDefaults.$inferSelect;

// =====================================================
// SUPPLIER SCORECARD TABLES
// =====================================================
export const supplierScoreConfigs = mysqlTable("supplier_score_configs", {
  id: int("id").autoincrement().primaryKey(),
  metricKey: varchar("metricKey", { length: 50 }).notNull().unique(),
  metricName: varchar("metricName", { length: 200 }).notNull(),
  description: text("description"),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull().default("1.00"),
  isActive: boolean("isActive").default(true),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InsertSupplierScoreConfig = typeof supplierScoreConfigs.$inferInsert;
export type SupplierScoreConfig = typeof supplierScoreConfigs.$inferSelect;

export const supplierScoreHistory = mysqlTable("supplier_score_history", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull(),
  periodKey: varchar("periodKey", { length: 7 }).notNull(),
  overallScore: decimal("overallScore", { precision: 5, scale: 2 }).notNull(),
  grade: mysqlEnum("grade", ["A", "B", "C", "D"]).notNull(),
  metrics: json("metrics").notNull(),
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
}, (table) => [
  index("idx_score_supplier").on(table.supplierId),
  index("idx_score_period").on(table.periodKey),
]);

export type InsertSupplierScoreHistory = typeof supplierScoreHistory.$inferInsert;
export type SupplierScoreHistory = typeof supplierScoreHistory.$inferSelect;

// =====================================================
// AI SUGGESTIONS TABLE
// =====================================================
export const aiSuggestions = mysqlTable("ai_suggestions", {
  id: int("id").autoincrement().primaryKey(),
  defectId: int("defectId").notNull(),
  type: mysqlEnum("type", ["ROOT_CAUSE","CORRECTIVE_ACTION","RECURRENCE_RISK"]).notNull(),
  suggestion: text("suggestion").notNull(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  suggestedCategory: varchar("suggestedCategory", { length: 200 }),
  accepted: boolean("accepted"),
  acceptedBy: int("acceptedBy"),
  acceptedAt: timestamp("acceptedAt"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_ai_suggestions_defect").on(table.defectId),
  index("idx_ai_suggestions_type").on(table.type),
]);

export type InsertAiSuggestion = typeof aiSuggestions.$inferInsert;
export type AiSuggestion = typeof aiSuggestions.$inferSelect;

// =====================================================
// COPQ RELATIONS
// =====================================================
export const defectCostsRelations = relations(defectCosts, ({ one }) => ({
  defect: one(defects, {
    fields: [defectCosts.defectId],
    references: [defects.id],
  }),
}));

export const aiSuggestionsRelations = relations(aiSuggestions, ({ one }) => ({
  defect: one(defects, {
    fields: [aiSuggestions.defectId],
    references: [defects.id],
  }),
}));


// =====================================================
// 6.2 RBAC TABLES
// =====================================================
export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isSystem: boolean("isSystem").default(false),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const permissions = mysqlTable("permissions", {
  id: int("id").autoincrement().primaryKey(),
  resource: varchar("resource", { length: 100 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  description: text("description"),
});

export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  roleId: int("roleId").notNull(),
  permissionId: int("permissionId").notNull(),
}, (table) => [
  index("idx_rp_role").on(table.roleId),
]);

export const userRoles = mysqlTable("user_roles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  roleId: int("roleId").notNull(),
}, (table) => [
  index("idx_ur_user").on(table.userId),
]);

export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;

// =====================================================
// 6.1 WORKFLOW ENGINE TABLES
// =====================================================
export const workflowDefinitions = mysqlTable("workflow_definitions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  version: int("version").notNull().default(1),
  isDefault: boolean("isDefault").default(false),
  isActive: boolean("isActive").default(true),
  steps: json("steps").notNull(),
  transitions: json("transitions").notNull(),
  metadata: json("metadata"),
  createdBy: int("createdBy"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workflowInstances = mysqlTable("workflow_instances", {
  id: int("id").autoincrement().primaryKey(),
  definitionId: int("definitionId").notNull(),
  defectId: int("defectId").notNull(),
  currentStepId: varchar("currentStepId", { length: 50 }).notNull(),
  stepHistory: json("stepHistory").notNull(),
  status: mysqlEnum("status", ["ACTIVE", "COMPLETED", "CANCELLED", "ON_HOLD"]).default("ACTIVE"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_wf_instance_defect").on(table.defectId),
  index("idx_wf_instance_definition").on(table.definitionId),
]);

export type WorkflowDefinition = typeof workflowDefinitions.$inferSelect;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;

// =====================================================
// 6.3 MULTI-TENANCY TABLES
// =====================================================
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  plan: mysqlEnum("plan", ["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]).default("FREE"),
  maxUsers: int("maxUsers").default(10),
  maxDefects: int("maxDefects").default(500),
  isActive: boolean("isActive").default(true),
  settings: json("settings"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const tenantUsers = mysqlTable("tenant_users", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  role: varchar("role", { length: 100 }).default("user"),
  isActive: boolean("isActive").default(true),
}, (table) => [
  index("idx_tu_tenant").on(table.tenantId),
  index("idx_tu_user").on(table.userId),
]);

export type Tenant = typeof tenants.$inferSelect;

// =====================================================
// 6.4 WEBHOOKS TABLES
// =====================================================
export const webhookConfigs = mysqlTable("webhook_configs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  name: varchar("name", { length: 200 }).notNull(),
  url: text("url").notNull(),
  secret: varchar("secret", { length: 200 }).notNull(),
  events: json("events").notNull(),
  headers: json("headers"),
  isActive: boolean("isActive").default(true),
  retryPolicy: json("retryPolicy"),
  failCount: int("failCount").default(0),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const webhookLogs = mysqlTable("webhook_logs", {
  id: int("id").autoincrement().primaryKey(),
  configId: int("configId").notNull(),
  event: varchar("event", { length: 100 }).notNull(),
  payload: json("payload").notNull(),
  responseStatus: int("responseStatus"),
  responseBody: text("responseBody"),
  attempts: int("attempts").default(0),
  status: mysqlEnum("status", ["PENDING", "SUCCESS", "FAILED", "RETRYING"]).default("PENDING"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => [
  index("idx_whl_config").on(table.configId),
  index("idx_whl_status").on(table.status),
]);

export type WebhookConfig = typeof webhookConfigs.$inferSelect;

// =====================================================
// 6.6 DOCUMENT CONTROL / DMS TABLES
// =====================================================
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  title: varchar("title", { length: 300 }).notNull(),
  documentNumber: varchar("documentNumber", { length: 50 }).notNull(),
  category: mysqlEnum("category", [
    "PROCEDURE", "WORK_INSTRUCTION", "FORM", "TEMPLATE", "SPECIFICATION",
    "REPORT", "CERTIFICATE", "OTHER"
  ]).notNull(),
  currentVersion: int("currentVersion").default(1),
  status: mysqlEnum("status", ["DRAFT", "IN_REVIEW", "APPROVED", "OBSOLETE"]).default("DRAFT"),
  ownerId: int("ownerId").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  expiresAt: timestamp("expiresAt"),
  tags: json("tags"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_doc_tenant").on(table.tenantId),
  index("idx_doc_status").on(table.status),
  index("idx_doc_number").on(table.documentNumber),
]);

export const documentVersions = mysqlTable("document_versions", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  version: int("version").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }),
  changeDescription: text("changeDescription"),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_dv_document").on(table.documentId),
]);

export type Document = typeof documents.$inferSelect;
export type DocumentVersion = typeof documentVersions.$inferSelect;

// =====================================================
// NEW RELATIONS
// =====================================================
export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const workflowInstancesRelations = relations(workflowInstances, ({ one }) => ({
  definition: one(workflowDefinitions, {
    fields: [workflowInstances.definitionId],
    references: [workflowDefinitions.id],
  }),
  defect: one(defects, {
    fields: [workflowInstances.defectId],
    references: [defects.id],
  }),
}));

export const documentsRelations = relations(documents, ({ many }) => ({
  versions: many(documentVersions),
}));

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, {
    fields: [documentVersions.documentId],
    references: [documents.id],
  }),
}));

// =====================================================
// API KEYS TABLE (Public REST API)
// =====================================================
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  createdBy: int("createdBy").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  keyPrefix: varchar("keyPrefix", { length: 8 }).notNull(),
  keyHash: varchar("keyHash", { length: 128 }).notNull(),
  scopes: json("scopes").notNull(), // ["defects:read","defects:write","reports:read"]
  expiresAt: timestamp("expiresAt"),
  lastUsedAt: timestamp("lastUsedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_apikey_tenant").on(table.tenantId),
  index("idx_apikey_prefix").on(table.keyPrefix),
  index("idx_apikey_hash").on(table.keyHash),
]);

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// =====================================================
// PUSH NOTIFICATIONS TABLE (Web Push)
// =====================================================
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tenantId: int("tenantId"),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: varchar("userAgent", { length: 500 }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_push_user").on(table.userId),
  index("idx_push_tenant").on(table.tenantId),
]);

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// =====================================================
// BI EMBEDDED TABLES (Custom Dashboards)
// =====================================================
export const biDashboards = mysqlTable("bi_dashboards", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  layout: json("layout"), // grid layout config
  isDefault: boolean("isDefault").default(false),
  isShared: boolean("isShared").default(false),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_bi_dash_tenant").on(table.tenantId),
  index("idx_bi_dash_user").on(table.userId),
]);

export const biWidgets = mysqlTable("bi_widgets", {
  id: int("id").autoincrement().primaryKey(),
  dashboardId: int("dashboardId").notNull(),
  widgetType: mysqlEnum("widgetType", [
    "KPI_CARD", "BAR_CHART", "LINE_CHART", "PIE_CHART", "DONUT_CHART",
    "RADAR_CHART", "TABLE", "HEATMAP", "GAUGE", "TREND_SPARKLINE"
  ]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  dataSource: mysqlEnum("dataSource", [
    "DEFECT_COUNT", "DEFECT_BY_STATUS", "DEFECT_BY_SEVERITY", "DEFECT_BY_SUPPLIER",
    "DEFECT_BY_PLANT", "DEFECT_TREND", "COPQ_TOTAL", "COPQ_BY_CATEGORY",
    "COPQ_TREND", "SLA_COMPLIANCE", "SLA_VIOLATIONS", "SUPPLIER_SCORES",
    "SUPPLIER_RANKING", "RESOLUTION_TIME", "RECURRENCE_RATE",
    "OPEN_VS_CLOSED", "TOP_ROOT_CAUSES", "MONTHLY_COMPARISON"
  ]).notNull(),
  config: json("config"), // filters, colors, thresholds, etc.
  position: json("position").notNull(), // { x, y, w, h } grid position
  refreshInterval: int("refreshInterval").default(300), // seconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_bi_widget_dash").on(table.dashboardId),
]);

export type BiDashboard = typeof biDashboards.$inferSelect;
export type InsertBiDashboard = typeof biDashboards.$inferInsert;
export type BiWidget = typeof biWidgets.$inferSelect;
export type InsertBiWidget = typeof biWidgets.$inferInsert;

export const biDashboardsRelations = relations(biDashboards, ({ many }) => ({
  widgets: many(biWidgets),
}));

export const biWidgetsRelations = relations(biWidgets, ({ one }) => ({
  dashboard: one(biDashboards, {
    fields: [biWidgets.dashboardId],
    references: [biDashboards.id],
  }),
}));
