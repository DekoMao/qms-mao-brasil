import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, authorizedProcedure, tenantProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { roles } from "../drizzle/schema";
import { getDb } from "./db";
import {
  getDefects,
  getDefectById,
  getDefectByDocNumber,
  createDefect,
  updateDefect,
  deleteDefect,
  createAuditLog,
  getAuditLogsForDefect,
  createComment,
  getCommentsForDefect,
  createAttachment,
  getAttachmentsForDefect,
  deleteAttachment,
  createImportLog,
  getImportLogs,
  getDefectStats,
  getFilterOptions,
  // Supplier Portal
  getSuppliers,
  getSupplierById,
  getSupplierByAccessCode,
  getSupplierByName,
  createSupplier,
  updateSupplier,
  getDefectsForSupplier,
  // SLA & Notifications
  getSlaConfigs,
  createSlaConfig,
  updateSlaConfig,
  getDefaultSlaForStep,
  createNotification,
  getNotifications,
  updateNotificationStatus,
  getPendingNotifications,
  getNotificationRecipients,
  createNotificationRecipient,
  deleteNotificationRecipient,
  checkSlaViolations,
  // RCA Analysis
  getRootCauseCategories,
  createRootCauseCategory,
  getRootCauseAnalysis,
  // Supplier Merge
  mergeSuppliers,
  // COPQ
  getCostsByDefect,
  addDefectCost,
  updateDefectCost,
  softDeleteDefectCost,
  getCopqDashboard,
  getCostDefaults,
  inferCostCategory,
  // Scorecard
  getAllSupplierScores,
  calculateSupplierScore,
  getScoreConfigs,
  updateScoreConfig,
  getScoreHistory,
  saveScoreHistory,
  initializeScoreConfigs,
  // AI
  getAiSuggestions,
  createAiSuggestion,
  updateAiSuggestion,
  getSimilarDefects,
  // RBAC
  seedRbacDefaults,
  hasPermission,
  getUserRolesWithPermissions,
  assignRoleToUser,
  removeRoleFromUser,
  getAllRoles,
  getAllPermissions,
  getRolePermissions,
  setRolePermissions,
  // Workflow
  seedDefaultWorkflow,
  getWorkflowDefinitions,
  getWorkflowDefinitionById,
  createWorkflowDefinition,
  createNewVersion,
  getWorkflowInstanceByDefect,
  createWorkflowInstance,
  advanceWorkflowInstance,
  // Multi-tenancy
  seedDefaultTenant,
  getTenants,
  getTenantById,
  createTenant,
  getTenantsForUser,
  addUserToTenant,
  removeUserFromTenant,
  // Webhooks
  getWebhookConfigs,
  createWebhookConfig,
  deleteWebhookConfig,
  fireWebhook,
  getWebhookLogs,
  // AI Prediction
  detectRecurrencePatterns,
  getRecurrenceHeatmap,
  // Document Control
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocumentStatus,
  getDocumentVersions,
  addDocumentVersion,
  softDeleteDocument,
  updateActiveTenantId,
  ensureUserInTenant,
  getTenantMembers,
  getAllUsers,
} from "./db";
import { createApiKey, listApiKeys, revokeApiKey } from "./apiKeyDb";
import { getVapidPublicKey, subscribePush, unsubscribePush, getActiveSubscriptions, sendPushToUser } from "./pushNotifications";
import { getBiDashboards, createBiDashboard, updateBiDashboard, deleteBiDashboard, getWidgetsForDashboard, createBiWidget, updateBiWidget, deleteBiWidget, resolveWidgetData } from "./biResolver";
import { calculateStep, calculateResponsible } from "../shared/defectLogic";
import { notifyOwner } from "./_core/notification";

