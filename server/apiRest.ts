/**
 * P2 — API REST Pública v1
 * 
 * Endpoints:
 *   GET    /api/v1/defects          — listar defeitos (paginado, filtros)
 *   GET    /api/v1/defects/:id      — detalhe de defeito
 *   POST   /api/v1/defects          — criar defeito
 *   PATCH  /api/v1/defects/:id      — atualizar defeito
 *   GET    /api/v1/reports/stats    — estatísticas
 *   GET    /api/v1/reports/copq     — COPQ dashboard
 *   GET    /api/v1/suppliers        — listar fornecedores
 *   GET    /api/v1/docs             — OpenAPI spec (JSON)
 * 
 * Auth: Bearer <api_key> header
 * Tenant: X-Tenant-Id header (optional, defaults to key's tenant)
 */

import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import {
  getDefects,
  getDefectById,
  createDefect,
  updateDefect,
  getDefectStats,
  getCopqDashboard,
  getSuppliers,
  createAuditLog,
} from "./db";
import {
  createApiKey,
  getApiKeyByHash,
  listApiKeys,
  revokeApiKey,
  touchApiKeyLastUsed,
} from "./apiKeyDb";
import { calculateStep, calculateResponsible } from "../shared/defectLogic";

// ─── Types ──────────────────────────────────────────────────────────
interface ApiKeyContext {
  apiKeyId: number;
  tenantId: number;
  scopes: string[];
  keyName: string;
}

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKeyContext;
    }
  }
}

// ─── Auth Middleware ─────────────────────────────────────────────────
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Missing or invalid Authorization header. Use: Bearer <api_key>",
    });
  }

  const rawKey = authHeader.slice(7).trim();
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  try {
    const apiKey = await getApiKeyByHash(keyHash);
    if (!apiKey) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Invalid API key" });
    }
    if (apiKey.revokedAt) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "API key has been revoked" });
    }
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "API key has expired" });
    }

    // Parse scopes
    const scopes = Array.isArray(apiKey.scopes) ? apiKey.scopes as string[] : [];

    req.apiKey = {
      apiKeyId: apiKey.id,
      tenantId: apiKey.tenantId,
      scopes,
      keyName: apiKey.name,
    };

    // Touch last used (fire and forget)
    touchApiKeyLastUsed(apiKey.id).catch(() => {});

    next();
  } catch (err) {
    console.error("[API REST] Auth error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Authentication failed" });
  }
}

// ─── Scope Check ────────────────────────────────────────────────────
function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const scopes = req.apiKey.scopes;
    // Check for exact scope or wildcard
    if (scopes.includes(scope) || scopes.includes("*") || scopes.includes(scope.split(":")[0] + ":*")) {
      return next();
    }
    return res.status(403).json({
      error: "FORBIDDEN",
      message: `Missing required scope: ${scope}`,
      requiredScope: scope,
      yourScopes: scopes,
    });
  };
}

// ─── Error Wrapper ──────────────────────────────────────────────────
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// ─── Router ─────────────────────────────────────────────────────────
export function createApiV1Router(): Router {
  const router = Router();

  // All routes require API key auth
  router.use(apiKeyAuth);

  // ── GET /defects ──────────────────────────────────────────────────
  router.get("/defects", requireScope("defects:read"), asyncHandler(async (req, res) => {
    const tenantId = req.apiKey!.tenantId;
    const { page, limit, status, severity, supplier, search, year, dateFrom, dateTo, sortBy, sortOrder } = req.query;

    const result = await getDefects({
      tenantId,
      page: page ? parseInt(page as string) : 1,
      pageSize: limit ? Math.min(parseInt(limit as string), 100) : 20,
      status: status as string | undefined,
      symptom: severity as string | undefined,
      supplier: supplier as string | undefined,
      search: search as string | undefined,
      year: year ? parseInt(year as string) : undefined,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
    });

    const totalPages = Math.ceil(result.total / (result.pageSize || 20));
    res.json({
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.pageSize,
        total: result.total,
        totalPages,
      },
    });
  }));

  // ── GET /defects/:id ──────────────────────────────────────────────
  router.get("/defects/:id", requireScope("defects:read"), asyncHandler(async (req, res) => {
    const tenantId = req.apiKey!.tenantId;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "BAD_REQUEST", message: "Invalid defect ID" });
      return;
    }

    const defect = await getDefectById(id, tenantId);
    if (!defect) {
      res.status(404).json({ error: "NOT_FOUND", message: `Defect ${id} not found` });
      return;
    }

    res.json({ data: defect });
  }));

  // ── POST /defects ─────────────────────────────────────────────────
  router.post("/defects", requireScope("defects:write"), asyncHandler(async (req, res) => {
    const tenantId = req.apiKey!.tenantId;
    const body = req.body;

    // Validate required fields
    const requiredFields = ["title", "description", "severity", "origin"];
    const missing = requiredFields.filter(f => !body[f]);
    if (missing.length > 0) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: `Missing required fields: ${missing.join(", ")}`,
      });
      return;
    }

    const step = calculateStep(body);
    const responsible = calculateResponsible(body);

    const defect = await createDefect({
      ...body,
      tenantId,
      currentStep: step,
      responsible,
      status: body.status || "Aberto",
      createdBy: null,
    });

    if (!defect) {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create defect" });
      return;
    }

    await createAuditLog({
      defectId: defect.id,
      userId: null,
      userName: `API:${req.apiKey!.keyName}`,
      action: "CREATE",
      fieldName: "defect",
      oldValue: null,
      newValue: JSON.stringify({ id: defect.id, title: body.title }),
    });

    res.status(201).json({ data: { id: defect.id, docNumber: defect.docNumber } });
  }));

  // ── PATCH /defects/:id ────────────────────────────────────────────
  router.patch("/defects/:id", requireScope("defects:write"), asyncHandler(async (req, res) => {
    const tenantId = req.apiKey!.tenantId;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "BAD_REQUEST", message: "Invalid defect ID" });
      return;
    }

     const defect = await getDefectById(id, tenantId);
    if (!defect) {
      res.status(404).json({ error: "NOT_FOUND", message: `Defect ${id} not found` });
      return;
    }

    await updateDefect(id, req.body);

    await createAuditLog({
      defectId: id,
      userId: null,
      userName: `API:${req.apiKey!.keyName}`,
      action: "UPDATE",
      fieldName: "defect",
      oldValue: null,
      newValue: JSON.stringify(req.body),
    });

    res.json({ data: { id, updated: true } });
  }));

  // ── GET /reports/stats ────────────────────────────────────────────
  router.get("/reports/stats", requireScope("reports:read"), asyncHandler(async (req, res) => {
    const tenantId = req.apiKey!.tenantId;
    const { dateFrom, dateTo } = req.query;
    const stats = await getDefectStats({
      tenantId,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
    });
    res.json({ data: stats });
  }));

  // ── GET /reports/copq ─────────────────────────────────────────────
  router.get("/reports/copq", requireScope("reports:read"), asyncHandler(async (req, res) => {
    const tenantId = req.apiKey!.tenantId;
    const { startDate, endDate } = req.query;
    const copq = await getCopqDashboard({
      tenantId,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });
    res.json({ data: copq });
  }));

  // ── GET /suppliers ────────────────────────────────────────────────
  router.get("/suppliers", requireScope("suppliers:read"), asyncHandler(async (req, res) => {
    const suppliers = await getSuppliers();
    res.json({ data: suppliers });
  }));

  // ── GET /docs — OpenAPI Spec ──────────────────────────────────────
  router.get("/docs", (_req, res) => {
    res.json(getOpenApiSpec());
  });

  // Global error handler for API routes
  router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[API REST] Error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  });

  return router;
}

