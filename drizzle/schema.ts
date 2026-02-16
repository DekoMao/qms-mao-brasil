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
  action: mysqlEnum("action", ["CREATE", "UPDATE", "DELETE", "ADVANCE_STEP", "RESTORE"]).notNull(),
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