// =====================================================
// DEFECT ROUTER
// =====================================================
const defectRouter = router({
  // List all defects with filters
  list: publicProcedure
    .input(z.object({
      year: z.number().optional(),
      month: z.string().optional(),
      weekKey: z.string().optional(),
      supplier: z.string().optional(),
      symptom: z.string().optional(),
      status: z.string().optional(),
      step: z.string().optional(),
      bucketAging: z.string().optional(),
      search: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      mg: z.string().optional(),
      model: z.string().optional(),
      customer: z.string().optional(),
      owner: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      return getDefects({ ...input, tenantId: ctx.tenantId ?? undefined });
    }),

  // Get single defect by ID
  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const defect = await getDefectById(input.id, ctx.tenantId ?? undefined);
      if (!defect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Defect not found" });
      }
      return defect;
    }),

  // Get defect by docNumber
  byDocNumber: publicProcedure
    .input(z.object({ docNumber: z.string() }))
    .query(async ({ input }) => {
      const defect = await getDefectByDocNumber(input.docNumber);
      if (!defect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Defect not found" });
      }
      return defect;
    }),

  // Create new defect
  create: protectedProcedure
    .input(z.object({
      docNumber: z.string().min(1),
      openDate: z.string(),
      mg: z.enum(["S", "A", "B", "C"]).optional(),
      defectsSeverity: z.string().optional(),
      category: z.string().optional(),
      model: z.string().optional(),
      customer: z.string().optional(),
      pn: z.string().optional(),
      material: z.string().optional(),
      symptom: z.string().optional(),
      detection: z.string().optional(),
      rate: z.string().optional(),
      qty: z.number().optional(),
      description: z.string().optional(),
      evidence: z.string().optional(),
      supplier: z.string().optional(),
      owner: z.string().optional(),
      targetDate: z.string().optional(),
      qcrNumber: z.string().optional(),
      occurrence: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check for duplicate docNumber
      const existing = await getDefectByDocNumber(input.docNumber);
      if (existing) {
        throw new TRPCError({ 
          code: "CONFLICT", 
          message: `Defect with docNumber ${input.docNumber} already exists` 
        });
      }

      const defect = await createDefect({
        ...input,
        openDate: input.openDate,
        targetDate: input.targetDate || null,
        occurrence: input.occurrence || null,
        tenantId: ctx.tenantId,
        rate: input.rate || null,
      }, ctx.user.id);

      // Create audit log
      await createAuditLog({
        defectId: defect!.id,
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        action: "CREATE",
        newValue: JSON.stringify(input),
      });

      // Auto-create workflow instance from default workflow definition
      try {
        const definitions = await getWorkflowDefinitions();
        const defaultDef = definitions.find((d: any) => d.isDefault) || definitions[0];
        if (defaultDef) {
          const steps = (defaultDef.steps as any[]) || [];
          const firstStep = steps.sort((a: any, b: any) => a.order - b.order)[0];
          if (firstStep) {
            await createWorkflowInstance(defect!.id, defaultDef.id, firstStep.id);
          }
        }
      } catch (_e) { /* graceful: workflow instance creation is optional */ }

      // Fire webhook for defect creation
      await fireWebhook("defect.created", { defectId: defect!.id, docNumber: input.docNumber, userId: ctx.user.id });

      return defect;
    }),

  // Update defect
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      docNumber: z.string().optional(),
      openDate: z.string().optional(),
      mg: z.enum(["S", "A", "B", "C"]).nullable().optional(),
      defectsSeverity: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      model: z.string().nullable().optional(),
      customer: z.string().nullable().optional(),
      pn: z.string().nullable().optional(),
      material: z.string().nullable().optional(),
      symptom: z.string().nullable().optional(),
      detection: z.string().nullable().optional(),
      rate: z.string().nullable().optional(),
      qty: z.number().nullable().optional(),
      description: z.string().nullable().optional(),
      evidence: z.string().nullable().optional(),
      cause: z.string().nullable().optional(),
      correctiveActions: z.string().nullable().optional(),
      trackingProgress: z.string().nullable().optional(),
      supplier: z.string().nullable().optional(),
      supplyFeedback: z.string().nullable().optional(),
      statusSupplyFB: z.enum(["On Time", "Late Replay", "DELAYED", "ONGOING"]).nullable().optional(),
      owner: z.string().nullable().optional(),
      targetDate: z.string().nullable().optional(),
      checkSolution: z.boolean().nullable().optional(),
      qcrNumber: z.string().nullable().optional(),
      occurrence: z.string().nullable().optional(),
      dateDisposition: z.string().nullable().optional(),
      dateTechAnalysis: z.string().nullable().optional(),
      dateRootCause: z.string().nullable().optional(),
      dateCorrectiveAction: z.string().nullable().optional(),
      dateValidation: z.string().nullable().optional(),
      status: z.enum(["CLOSED", "ONGOING", "DELAYED", "Waiting for CHK Solution"]).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;

      // Get current defect for audit log
      const currentDefect = await getDefectById(id);
      if (!currentDefect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Defect not found" });
      }

      // Track changed fields for audit
      const changes: { field: string; oldValue: any; newValue: any }[] = [];
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          const oldValue = (currentDefect as any)[key];
          if (oldValue !== value) {
            changes.push({ field: key, oldValue, newValue: value });
          }
        }
      }

      const defect = await updateDefect(id, updateData as any, ctx.user.id);

      // Create audit logs for each changed field
      for (const change of changes) {
        await createAuditLog({
          defectId: id,
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          action: "UPDATE",
          fieldName: change.field,
          oldValue: String(change.oldValue ?? ""),
          newValue: String(change.newValue ?? ""),
        });
      }

      return defect;
    }),

  // Advance workflow step
  advanceStep: protectedProcedure
    .input(z.object({
      id: z.number(),
      step: z.enum([
        "Aguardando Disposição",
        "Aguardando Análise Técnica",
        "Aguardando Causa Raiz",
        "Aguardando Ação Corretiva",
        "Aguardando Validação de Ação Corretiva",
        "CLOSED"
      ]),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, step } = input;
      const currentDefect = await getDefectById(id);
      if (!currentDefect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Defect not found" });
      }

      const today = new Date().toISOString().split("T")[0];
      const updateData: Record<string, any> = {};

      // Set the appropriate date based on the step being completed
      switch (step) {
        case "Aguardando Análise Técnica":
          updateData.dateDisposition = today;
          break;
        case "Aguardando Causa Raiz":
          updateData.dateTechAnalysis = today;
          break;
        case "Aguardando Ação Corretiva":
          updateData.dateRootCause = today;
          break;
        case "Aguardando Validação de Ação Corretiva":
          updateData.dateCorrectiveAction = today;
          break;
        case "CLOSED":
          updateData.dateValidation = today;
          updateData.status = "CLOSED";
          break;
      }

      const defect = await updateDefect(id, updateData, ctx.user.id);

      // Create audit log
      await createAuditLog({
        defectId: id,
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        action: "ADVANCE_STEP",
        fieldName: "step",
        oldValue: currentDefect.step,
        newValue: step,
      });

      // Sync workflow engine instance with defect step
      const STEP_TO_ENGINE: Record<string, string> = {
        "Aguardando Disposição": "disposition",
        "Aguardando Análise Técnica": "tech_analysis",
        "Aguardando Causa Raiz": "root_cause",
        "Aguardando Ação Corretiva": "corrective_action",
        "Aguardando Validação de Ação Corretiva": "validation",
        "CLOSED": "closed",
      };
      try {
        const engineStepId = STEP_TO_ENGINE[step];
        if (engineStepId) {
          const instance = await getWorkflowInstanceByDefect(id);
          if (instance) {
            await advanceWorkflowInstance(instance.id, engineStepId, ctx.user.id);
          }
        }
      } catch (_e) { /* graceful: workflow sync is optional */ }

      // Fire webhooks for step change
      await fireWebhook("defect.status_changed", { defectId: id, oldStep: currentDefect.step, newStep: step, userId: ctx.user.id });

      // RN-IA-01: Auto-trigger AI suggestion when reaching "Aguardando Causa Raiz"
      if (step === "Aguardando Causa Raiz") {
        // Fire-and-forget: don't block the step advance
        (async () => {
          try {
            const existing = await getAiSuggestions(id);
            const hasRootCause = existing.find((s: any) => s.type === "ROOT_CAUSE");
            if (!hasRootCause) {
              const { invokeLLM } = await import("./_core/llm");
              const defectData = await getDefectById(id);
              if (!defectData) return;
              const categories = await getRootCauseCategories();
              const similar = await getSimilarDefects({
                supplier: defectData.supplier || undefined,
                model: defectData.model || undefined,
              });
              const response = await Promise.race([
                invokeLLM({
                  messages: [
                    { role: "system", content: "Você é um engenheiro de qualidade especialista em RCA. Analise o defeito e sugira categoria, raciocínio, ações corretivas e confiança. Responda APENAS em JSON válido." },
                    { role: "user", content: JSON.stringify({ defect: { description: defectData.description, symptom: defectData.symptom, model: defectData.model, supplier: defectData.supplier }, availableCategories: categories.map((c: any) => c.name), historicalDefects: similar.slice(0, 10) }) }
                  ],
                  response_format: { type: "json_schema" as const, json_schema: { name: "root_cause_suggestion", strict: true, schema: { type: "object", properties: { category: { type: "string" }, confidence: { type: "number" }, reasoning: { type: "string" }, suggestedActions: { type: "array", items: { type: "string" } }, similarDefectIds: { type: "array", items: { type: "number" } } }, required: ["category","confidence","reasoning","suggestedActions","similarDefectIds"], additionalProperties: false } } }
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("LLM timeout")), 30000)),
              ]) as any;
              const parsed = JSON.parse(response.choices[0].message.content);
              await createAiSuggestion({
                defectId: id, type: "ROOT_CAUSE", suggestion: parsed.reasoning,
                confidence: String(parsed.confidence), suggestedCategory: parsed.category,
                metadata: { suggestedActions: parsed.suggestedActions, similarDefectIds: parsed.similarDefectIds, promptVersion: "1.0", autoTriggered: true },
              });
            }
          } catch (_e) { /* graceful fallback - RN-IA-06 */ }
        })();
      }

      return defect;
    }),

  // Delete defect
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const defect = await getDefectById(input.id);
      if (!defect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Defect not found" });
      }

      // Create audit log before deletion
      await createAuditLog({
        defectId: input.id,
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        action: "DELETE",
        oldValue: JSON.stringify(defect),
      });

      await deleteDefect(input.id);
      return { success: true };
    }),

  // Get audit logs for a defect
  auditLogs: publicProcedure
    .input(z.object({ defectId: z.number() }))
    .query(async ({ input }) => {
      return getAuditLogsForDefect(input.defectId);
    }),

  // Get statistics (with optional period filter)
  stats: publicProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      return getDefectStats({ ...input, tenantId: ctx.tenantId ?? undefined });
    }),

  // Get filter options
  filterOptions: publicProcedure.query(async ({ ctx }) => {
    return getFilterOptions(ctx.tenantId ?? undefined);
  }),

  // Export filtered defects to Excel (base64)
  exportExcel: protectedProcedure
    .input(z.object({
      year: z.number().optional(),
      month: z.string().optional(),
      weekKey: z.string().optional(),
      supplier: z.string().optional(),
      symptom: z.string().optional(),
      status: z.string().optional(),
      step: z.string().optional(),
      bucketAging: z.string().optional(),
      search: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      mg: z.string().optional(),
      model: z.string().optional(),
      customer: z.string().optional(),
      owner: z.string().optional(),
    }).optional())
    .mutation(async ({ input, ctx }) => {
      // RN-FLT-06: Limit export to 10,000 records
      const MAX_EXPORT = 10000;
      const { data, total } = await getDefects({ ...input, pageSize: MAX_EXPORT, tenantId: ctx.tenantId ?? undefined });
      if (total > MAX_EXPORT) {
        // Still export first 10k but warn in metadata
        console.warn(`Export truncated: ${total} records, exporting first ${MAX_EXPORT}`);
      }
      const XLSX = await import("xlsx");
      const rows = data.map((d: any) => ({
        "Doc N\u00ba": d.docNumber,
        "Data Abertura": d.openDate,
        "Ano": d.year,
        "Semana": d.weekKey,
        "Severidade": d.mg,
        "Categoria": d.category,
        "Modelo": d.model,
        "Cliente": d.customer,
        "PN": d.pn,
        "Material": d.material,
        "Sintoma": d.symptom,
        "Detec\u00e7\u00e3o": d.detection,
        "Qtd": d.qty,
        "Descri\u00e7\u00e3o": d.description,
        "Fornecedor": d.supplier,
        "Status": d.status,
        "Etapa": d.step,
        "Respons\u00e1vel": d.currentResponsible,
        "Aging (dias)": d.aging,
        "Dias Atraso": d.daysLate,
        "Bucket Aging": d.bucketAging,
        "Causa": d.cause,
        "A\u00e7\u00f5es Corretivas": d.correctiveActions,
        "Owner": d.owner,
        "Data Alvo": d.targetDate,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Defeitos");
      const buf = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      return { base64: buf, filename: `QTrack_Defeitos_${new Date().toISOString().slice(0,10)}.xlsx`, totalRecords: total, truncated: total > MAX_EXPORT };
    }),
});

// =====================================================
// COMMENT ROUTER
// =====================================================
const commentRouter = router({
  list: publicProcedure
    .input(z.object({ defectId: z.number() }))
    .query(async ({ input }) => {
      return getCommentsForDefect(input.defectId);
    }),

  create: protectedProcedure
    .input(z.object({
      defectId: z.number(),
      content: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createComment({
        defectId: input.defectId,
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        content: input.content,
      });
      return { id };
    }),
});

// =====================================================
// ATTACHMENT ROUTER
// =====================================================
const attachmentRouter = router({
  list: publicProcedure
    .input(z.object({ defectId: z.number() }))
    .query(async ({ input }) => {
      return getAttachmentsForDefect(input.defectId);
    }),

  create: protectedProcedure
    .input(z.object({
      defectId: z.number(),
      fileName: z.string(),
      fileUrl: z.string(),
      fileKey: z.string(),
      mimeType: z.string().optional(),
      fileSize: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createAttachment({
        ...input,
        uploadedBy: ctx.user.id,
        uploadedByName: ctx.user.name || "Unknown",
      });
      return { id };
    }),

  // Upload file (base64) to S3 and create attachment record
  upload: protectedProcedure
    .input(z.object({
      defectId: z.number(),
      fileName: z.string(),
      fileData: z.string(), // base64 encoded
      mimeType: z.string(),
      fileSize: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { defectId, fileName, fileData, mimeType, fileSize } = input;
      
      // Max 10MB
      if (fileSize > 10 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Arquivo muito grande (max 10MB)" });
      }
      
      const { storagePut } = await import("./storage");
      
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileKey = `defects/${defectId}/evidence/${timestamp}-${randomSuffix}-${sanitizedFileName}`;
      
      const fileBuffer = Buffer.from(fileData, 'base64');
      const { url } = await storagePut(fileKey, fileBuffer, mimeType);
      
      const id = await createAttachment({
        defectId,
        fileName,
        fileUrl: url,
        fileKey,
        mimeType,
        fileSize,
        uploadedBy: ctx.user.id,
        uploadedByName: ctx.user.name || "Unknown",
      });

      await createAuditLog({
        defectId,
        userName: ctx.user.name || "System",
        action: "UPDATE",
        fieldName: "evidence_upload",
        newValue: fileName,
      });

      return { id, fileName, fileUrl: url, fileKey, mimeType, fileSize };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteAttachment(input.id);
      return { success: true };
    }),
});

// =====================================================
// IMPORT ROUTER
// =====================================================
const importRouter = router({
  logs: publicProcedure.query(async () => {
    return getImportLogs();
  }),

  importData: protectedProcedure
    .input(z.object({
      data: z.array(z.record(z.string(), z.any())),
    }))
    .mutation(async ({ input, ctx }) => {
      const results: { row: number; status: "OK" | "ERROR"; message?: string }[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < input.data.length; i++) {
        const row = input.data[i];
        try {
          // Check for duplicate
          if (row.docNumber) {
            const existing = await getDefectByDocNumber(String(row.docNumber));
            if (existing) {
              results.push({ row: i + 1, status: "ERROR", message: `Duplicate docNumber: ${row.docNumber}` });
              errorCount++;
              continue;
            }
          }

          // Create defect
          await createDefect({
            docNumber: String(row.docNumber || `AUTO-${Date.now()}-${i}`),
            openDate: String(row.openDate || new Date().toISOString().split("T")[0]),
            mg: row.mg as "S" | "A" | "B" | "C" | null,
            defectsSeverity: row.defectsSeverity as string | null,
            category: row.category as string | null,
            model: row.model as string | null,
            customer: row.customer as string | null,
            pn: row.pn as string | null,
            material: row.material as string | null,
            symptom: row.symptom as string | null,
            detection: row.detection as string | null,
            rate: row.rate as string | null,
            qty: row.qty ? parseInt(String(row.qty)) : null,
            description: row.description as string | null,
            evidence: row.evidence as string | null,
            cause: row.cause as string | null,
            correctiveActions: row.correctiveActions as string | null,
            trackingProgress: row.trackingProgress as string | null,
            supplier: row.supplier as string | null,
            supplyFeedback: row.supplyFeedback as string | null,
            statusSupplyFB: row.statusSupplyFB as "On Time" | "Late Replay" | "DELAYED" | "ONGOING" | null,
            owner: row.owner as string | null,
            targetDate: row.targetDate as string | null,
            checkSolution: row.checkSolution === "true" || row.checkSolution === true,
            qcrNumber: row.qcrNumber as string | null,
            occurrence: row.occurrence as string | null,
            dateDisposition: row.dateDisposition as string | null,
            dateTechAnalysis: row.dateTechAnalysis as string | null,
            dateRootCause: row.dateRootCause as string | null,
            dateCorrectiveAction: row.dateCorrectiveAction as string | null,
            dateValidation: row.dateValidation as string | null,
            status: row.status as "CLOSED" | "ONGOING" | "DELAYED" | "Waiting for CHK Solution" | null,
          }, ctx.user.id);

          results.push({ row: i + 1, status: "OK" });
          successCount++;
        } catch (error: any) {
          results.push({ row: i + 1, status: "ERROR", message: error.message });
          errorCount++;
        }
      }

      // Create import log
      await createImportLog({
        fileName: "Manual Import",
        totalRows: input.data.length,
        successRows: successCount,
        errorRows: errorCount,
        errors: results.filter(r => r.status === "ERROR"),
        importedBy: ctx.user.id,
        importedByName: ctx.user.name || "Unknown",
      });

      return { results, successCount, errorCount };
    }),
});

// =====================================================
// SUPPLIER ROUTER (Portal do Fornecedor)
// =====================================================
const supplierRouter = router({
  // List all suppliers (admin only)
  list: protectedProcedure.query(async () => {
    return getSuppliers();
  }),

  // Get supplier by ID
  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const supplier = await getSupplierById(input.id);
      if (!supplier) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });
      }
      return supplier;
    }),

  // Supplier login with access code
  loginWithCode: publicProcedure
    .input(z.object({ accessCode: z.string() }))
    .mutation(async ({ input }) => {
      const supplier = await getSupplierByAccessCode(input.accessCode);
      if (!supplier) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid access code" });
      }
      return { supplier, token: `supplier-${supplier.id}-${Date.now()}` };
    }),

  // Get defects for supplier (supplier portal)
  myDefects: publicProcedure
    .input(z.object({ supplierName: z.string() }))
    .query(async ({ input, ctx }) => {
      return getDefectsForSupplier(input.supplierName, ctx.tenantId ?? undefined);
    }),

  // Create new supplier
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      code: z.string().optional(),
      email: z.string().email().optional(),
      contactName: z.string().optional(),
      phone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Check for duplicate name
      const existing = await getSupplierByName(input.name);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Supplier already exists" });
      }
      return createSupplier(input);
    }),

  // Update supplier
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      code: z.string().optional(),
      email: z.string().email().optional(),
      contactName: z.string().optional(),
      phone: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateSupplier(id, data);
    }),

  // Regenerate access code
  regenerateAccessCode: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const newCode = `SUP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      return updateSupplier(input.id, { accessCode: newCode } as any);
    }),

  // Supplier updates defect (limited fields)
  updateDefect: publicProcedure
    .input(z.object({
      defectId: z.number(),
      supplierName: z.string(),
      cause: z.string().optional(),
      correctiveActions: z.string().optional(),
      supplyFeedback: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { defectId, supplierName, ...updateData } = input;
      
      // Verify supplier owns this defect
      const defect = await getDefectById(defectId);
      if (!defect || defect.supplier !== supplierName) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const updated = await updateDefect(defectId, updateData);

      // Create audit log
      await createAuditLog({
        defectId,
        userName: `Supplier: ${supplierName}`,
        action: "UPDATE",
        fieldName: "supplier_update",
        newValue: JSON.stringify(updateData),
      });

      return updated;
    }),

  // Merge suppliers (consolidate duplicates)
  merge: protectedProcedure
    .input(z.object({
      targetId: z.number(),
      sourceIds: z.array(z.number()).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await mergeSuppliers(input.targetId, input.sourceIds, ctx.user.id);
      
      // Create audit log for each merged supplier
      await createAuditLog({
        defectId: 0,
        userName: ctx.user.name || "System",
        action: "UPDATE",
        fieldName: "supplier_merge",
        newValue: JSON.stringify(result),
      });
      
      return result;
    }),

  // Supplier uploads attachment
  uploadAttachment: publicProcedure
    .input(z.object({
      defectId: z.number(),
      supplierName: z.string(),
      fileName: z.string(),
      fileData: z.string(), // base64 encoded
      mimeType: z.string(),
      fileSize: z.number(),
    }))
    .mutation(async ({ input }) => {
      const { defectId, supplierName, fileName, fileData, mimeType, fileSize } = input;
      
      // Verify supplier owns this defect
      const defect = await getDefectById(defectId);
      if (!defect || defect.supplier !== supplierName) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Import storage helper
      const { storagePut } = await import("./storage");
      
      // Generate unique file key
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileKey = `defects/${defectId}/supplier-attachments/${timestamp}-${randomSuffix}-${sanitizedFileName}`;
      
      // Convert base64 to buffer
      const fileBuffer = Buffer.from(fileData, 'base64');
      
      // Upload to S3
      const { url } = await storagePut(fileKey, fileBuffer, mimeType);
      
      // Save attachment record to database
      const attachmentId = await createAttachment({
        defectId,
        fileName,
        fileUrl: url,
        fileKey,
        mimeType,
        fileSize,
        uploadedByName: `Supplier: ${supplierName}`,
      });

      // Create audit log
      await createAuditLog({
        defectId,
        userName: `Supplier: ${supplierName}`,
        action: "UPDATE",
        fieldName: "attachment_upload",
        newValue: fileName,
      });

      return {
        id: attachmentId,
        fileName,
        fileUrl: url,
        fileKey,
        mimeType,
        fileSize,
      };
    }),
});

// =====================================================
// SLA ROUTER
// =====================================================
const slaRouter = router({
  // Get all SLA configs
  list: protectedProcedure.query(async () => {
    return getSlaConfigs();
  }),

  // Create SLA config
  create: protectedProcedure
    .input(z.object({
      step: z.enum([
        "Aguardando Disposição",
        "Aguardando Análise Técnica",
        "Aguardando Causa Raiz",
        "Aguardando Ação Corretiva",
        "Aguardando Validação de Ação Corretiva"
      ]),
      severityMg: z.enum(["S", "A", "B", "C"]).optional(),
      maxDays: z.number().min(1),
      warningDays: z.number().min(1),
    }))
    .mutation(async ({ input }) => {
      return createSlaConfig(input);
    }),

  // Update SLA config
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      maxDays: z.number().min(1).optional(),
      warningDays: z.number().min(1).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateSlaConfig(id, data);
      return { success: true };
    }),

  // Check SLA violations
  checkViolations: protectedProcedure.query(async ({ ctx }) => {
    return checkSlaViolations(ctx.tenantId ?? undefined);
  }),
});

// =====================================================
// NOTIFICATION ROUTER
// =====================================================
const notificationRouter = router({
  // Get notifications
  list: protectedProcedure
    .input(z.object({ defectId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getNotifications(input?.defectId);
    }),

  // Get pending notifications
  pending: protectedProcedure.query(async () => {
    return getPendingNotifications();
  }),

  // Get recipients
  recipients: protectedProcedure.query(async () => {
    return getNotificationRecipients();
  }),

  // Add recipient
  addRecipient: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      notificationType: z.enum(["SLA_WARNING", "SLA_EXCEEDED", "STEP_CHANGE", "SUPPLIER_UPDATE", "ALL"]),
    }))
    .mutation(async ({ input }) => {
      return createNotificationRecipient(input);
    }),

  // Remove recipient
  removeRecipient: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteNotificationRecipient(input.id);
      return { success: true };
    }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await updateNotificationStatus(input.id, "READ");
      return { success: true };
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure.mutation(async () => {
    const notifications = await getNotifications();
    for (const n of notifications) {
      if (n.status !== "READ") {
        await updateNotificationStatus(n.id, "READ");
      }
    }
    return { success: true };
  }),

  // Delete notification
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await updateNotificationStatus(input.id, "DELETED");
      return { success: true };
    }),

   // Send SLA notifications (called by cron job or manually)
  sendSlaAlerts: protectedProcedure.mutation(async ({ ctx }) => {
    const violations = await checkSlaViolations(ctx.tenantId ?? undefined);
    const recipients = await getNotificationRecipients();
    const sentNotifications: number[] = [];
    const ownerNotifications: string[] = [];
    for (const violation of violations) {
      const notificationType = violation.violationType === "EXCEEDED" ? "SLA_EXCEEDED" : "SLA_WARNING";
      const relevantRecipients = recipients.filter(
        (r: any) => r.notificationType === notificationType || r.notificationType === "ALL"
      );
      const subject = violation.violationType === "EXCEEDED"
        ? `[URGENTE] SLA Excedido - Caso ${violation.defect.docNumber}`
        : `[AVISO] SLA Próximo do Limite - Caso ${violation.defect.docNumber}`;
      const body = [
        `Caso: ${violation.defect.docNumber}`,
        `Fornecedor: ${violation.defect.supplier || "N/A"}`,
        `Etapa Atual: ${violation.defect.step}`,
        `Dias na Etapa: ${violation.daysInStep}`,
        `SLA Máximo: ${violation.slaConfig.maxDays} dias`,
        `Status: ${violation.violationType === "EXCEEDED" ? "EXCEDIDO" : "AVISO"}`,
        `Por favor, tome as ações necessárias.`,
      ].join("\n");
      for (const recipient of relevantRecipients) {
        const notificationId = await createNotification({
          defectId: violation.defect.id,
          type: notificationType,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject,
          body,
        });
        sentNotifications.push(notificationId);
        // Mark as SENT
        await updateNotificationStatus(notificationId, "SENT");
      }
      ownerNotifications.push(`${subject}\n${body}`);
    }
    // Dispatch aggregated notification to project owner
    if (ownerNotifications.length > 0) {
      try {
        await notifyOwner({
          title: `QTrack: ${violations.length} violações de SLA detectadas`,
          content: ownerNotifications.slice(0, 10).join("\n\n---\n\n"),
        });
      } catch (_e) { /* notifyOwner is best-effort */ }
    }
    return {
      violationsFound: violations.length,
      notificationsCreated: sentNotifications.length,
    };
  }),

  // Send notification on step change
  notifyStepChange: protectedProcedure
    .input(z.object({
      defectId: z.number(),
      docNumber: z.string(),
      oldStep: z.string(),
      newStep: z.string(),
      supplier: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const recipients = await getNotificationRecipients();
      const stepRecipients = recipients.filter(
        (r: any) => r.notificationType === "STEP_CHANGE" || r.notificationType === "ALL"
      );
      const subject = `[QTrack] Avanço de Etapa - Caso ${input.docNumber}`;
      const body = [
        `Caso: ${input.docNumber}`,
        `Fornecedor: ${input.supplier || "N/A"}`,
        `Etapa Anterior: ${input.oldStep}`,
        `Nova Etapa: ${input.newStep}`,
      ].join("\n");
      for (const recipient of stepRecipients) {
        const nId = await createNotification({
          defectId: input.defectId,
          type: "STEP_CHANGE",
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject,
          body,
        });
        await updateNotificationStatus(nId, "SENT");
      }
      try {
        await notifyOwner({ title: subject, content: body });
      } catch (_e) { /* best-effort */ }
      return { sent: stepRecipients.length };
    }),

  // Send notification on supplier feedback update
  notifySupplierUpdate: protectedProcedure
    .input(z.object({
      defectId: z.number(),
      docNumber: z.string(),
      supplier: z.string().optional(),
      updateType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const recipients = await getNotificationRecipients();
      const relevantRecipients = recipients.filter(
        (r: any) => r.notificationType === "SUPPLIER_UPDATE" || r.notificationType === "ALL"
      );
      const subject = `[QTrack] Atualização do Fornecedor - Caso ${input.docNumber}`;
      const body = [
        `Caso: ${input.docNumber}`,
        `Fornecedor: ${input.supplier || "N/A"}`,
        `Tipo de Atualização: ${input.updateType}`,
      ].join("\n");
      for (const recipient of relevantRecipients) {
        const nId = await createNotification({
          defectId: input.defectId,
          type: "SUPPLIER_UPDATE",
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject,
          body,
        });
        await updateNotificationStatus(nId, "SENT");
      }
      try {
        await notifyOwner({ title: subject, content: body });
      } catch (_e) { /* best-effort */ }
      return { sent: relevantRecipients.length };
    }),
});

// =====================================================
// RCA (Root Cause Analysis) ROUTER
// =====================================================
const rcaRouter = router({
  // Get RCA analysis data (with optional period filter)
  analysis: publicProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      return getRootCauseAnalysis({ ...input, tenantId: ctx.tenantId ?? undefined });
    }),

  // Get categories
  categories: publicProcedure.query(async () => {
    return getRootCauseCategories();
  }),

  // Create category
  createCategory: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      parentId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return createRootCauseCategory(input);
    }),
});

/// =====================================================
// COPQ (Cost of Poor Quality) ROUTER
// =====================================================
const copqRouter = router({
  byDefect: protectedProcedure
    .input(z.object({ defectId: z.number() }))
    .query(async ({ input }) => {
      return getCostsByDefect(input.defectId);
    }),

  addCost: protectedProcedure
    .input(z.object({
      defectId: z.number(),
      costType: z.enum(["SCRAP","REWORK","REINSPECTION","DOWNTIME","WARRANTY","RETURN","RECALL","COMPLAINT","INSPECTION","TESTING","AUDIT","TRAINING","PLANNING","QUALIFICATION","OTHER"]),
      amount: z.number().positive(),
      currency: z.string().length(3).default("BRL"),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const costCategory = inferCostCategory(input.costType) as any;
      const id = await addDefectCost({
        defectId: input.defectId,
        costType: input.costType,
        costCategory,
        amount: input.amount.toFixed(2),
        currency: input.currency,
        description: input.description || null,
        createdBy: ctx.user?.id || null,
      });
      await createAuditLog({
        defectId: input.defectId,
        userId: ctx.user?.id || null,
        userName: ctx.user?.name || "Sistema",
        action: "CREATE",
        fieldName: "cost",
        oldValue: null,
        newValue: `${input.costType}: R$ ${input.amount.toFixed(2)}`,
      });
      return { id };
    }),

  updateCost: protectedProcedure
    .input(z.object({
      id: z.number(),
      amount: z.number().positive().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const data: any = {};
      if (input.amount !== undefined) data.amount = input.amount.toFixed(2);
      if (input.description !== undefined) data.description = input.description;
      await updateDefectCost(input.id, data);
      return { success: true };
    }),

  deleteCost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await softDeleteDefectCost(input.id);
      return { success: true };
    }),

  dashboard: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      supplierId: z.number().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      return getCopqDashboard({ ...input, tenantId: ctx.tenantId ?? undefined });
    }),

  defaults: protectedProcedure.query(async () => {
    return getCostDefaults();
  }),
});

// =====================================================
// SUPPLIER SCORECARD ROUTER
// =====================================================
const scorecardRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    await initializeScoreConfigs();
    return getAllSupplierScores(ctx.tenantId ?? undefined);
  }),

  bySupplier: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input, ctx }) => {
      const current = await calculateSupplierScore(input.supplierId, ctx.tenantId ?? undefined);
      const history = await getScoreHistory(input.supplierId, 12);
      const historyScores = history.map((h: any) => parseFloat(h.overallScore));
      const avgLast3 = historyScores.length >= 3
        ? historyScores.slice(0, 3).reduce((a: number, b: number) => a + b, 0) / 3
        : null;
      let trend: "UP" | "DOWN" | "STABLE" = "STABLE";
      if (avgLast3 !== null) {
        if (current.overallScore > avgLast3 + 5) trend = "UP";
        else if (current.overallScore < avgLast3 - 5) trend = "DOWN";
      }
      return { current, history, trend };
    }),

  recalculate: protectedProcedure.mutation(async () => {
    const allSuppliers = await getSuppliers();
    const now = new Date();
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    for (const supplier of allSuppliers) {
      const score = await calculateSupplierScore(supplier.id);
      await saveScoreHistory({
        supplierId: supplier.id,
        periodKey,
        overallScore: score.overallScore.toFixed(2),
        grade: score.grade,
        metrics: score.metrics,
      });
    }
    return { recalculated: allSuppliers.length };
  }),

  configs: protectedProcedure.query(async () => {
    await initializeScoreConfigs();
    return getScoreConfigs();
  }),

  updateConfig: protectedProcedure
    .input(z.object({ id: z.number(), weight: z.number().min(0).max(10) }))
    .mutation(async ({ input }) => {
      await updateScoreConfig(input.id, { weight: input.weight.toFixed(2) });
      return { success: true };
    }),
});

// =====================================================
// AI ROUTER
// =====================================================
const aiRouter = router({
  suggestRootCause: protectedProcedure
    .input(z.object({ defectId: z.number(), force: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      // Check cache (RN-IA-05)
      if (!input.force) {
        const existing = await getAiSuggestions(input.defectId);
        const rootCauseSuggestion = existing.find((s: any) => s.type === "ROOT_CAUSE");
        if (rootCauseSuggestion) return rootCauseSuggestion;
      }
      // Get defect data
      const defect = await getDefectById(input.defectId);
      if (!defect) throw new TRPCError({ code: "NOT_FOUND", message: "Defeito não encontrado" });
      // Get categories and similar defects
      const categories = await getRootCauseCategories();
      const similar = await getSimilarDefects({
        supplier: defect.supplier || undefined,
        model: defect.model || undefined,
      });
      try {
        const { invokeLLM } = await import("./_core/llm");
        const response = await Promise.race([
          invokeLLM({
            messages: [
              {
                role: "system",
                content: `Você é um engenheiro de qualidade especialista em análise de causa raiz (RCA) para defeitos de fornecedores na indústria de manufatura. Analise o defeito descrito e:\n1. Sugira a categoria de causa raiz mais provável\n2. Explique seu raciocínio em 2-3 frases\n3. Sugira 2-3 ações corretivas baseadas em defeitos similares\n4. Avalie sua confiança de 0.0 a 1.0\nResponda APENAS em JSON válido.`
              },
              {
                role: "user",
                content: JSON.stringify({
                  defect: { description: defect.description, symptom: defect.symptom, model: defect.model, supplier: defect.supplier },
                  availableCategories: categories.map((c: any) => c.name),
                  historicalDefects: similar.slice(0, 10),
                })
              }
            ],
            response_format: {
              type: "json_schema" as const,
              json_schema: {
                name: "root_cause_suggestion",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    confidence: { type: "number" },
                    reasoning: { type: "string" },
                    suggestedActions: { type: "array", items: { type: "string" } },
                    similarDefectIds: { type: "array", items: { type: "number" } },
                  },
                  required: ["category","confidence","reasoning","suggestedActions","similarDefectIds"],
                  additionalProperties: false,
                }
              }
            }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("LLM timeout")), 30000)),
        ]) as any;
        const parsed = JSON.parse(response.choices[0].message.content);
        const suggestionId = await createAiSuggestion({
          defectId: input.defectId,
          type: "ROOT_CAUSE",
          suggestion: parsed.reasoning,
          confidence: String(parsed.confidence),
          suggestedCategory: parsed.category,
          metadata: {
            suggestedActions: parsed.suggestedActions,
            similarDefectIds: parsed.similarDefectIds,
            promptVersion: "1.0",
          },
        });
        const suggestions = await getAiSuggestions(input.defectId);
        return suggestions[0];
      } catch (_err) {
        return { error: "timeout", suggestion: null };
      }
    }),

  respondToSuggestion: protectedProcedure
    .input(z.object({ suggestionId: z.number(), accepted: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await updateAiSuggestion(input.suggestionId, {
        accepted: input.accepted,
        acceptedBy: ctx.user?.id || null,
        acceptedAt: new Date(),
      });
      return { success: true };
    }),

  byDefect: protectedProcedure
    .input(z.object({ defectId: z.number() }))
    .query(async ({ input }) => {
      return getAiSuggestions(input.defectId);
    }),
});

// =====================================================
// RBAC ROUTER
// =====================================================
const rbacRouter = router({
  seed: authorizedProcedure("rbac", "manage").mutation(async ({ ctx }) => {
    await seedRbacDefaults();
    await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "System", action: "RBAC_SEED", fieldName: "rbac", oldValue: null, newValue: "seeded" });
    return { success: true };
  }),
  roles: protectedProcedure.query(async () => getAllRoles()),
  permissions: protectedProcedure.query(async () => getAllPermissions()),
  rolePermissions: protectedProcedure
    .input(z.object({ roleId: z.number() }))
    .query(async ({ input }) => getRolePermissions(input.roleId)),
  setRolePermissions: authorizedProcedure("rbac", "manage")
    .input(z.object({ roleId: z.number(), permissionIds: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      await setRolePermissions(input.roleId, input.permissionIds);
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "RBAC_SET_PERMISSIONS", fieldName: "rolePermissions", oldValue: null, newValue: JSON.stringify({ roleId: input.roleId, permissionIds: input.permissionIds }) });
      return { success: true };
    }),
  userRoles: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => getUserRolesWithPermissions(input.userId)),
  myRoles: protectedProcedure.query(async ({ ctx }) => getUserRolesWithPermissions(ctx.user.id)),
  assignRole: authorizedProcedure("rbac", "manage")
    .input(z.object({ userId: z.number(), roleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assignRoleToUser(input.userId, input.roleId);
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "RBAC_ASSIGN_ROLE", fieldName: "userRole", oldValue: null, newValue: JSON.stringify({ targetUserId: input.userId, roleId: input.roleId }) });
      return { success: true };
    }),
  removeRole: authorizedProcedure("rbac", "manage")
    .input(z.object({ userId: z.number(), roleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await removeRoleFromUser(input.userId, input.roleId);
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "RBAC_REMOVE_ROLE", fieldName: "userRole", oldValue: JSON.stringify({ targetUserId: input.userId, roleId: input.roleId }), newValue: null });
      return { success: true };
    }),
  check: protectedProcedure
    .input(z.object({ resource: z.string(), action: z.string() }))
    .query(async ({ input, ctx }) => {
      const allowed = await hasPermission(ctx.user.id, input.resource, input.action);
      return { allowed };
    }),
  createRole: authorizedProcedure("rbac", "manage")
    .input(z.object({ name: z.string().min(2).max(100), description: z.string().optional(), cloneFromRoleId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(roles).values({ name: input.name, description: input.description || null, isSystem: false }).$returningId();
      const newRoleId = result.id;
      // Clone permissions from another role if specified
      if (input.cloneFromRoleId) {
        const sourcePerms = await getRolePermissions(input.cloneFromRoleId);
        if (sourcePerms.length > 0) {
          await setRolePermissions(newRoleId, sourcePerms.map((p: any) => p.id));
        }
      }
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "RBAC_ROLE_CREATE" as any, fieldName: "role", oldValue: null, newValue: JSON.stringify({ id: newRoleId, name: input.name, clonedFrom: input.cloneFromRoleId }) });
      return { success: true, id: newRoleId };
    }),
  updateRole: authorizedProcedure("rbac", "manage")
    .input(z.object({ roleId: z.number(), name: z.string().min(2).max(100).optional(), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const updates: Record<string, any> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (Object.keys(updates).length > 0) {
        await db.update(roles).set(updates).where(eq(roles.id, input.roleId));
      }
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "RBAC_ROLE_UPDATE" as any, fieldName: "role", oldValue: null, newValue: JSON.stringify({ roleId: input.roleId, ...updates }) });
      return { success: true };
    }),
  deleteRole: authorizedProcedure("rbac", "manage")
    .input(z.object({ roleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Don't allow deleting system roles
      const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId));
      if (role?.isSystem) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete system roles" });
      await db.update(roles).set({ deletedAt: new Date() }).where(eq(roles.id, input.roleId));
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "RBAC_ROLE_DELETE" as any, fieldName: "role", oldValue: JSON.stringify({ roleId: input.roleId, name: role?.name }), newValue: null });
      return { success: true };
    }),
});

// =====================================================
// WORKFLOW ROUTER
// =====================================================
const workflowRouter = router({
  seed: authorizedProcedure("workflow", "manage").mutation(async ({ ctx }) => {
    const result = await seedDefaultWorkflow();
    await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "System", action: "WORKFLOW_CREATE", fieldName: "workflow", oldValue: null, newValue: "seeded" });
    return result;
  }),
  seedAll: authorizedProcedure("workflow", "manage").mutation(async ({ ctx }) => {
    // Seed 8D default
    await seedDefaultWorkflow();
    // Seed SCAR template
    const scarSteps = [
      { id: "detection", name: "Detecção e Registro", order: 1, responsible: "SQA" as const, requiredFields: ["description"], slaDefault: 1 },
      { id: "containment", name: "Ação de Contenção", order: 2, responsible: "SUPPLIER" as const, requiredFields: ["correctiveActions"], slaDefault: 3 },
      { id: "root_cause", name: "Análise de Causa Raiz", order: 3, responsible: "SUPPLIER" as const, requiredFields: ["cause"], slaDefault: 7 },
      { id: "corrective", name: "Ação Corretiva", order: 4, responsible: "SUPPLIER" as const, requiredFields: ["correctiveActions"], slaDefault: 14 },
      { id: "verification", name: "Verificação de Eficácia", order: 5, responsible: "SQA" as const, requiredFields: ["checkSolution"], slaDefault: 30 },
      { id: "closed", name: "CLOSED", order: 6, responsible: "SQA" as const, requiredFields: [], slaDefault: 0 },
    ];
    const scarTransitions = [
      { fromStepId: "detection", toStepId: "containment", conditions: ["description"], actions: ["notify_supplier"] },
      { fromStepId: "containment", toStepId: "root_cause", conditions: ["correctiveActions"], actions: ["notify_sqa"] },
      { fromStepId: "root_cause", toStepId: "corrective", conditions: ["cause"], actions: ["notify_sqa"] },
      { fromStepId: "corrective", toStepId: "verification", conditions: ["correctiveActions"], actions: ["notify_sqa"] },
      { fromStepId: "verification", toStepId: "closed", conditions: ["checkSolution"], actions: ["close_defect"] },
    ];
    try { await createWorkflowDefinition({ name: "SCAR (Supplier Corrective Action Request)", description: "Workflow SCAR para ações corretivas de fornecedor com verificação de eficácia", steps: scarSteps, transitions: scarTransitions, metadata: { tags: ["SCAR", "supplier"], industry: "manufacturing" }, createdBy: ctx.user.id }); } catch {}
    // Seed Fast Track template
    const ftSteps = [
      { id: "registro", name: "Registro Rápido", order: 1, responsible: "SQA" as const, requiredFields: ["description"], slaDefault: 1 },
      { id: "acao_imediata", name: "Ação Imediata", order: 2, responsible: "SUPPLIER" as const, requiredFields: ["correctiveActions"], slaDefault: 2 },
      { id: "validacao", name: "Validação", order: 3, responsible: "SQA" as const, requiredFields: ["checkSolution"], slaDefault: 1 },
      { id: "closed", name: "CLOSED", order: 4, responsible: "SQA" as const, requiredFields: [], slaDefault: 0 },
    ];
    const ftTransitions = [
      { fromStepId: "registro", toStepId: "acao_imediata", conditions: ["description"], actions: ["notify_supplier"] },
      { fromStepId: "acao_imediata", toStepId: "validacao", conditions: ["correctiveActions"], actions: ["notify_sqa"] },
      { fromStepId: "validacao", toStepId: "closed", conditions: ["checkSolution"], actions: ["close_defect"] },
    ];
    try { await createWorkflowDefinition({ name: "Fast Track", description: "Workflow simplificado para defeitos de baixa severidade (MG C/B)", steps: ftSteps, transitions: ftTransitions, metadata: { tags: ["fast-track", "low-severity"], industry: "manufacturing" }, createdBy: ctx.user.id }); } catch {}
    // Seed Investigação Detalhada template
    const invSteps = [
      { id: "triagem", name: "Triagem Inicial", order: 1, responsible: "SQA" as const, requiredFields: ["description"], slaDefault: 1 },
      { id: "coleta_dados", name: "Coleta de Dados e Evidências", order: 2, responsible: "SQA" as const, requiredFields: ["evidence"], slaDefault: 5 },
      { id: "analise_tecnica", name: "Análise Técnica Aprofundada", order: 3, responsible: "BOTH" as const, requiredFields: ["dateTechAnalysis"], slaDefault: 10 },
      { id: "causa_raiz", name: "Determinação de Causa Raiz (5 Porquês)", order: 4, responsible: "SUPPLIER" as const, requiredFields: ["cause"], slaDefault: 10 },
      { id: "plano_acao", name: "Plano de Ação Corretiva", order: 5, responsible: "SUPPLIER" as const, requiredFields: ["correctiveActions"], slaDefault: 15 },
      { id: "implementacao", name: "Implementação das Ações", order: 6, responsible: "SUPPLIER" as const, requiredFields: ["dateCorrectiveAction"], slaDefault: 30 },
      { id: "verificacao", name: "Verificação e Validação", order: 7, responsible: "SQA" as const, requiredFields: ["checkSolution"], slaDefault: 10 },
      { id: "closed", name: "CLOSED", order: 8, responsible: "SQA" as const, requiredFields: [], slaDefault: 0 },
    ];
    const invTransitions = [
      { fromStepId: "triagem", toStepId: "coleta_dados", conditions: ["description"], actions: ["notify_sqa"] },
      { fromStepId: "coleta_dados", toStepId: "analise_tecnica", conditions: ["evidence"], actions: ["notify_supplier"] },
      { fromStepId: "analise_tecnica", toStepId: "causa_raiz", conditions: ["dateTechAnalysis"], actions: ["notify_supplier"] },
      { fromStepId: "causa_raiz", toStepId: "plano_acao", conditions: ["cause"], actions: ["notify_sqa"] },
      { fromStepId: "plano_acao", toStepId: "implementacao", conditions: ["correctiveActions"], actions: ["notify_sqa"] },
      { fromStepId: "implementacao", toStepId: "verificacao", conditions: ["dateCorrectiveAction"], actions: ["notify_sqa"] },
      { fromStepId: "verificacao", toStepId: "closed", conditions: ["checkSolution"], actions: ["close_defect"] },
    ];
    try { await createWorkflowDefinition({ name: "Investigação Detalhada", description: "Workflow completo para investigação aprofundada de defeitos críticos (MG S/A)", steps: invSteps, transitions: invTransitions, metadata: { tags: ["investigation", "critical", "5-whys"], industry: "manufacturing" }, createdBy: ctx.user.id }); } catch {}
    await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "System", action: "WORKFLOW_CREATE", fieldName: "workflow", oldValue: null, newValue: "seeded_all_templates" });
    return { success: true, templates: ["8D Padrão", "SCAR", "Fast Track", "Investigação Detalhada"] };
  }),
  definitions: protectedProcedure.query(async () => getWorkflowDefinitions()),
  definitionById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => getWorkflowDefinitionById(input.id)),
  create: authorizedProcedure("workflow", "manage")
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      steps: z.array(z.object({
        id: z.string(), name: z.string(), order: z.number(),
        responsible: z.enum(["SQA", "SUPPLIER", "BOTH"]),
        requiredFields: z.array(z.string()), slaDefault: z.number(),
      })),
      transitions: z.array(z.object({
        fromStepId: z.string(), toStepId: z.string(),
        conditions: z.array(z.string()), actions: z.array(z.string()),
      })),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await createWorkflowDefinition({ ...input, createdBy: ctx.user.id });
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "WORKFLOW_CREATE", fieldName: "workflowDefinition", oldValue: null, newValue: JSON.stringify({ name: input.name }) });
      return result;
    }),
  newVersion: authorizedProcedure("workflow", "manage")
    .input(z.object({
      definitionId: z.number(),
      steps: z.array(z.object({
        id: z.string(), name: z.string(), order: z.number(),
        responsible: z.enum(["SQA", "SUPPLIER", "BOTH"]),
        requiredFields: z.array(z.string()), slaDefault: z.number(),
      })),
      transitions: z.array(z.object({
        fromStepId: z.string(), toStepId: z.string(),
        conditions: z.array(z.string()), actions: z.array(z.string()),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await createNewVersion(input.definitionId, { steps: input.steps, transitions: input.transitions });
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "WORKFLOW_NEW_VERSION", fieldName: "workflowVersion", oldValue: null, newValue: JSON.stringify({ definitionId: input.definitionId }) });
      return result;
    }),
  instanceByDefect: protectedProcedure
    .input(z.object({ defectId: z.number() }))
    .query(async ({ input }) => getWorkflowInstanceByDefect(input.defectId)),
  createInstance: protectedProcedure
    .input(z.object({ defectId: z.number(), definitionId: z.number(), initialStepId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await createWorkflowInstance(input.defectId, input.definitionId, input.initialStepId);
      await createAuditLog({ defectId: input.defectId, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "WORKFLOW_CREATE_INSTANCE", fieldName: "workflowInstance", oldValue: null, newValue: JSON.stringify({ definitionId: input.definitionId, stepId: input.initialStepId }) });
      return result;
    }),
  advance: protectedProcedure
    .input(z.object({ instanceId: z.number(), newStepId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await advanceWorkflowInstance(input.instanceId, input.newStepId, ctx.user.id);
      await fireWebhook("workflow.step_changed", { instanceId: input.instanceId, newStepId: input.newStepId, userId: ctx.user.id });
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "WORKFLOW_ADVANCE", fieldName: "workflowStep", oldValue: null, newValue: JSON.stringify({ instanceId: input.instanceId, newStepId: input.newStepId }) });
      return { success: true };
    }),
});

// =====================================================
// TENANT ROUTER
// =====================================================
const tenantRouter = router({
  seed: authorizedProcedure("tenant", "manage").mutation(async ({ ctx }) => {
    const result = await seedDefaultTenant();
    await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "System", action: "TENANT_CREATE", fieldName: "tenant", oldValue: null, newValue: "seeded" });
    return result;
  }),
  list: protectedProcedure.query(async () => getTenants()),
  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => getTenantById(input.id)),
  create: authorizedProcedure("tenant", "manage")
    .input(z.object({
      name: z.string().min(1), slug: z.string().min(1),
      plan: z.string().optional(), maxUsers: z.number().optional(), maxDefects: z.number().optional(),
      settings: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await createTenant(input);
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "TENANT_CREATE", fieldName: "tenant", oldValue: null, newValue: JSON.stringify({ name: input.name, slug: input.slug }) });
      return result;
    }),
  myTenants: protectedProcedure.query(async ({ ctx }) => getTenantsForUser(ctx.user.id)),
  activeTenant: protectedProcedure.query(async ({ ctx }) => {
    return { tenantId: ctx.tenantId };
  }),
  switchTenant: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Validate user has access to this tenant
      const userTenants = await getTenantsForUser(ctx.user.id);
      const hasAccess = userTenants.some(t => t.tenantId === input.tenantId);
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado a este tenant" });
      }
      await updateActiveTenantId(ctx.user.id, input.tenantId);
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "TENANT_SWITCH", fieldName: "activeTenantId", oldValue: String(ctx.tenantId), newValue: String(input.tenantId) });
      return { success: true, tenantId: input.tenantId };
    }),
  addUser: authorizedProcedure("tenant", "manage")
    .input(z.object({ userId: z.number(), tenantId: z.number(), role: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await addUserToTenant(input.userId, input.tenantId, input.role);
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "TENANT_ADD_USER", fieldName: "tenantUser", oldValue: null, newValue: JSON.stringify({ targetUserId: input.userId, tenantId: input.tenantId }) });
      return { success: true };
    }),
  removeUser: authorizedProcedure("tenant", "manage")
    .input(z.object({ userId: z.number(), tenantId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await removeUserFromTenant(input.userId, input.tenantId);
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "TENANT_REMOVE_USER", fieldName: "tenantUser", oldValue: JSON.stringify({ targetUserId: input.userId, tenantId: input.tenantId }), newValue: null });
      return { success: true };
    }),
  members: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => getTenantMembers(input.tenantId)),
  allUsers: protectedProcedure.query(async () => getAllUsers()),
});

// =====================================================
// WEBHOOK ROUTER
// =====================================================
const webhookRouter = router({
  list: protectedProcedure
    .input(z.object({ tenantId: z.number().optional() }).optional())
    .query(async ({ input }) => getWebhookConfigs(input?.tenantId)),
  create: authorizedProcedure("webhook", "manage")
    .input(z.object({
      name: z.string().min(1), url: z.string().url(),
      events: z.array(z.string()), tenantId: z.number().optional(),
      headers: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await createWebhookConfig(input);
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "WEBHOOK_CREATE", fieldName: "webhookConfig", oldValue: null, newValue: JSON.stringify({ name: input.name, url: input.url }) });
      return result;
    }),
  delete: authorizedProcedure("webhook", "manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteWebhookConfig(input.id);
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "WEBHOOK_DELETE", fieldName: "webhookConfig", oldValue: JSON.stringify({ id: input.id }), newValue: null });
      return { success: true };
    }),
  logs: protectedProcedure
    .input(z.object({ configId: z.number(), limit: z.number().optional() }))
    .query(async ({ input }) => getWebhookLogs(input.configId, input.limit)),
  test: authorizedProcedure("webhook", "manage")
    .input(z.object({ configId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await fireWebhook("test.ping", { message: "Test webhook from QTrack", timestamp: new Date().toISOString(), configId: input.configId });
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "WEBHOOK_TEST", fieldName: "webhookTest", oldValue: null, newValue: JSON.stringify({ configId: input.configId }) });
      return { success: true };
    }),
});

// =====================================================
// AI PREDICTION ROUTER
// =====================================================
const predictionRouter = router({
  recurrencePatterns: protectedProcedure
    .input(z.object({ supplierId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => detectRecurrencePatterns(input?.supplierId, ctx.tenantId ?? undefined)),
  heatmap: protectedProcedure.query(async ({ ctx }) => getRecurrenceHeatmap(ctx.tenantId ?? undefined)),
});

// =====================================================
// DOCUMENT CONTROL ROUTER
// =====================================================
const documentRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional(), category: z.string().optional(), search: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => getDocuments({ ...(input || {}), tenantId: ctx.tenantId ?? undefined })),
  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => getDocumentById(input.id)),
  create: authorizedProcedure("document", "create")
    .input(z.object({
      title: z.string().min(1), category: z.string(),
      tags: z.array(z.string()).optional(), expiresAt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await createDocument({ ...input, ownerId: ctx.user.id });
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "DOCUMENT_CREATE", fieldName: "document", oldValue: null, newValue: JSON.stringify({ title: input.title, category: input.category }) });
      return result;
    }),
  updateStatus: authorizedProcedure("document", "approve")
    .input(z.object({ id: z.number(), status: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await updateDocumentStatus(input.id, input.status, ctx.user.id);
      await fireWebhook("document.status_changed", { documentId: input.id, status: input.status, userId: ctx.user.id });
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "DOCUMENT_STATUS_CHANGE", fieldName: "documentStatus", oldValue: null, newValue: JSON.stringify({ documentId: input.id, status: input.status }) });
      return { success: true };
    }),
  versions: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => getDocumentVersions(input.documentId)),
  addVersion: protectedProcedure
    .input(z.object({
      documentId: z.number(), fileUrl: z.string(),
      fileSize: z.number().optional(), mimeType: z.string().optional(),
      changeDescription: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const doc = await getDocumentById(input.documentId);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      const newVersion = (doc.currentVersion || 0) + 1;
      const result = await addDocumentVersion({ ...input, version: newVersion, uploadedBy: ctx.user.id });
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "DOCUMENT_ADD_VERSION", fieldName: "documentVersion", oldValue: String(doc.currentVersion || 0), newValue: String(newVersion) });
      return result;
    }),
  delete: authorizedProcedure("document", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await softDeleteDocument(input.id);
      await createAuditLog({ defectId: 0, userId: ctx.user.id, userName: ctx.user.name || "Unknown", action: "DOCUMENT_DELETE", fieldName: "document", oldValue: JSON.stringify({ id: input.id }), newValue: null });
      return { success: true };
    }),
});

// =====================================================
// API KEY ROUTER (for managing REST API keys)
// =====================================================
const apiKeyRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId || 1;
    return listApiKeys(tenantId);
  }),
  create: authorizedProcedure("api_keys", "write")
    .input(z.object({
      name: z.string().min(1).max(200),
      scopes: z.array(z.string()).min(1),
      expiresInDays: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86400000)
        : undefined;
      const result = await createApiKey({
        tenantId,
        createdBy: ctx.user.id,
        name: input.name,
        scopes: input.scopes,
        expiresAt,
      });
      await createAuditLog({
        defectId: 0, userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        action: "API_KEY_CREATE",
        fieldName: "apiKey",
        oldValue: null,
        newValue: JSON.stringify({ id: result.id, name: input.name }),
      });
      return result; // rawKey only returned once
    }),
  revoke: authorizedProcedure("api_keys", "write")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      await revokeApiKey(input.id, tenantId);
      await createAuditLog({
        defectId: 0, userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        action: "API_KEY_REVOKE",
        fieldName: "apiKey",
        oldValue: JSON.stringify({ id: input.id }),
        newValue: null,
      });
      return { success: true };
    }),
});

// =====================================================
// PUSH NOTIFICATION ROUTER
// =====================================================
const pushRouter = router({
  vapidPublicKey: publicProcedure.query(() => {
    return { publicKey: getVapidPublicKey() };
  }),
  subscribe: protectedProcedure
    .input(z.object({
      endpoint: z.string().url(),
      p256dh: z.string(),
      auth: z.string(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId || 1;
      return subscribePush({
        userId: ctx.user.id,
        tenantId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
      });
    }),
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return unsubscribePush({
        userId: ctx.user.id,
        endpoint: input.endpoint,
      });
    }),
  mySubscriptions: protectedProcedure.query(async ({ ctx }) => {
    return getActiveSubscriptions(ctx.user.id);
  }),
  sendTest: protectedProcedure.mutation(async ({ ctx }) => {
    return sendPushToUser(ctx.user.id, {
      title: "QTrack — Teste de Notificação",
      body: "Push notifications estão funcionando corretamente!",
      icon: "/icons/icon-192x192.png",
      tag: "test",
      url: "/notifications",
    });
  }),
});

// =====================================================
// BI EMBEDDED ROUTER
// =====================================================
const biRouter = router({
  dashboards: protectedProcedure.query(async ({ ctx }) => {
    return getBiDashboards(ctx.user.id, ctx.tenantId ?? undefined);
  }),
  createDashboard: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      isShared: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createBiDashboard({
        userId: ctx.user.id,
        tenantId: ctx.tenantId ?? undefined,
        name: input.name,
        description: input.description,
        isShared: input.isShared,
      });
    }),
  updateDashboard: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      layout: z.any().optional(),
      isShared: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...params } = input;
      return updateBiDashboard(id, ctx.user.id, params);
    }),
  deleteDashboard: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return deleteBiDashboard(input.id, ctx.user.id);
    }),
  widgets: protectedProcedure
    .input(z.object({ dashboardId: z.number() }))
    .query(async ({ input }) => {
      return getWidgetsForDashboard(input.dashboardId);
    }),
  createWidget: protectedProcedure
    .input(z.object({
      dashboardId: z.number(),
      widgetType: z.string(),
      title: z.string(),
      dataSource: z.string(),
      config: z.any().optional(),
      position: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
    }))
    .mutation(async ({ input }) => {
      return createBiWidget(input);
    }),
  updateWidget: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      config: z.any().optional(),
      position: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).optional(),
      widgetType: z.string().optional(),
      dataSource: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...params } = input;
      return updateBiWidget(id, params);
    }),
  deleteWidget: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteBiWidget(input.id);
    }),
  resolveData: protectedProcedure
    .input(z.object({
      dataSource: z.string(),
      config: z.any().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return resolveWidgetData(input.dataSource, ctx.tenantId ?? undefined, input.config);
    }),
});

// =====================================================
// MAIN ROUTER
// =====================================================
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  defect: defectRouter,
  comment: commentRouter,
  attachment: attachmentRouter,
  import: importRouter,
  supplier: supplierRouter,
  sla: slaRouter,
  notification: notificationRouter,
  rca: rcaRouter,
  copq: copqRouter,
  scorecard: scorecardRouter,
  ai: aiRouter,
  rbac: rbacRouter,
  workflow: workflowRouter,
  tenant: tenantRouter,
  webhook: webhookRouter,
  prediction: predictionRouter,
  document: documentRouter,
  apiKey: apiKeyRouter,
  push: pushRouter,
  bi: biRouter,
});
export type AppRouter = typeof appRouter;