// ─── OpenAPI Spec ───────────────────────────────────────────────────
function getOpenApiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "QTrack System — API REST Pública",
      version: "1.0.0",
      description: "API REST para integração com ERP/SAP e sistemas externos. Autenticação via API Key (Bearer token).",
      contact: { name: "SQA MAO Quality Team" },
    },
    servers: [{ url: "/api/v1", description: "API v1" }],
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "API Key gerada no painel de administração",
        },
      },
      schemas: {
        Defect: {
          type: "object",
          properties: {
            id: { type: "integer" },
            docNumber: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            severity: { type: "string", enum: ["Crítica", "Maior", "Menor", "Observação"] },
            status: { type: "string", enum: ["Aberto", "Em Análise", "Ação Corretiva", "Verificação", "Fechado"] },
            origin: { type: "string" },
            currentStep: { type: "string" },
            responsible: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
          },
        },
        PaginatedDefects: {
          type: "object",
          properties: {
            data: { type: "array", items: { $ref: "#/components/schemas/Defect" } },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
                totalPages: { type: "integer" },
              },
            },
          },
        },
      },
    },
    paths: {
      "/defects": {
        get: {
          summary: "Listar defeitos",
          tags: ["Defects"],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "severity", in: "query", schema: { type: "string" } },
            { name: "supplier", in: "query", schema: { type: "string" } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
            { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
          ],
          responses: {
            "200": { description: "Lista paginada de defeitos", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedDefects" } } } },
            "401": { description: "Não autorizado" },
            "403": { description: "Escopo insuficiente" },
          },
        },
        post: {
          summary: "Criar defeito",
          tags: ["Defects"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "description", "severity", "origin"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    severity: { type: "string", enum: ["Crítica", "Maior", "Menor", "Observação"] },
                    origin: { type: "string" },
                    supplier: { type: "string" },
                    partNumber: { type: "string" },
                    lotNumber: { type: "string" },
                    quantity: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Defeito criado" },
            "400": { description: "Campos obrigatórios faltando" },
            "401": { description: "Não autorizado" },
          },
        },
      },
      "/defects/{id}": {
        get: {
          summary: "Detalhe do defeito",
          tags: ["Defects"],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: {
            "200": { description: "Defeito encontrado" },
            "404": { description: "Defeito não encontrado" },
          },
        },
        patch: {
          summary: "Atualizar defeito",
          tags: ["Defects"],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            "200": { description: "Defeito atualizado" },
            "404": { description: "Defeito não encontrado" },
          },
        },
      },
      "/reports/stats": {
        get: {
          summary: "Estatísticas de defeitos",
          tags: ["Reports"],
          parameters: [
            { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
            { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
          ],
          responses: { "200": { description: "Estatísticas" } },
        },
      },
      "/reports/copq": {
        get: {
          summary: "Dashboard COPQ",
          tags: ["Reports"],
          responses: { "200": { description: "Dados COPQ" } },
        },
      },
      "/suppliers": {
        get: {
          summary: "Listar fornecedores",
          tags: ["Suppliers"],
          responses: { "200": { description: "Lista de fornecedores" } },
        },
      },
    },
  };
}
