import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Activity,
  Shield,
  Brain,
  GitBranch,
  BarChart3,
  Link2,
  Heart,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  Eye,
  Hand,
  TrendingUp,
  Settings2,
  Server,
  ArrowLeftRight,
  Target,
  Percent,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Play,
  Pause,
  Save,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// =====================================================
// TYPES
// =====================================================
type AgentInfo = {
  name: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
};

const AGENTS: AgentInfo[] = [
  { name: "triage", label: "Triage Agent", description: "Auto-classificação, severidade NLP, auto-atribuição, detecção de duplicatas", icon: Brain, color: "#8B5CF6", bgColor: "rgba(139,92,246,0.15)" },
  { name: "workflow", label: "Workflow Agent", description: "Auto-advance 8D, SLA monitor, escalation, auto-close", icon: GitBranch, color: "#00D4AA", bgColor: "rgba(0,212,170,0.15)" },
  { name: "predict", label: "Predict Agent", description: "Multi-hipótese RCA, anomalias, trends, risk score", icon: TrendingUp, color: "#F5A623", bgColor: "rgba(245,166,35,0.15)" },
  { name: "report", label: "Report Agent", description: "Digests diários, executive summary, NL query", icon: BarChart3, color: "#3B82F6", bgColor: "rgba(59,130,246,0.15)" },
  { name: "integration", label: "Integration Agent", description: "ERP/SAP sync, webhook dispatch, email", icon: Link2, color: "#06B6D4", bgColor: "rgba(6,182,212,0.15)" },
  { name: "health", label: "Health Agent", description: "System monitor, self-healing, performance", icon: Heart, color: "#EF4444", bgColor: "rgba(239,68,68,0.15)" },
  { name: "feedback", label: "Feedback Agent", description: "Learning loop, accuracy tracking, threshold tuning", icon: MessageSquare, color: "#10B981", bgColor: "rgba(16,185,129,0.15)" },
];

// =====================================================
// AUTONOMY LEVEL BADGE
// =====================================================
function AutonomyBadge({ level }: { level: string }) {
  const config: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    auto: { label: "Autônomo", icon: Zap, className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    review: { label: "Revisão", icon: Eye, className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    hitl: { label: "HITL", icon: Hand, className: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const c = config[level] || config.hitl;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`${c.className} text-xs font-medium gap-1`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    active: { label: "Ativo", icon: CheckCircle2, className: "bg-emerald-500/20 text-emerald-400" },
    inactive: { label: "Inativo", icon: XCircle, className: "bg-zinc-500/20 text-zinc-400" },
    error: { label: "Erro", icon: AlertTriangle, className: "bg-red-500/20 text-red-400" },
    healthy: { label: "Saudável", icon: CheckCircle2, className: "bg-emerald-500/20 text-emerald-400" },
    degraded: { label: "Degradado", icon: AlertTriangle, className: "bg-amber-500/20 text-amber-400" },
    down: { label: "Offline", icon: XCircle, className: "bg-red-500/20 text-red-400" },
  };
  const c = config[status] || config.inactive;
  const Icon = c.icon;
  return (
    <Badge variant="secondary" className={`${c.className} text-xs gap-1`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

// =====================================================
// AGENT CARD
// =====================================================
function AgentCard({ agent, onSelect }: { agent: AgentInfo; onSelect: () => void }) {
  const { data: config } = trpc.aiControl.getConfig.useQuery({ agentName: agent.name });
  const { data: stats } = trpc.aiControl.metrics.useQuery({ agentName: agent.name });
  const toggleMutation = trpc.aiControl.updateConfig.useMutation();
  const utils = trpc.useUtils();
  const isEnabled = config?.enabled ?? true;
  const autoThreshold = parseFloat(String(config?.autoThreshold ?? "0.60"));
  const autonomyLevel = autoThreshold >= 0.85 ? "auto" : autoThreshold >= 0.60 ? "review" : "hitl";

  const handleToggle = async () => {
    try {
      await toggleMutation.mutateAsync({ agentName: agent.name, enabled: !isEnabled });
      utils.aiControl.getConfig.invalidate({ agentName: agent.name });
      toast.success(`${agent.label} ${!isEnabled ? "ativado" : "desativado"}`);
    } catch {
      toast.error("Erro ao alterar agente");
    }
  };

  const Icon = agent.icon;
  const totalDecisions = (stats as any)?.totalDecisions ?? 0;
  const avgConfidence = (stats as any)?.avgConfidence ?? 0;

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:scale-[1.02] border"
      style={{
        background: "rgba(15,23,42,0.8)",
        borderColor: isEnabled ? `${agent.color}40` : "rgba(255,255,255,0.08)",
      }}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: agent.bgColor }}
            >
              <Icon className="h-5 w-5" style={{ color: agent.color }} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">{agent.label}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Switch checked={isEnabled} onCheckedChange={handleToggle} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <AutonomyBadge level={autonomyLevel} />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {totalDecisions} decisões
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {Math.round(avgConfidence * 100)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// DECISIONS TABLE
// =====================================================
function DecisionsTable() {
  const { data: decisions, isLoading } = trpc.aiControl.decisions.useQuery({ limit: 50 });
  const approveMutation = trpc.aiControl.approveDecision.useMutation();
  const rejectMutation = trpc.aiControl.rejectDecision.useMutation();
  const utils = trpc.useUtils();

  const handleApprove = async (id: number) => {
    try {
      await approveMutation.mutateAsync({ decisionId: id });
      utils.aiControl.decisions.invalidate();
      toast.success("Decisão aprovada");
    } catch {
      toast.error("Erro ao aprovar");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectMutation.mutateAsync({ decisionId: id });
      utils.aiControl.decisions.invalidate();
      toast.success("Decisão rejeitada");
    } catch {
      toast.error("Erro ao rejeitar");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = (decisions as any[]) || [];

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">Nenhuma decisão registrada ainda.</p>
        <p className="text-muted-foreground/60 text-xs mt-1">As decisões aparecerão aqui conforme os agentes processam defeitos.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agente</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Defeito</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confiança</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((d: any) => {
            const agent = AGENTS.find(a => a.name === d.agentName);
            const statusColors: Record<string, string> = {
              PENDING: "bg-amber-500/20 text-amber-400",
              APPROVED: "bg-emerald-500/20 text-emerald-400",
              EXECUTED: "bg-blue-500/20 text-blue-400",
              REJECTED: "bg-red-500/20 text-red-400",
              OVERRIDDEN: "bg-purple-500/20 text-purple-400",
            };
            return (
              <tr
                key={d.id}
                className="border-b transition-colors hover:bg-muted/30"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {agent && (
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: agent.bgColor }}>
                        <agent.icon className="h-3.5 w-3.5" style={{ color: agent.color }} />
                      </div>
                    )}
                    <span className="text-xs font-medium">{agent?.label || d.agentName}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">{d.decisionType || "—"}</td>
                <td className="py-3 px-4 text-xs font-mono">#{d.defectId || "—"}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((d.confidence || 0) * 100)}%`,
                          background: (d.confidence || 0) >= 0.85 ? "#00D4AA" : (d.confidence || 0) >= 0.6 ? "#F5A623" : "#EF4444",
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{Math.round((d.confidence || 0) * 100)}%</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="secondary" className={`text-[10px] ${statusColors[d.status] || "bg-zinc-500/20 text-zinc-400"}`}>
                    {d.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">
                  {d.createdAt ? new Date(d.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                </td>
                <td className="py-3 px-4 text-right">
                  {d.status === "PENDING" && (
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => handleApprove(d.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleReject(d.id)}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =====================================================
// GUARDRAILS CONFIG
// =====================================================
function GuardrailsConfig() {
  const { data: configs } = trpc.aiControl.agents.useQuery();
  const updateMutation = trpc.aiControl.updateConfig.useMutation();
  const utils = trpc.useUtils();

  const handleLevelChange = async (agentName: string, level: string) => {
    try {
      await updateMutation.mutateAsync({ agentName, autoThreshold: level === 'auto' ? 0.85 : level === 'review' ? 0.60 : 0.30 });
      utils.aiControl.agents.invalidate();
      utils.aiControl.getConfig.invalidate({ agentName });
      toast.success(`Nível de autonomia atualizado para ${agentName}`);
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const items = (configs as any[]) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5" style={{ color: "#F5A623" }} />
        <h3 className="text-sm font-semibold">Guardrails — Níveis de Autonomia</h3>
      </div>

      <div className="grid gap-3">
        {AGENTS.map((agent) => {
          const config = items.find((c: any) => c.agentName === agent.name);
          const threshold = parseFloat(String(config?.autoThreshold ?? "0.60"));
          const currentLevel = threshold >= 0.85 ? "auto" : threshold >= 0.60 ? "review" : "hitl";
          const Icon = agent.icon;

          return (
            <div
              key={agent.name}
              className="flex items-center justify-between p-4 rounded-xl border"
              style={{
                background: "rgba(15,23,42,0.6)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: agent.bgColor }}
                >
                  <Icon className="h-4 w-4" style={{ color: agent.color }} />
                </div>
                <div>
                  <p className="text-sm font-medium">{agent.label}</p>
                  <p className="text-xs text-muted-foreground">{agent.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {["auto", "review", "hitl"].map((level) => (
                  <Button
                    key={level}
                    size="sm"
                    variant={currentLevel === level ? "default" : "outline"}
                    className={`h-7 text-xs ${
                      currentLevel === level
                        ? level === "auto"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : level === "review"
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                        : "border-border/50"
                    }`}
                    onClick={() => handleLevelChange(agent.name, level)}
                  >
                    {level === "auto" ? "Autônomo" : level === "review" ? "Revisão" : "HITL"}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Card className="mt-6 border" style={{ background: "rgba(15,23,42,0.6)", borderColor: "rgba(255,255,255,0.08)" }}>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">Autônomo</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Confiança ≥ 85%: executa automaticamente sem intervenção humana</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Eye className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">Revisão</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Confiança 60-84%: executa e notifica para revisão posterior</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Hand className="h-4 w-4 text-red-400" />
                <span className="text-xs font-semibold text-red-400">HITL</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Confiança &lt; 60%: aguarda aprovação humana antes de executar</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================
// ERP/SAP INTEGRATION CONFIG
// =====================================================
function ErpIntegrationConfig() {
  const { data: erpConfig, isLoading } = trpc.aiControl.getErpConfig.useQuery();
  const saveMutation = trpc.aiControl.updateErpConfig.useMutation();
  const syncMutation = trpc.aiControl.triggerErpSync.useMutation();
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState<{
    erpType: string;
    baseUrl: string;
    authType: string;
    apiKey: string;
    syncDirection: string;
    syncInterval: string;
    fieldMapping: string;
  }>({
    erpType: "sap",
    baseUrl: "",
    authType: "api_key",
    apiKey: "",
    syncDirection: "bidirectional",
    syncInterval: "15",
    fieldMapping: JSON.stringify({
      "defectNumber": "QMNUM",
      "description": "QMTXT",
      "supplier": "LIFNR",
      "partNumber": "MATNR",
      "category": "FEGRP",
      "severity": "PRIOK",
      "status": "STAT",
    }, null, 2),
  });

  const [isEditing, setIsEditing] = useState(false);

  // Load config when data arrives
  const config = erpConfig as any;
  const isConfigured = config?.baseUrl;

  const handleSave = async () => {
    try {
      let parsedMapping: Record<string, string> = {};
      try { parsedMapping = JSON.parse(formData.fieldMapping); } catch { /* ignore */ }
      await saveMutation.mutateAsync({
        erpType: formData.erpType as "sap" | "oracle" | "dynamics" | "custom",
        baseUrl: formData.baseUrl,
        apiKey: formData.apiKey,
        syncDirection: formData.syncDirection as "inbound" | "outbound" | "bidirectional",
        syncInterval: parseInt(formData.syncInterval),
        fieldMapping: parsedMapping,
      });
      utils.aiControl.getErpConfig.invalidate();
      setIsEditing(false);
      toast.success("Configuração ERP salva com sucesso");
    } catch {
      toast.error("Erro ao salvar configuração");
    }
  };

  const handleSync = async (direction: "inbound" | "outbound") => {
    const startTime = Date.now();
    const dirLabel = direction === "inbound" ? "ERP → QTrack" : "QTrack → ERP";
    try {
      const result = await syncMutation.mutateAsync({ direction }) as any;
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const synced = result?.recordsProcessed ?? result?.processed ?? 0;
      const errors = result?.errors?.length ?? result?.errorCount ?? 0;
      const skipped = result?.skipped ?? 0;

      if (errors > 0) {
        toast.warning(`Sincronização ${dirLabel} concluída com avisos`, {
          description: `${synced} registros sincronizados, ${errors} erro(s), ${skipped} ignorado(s) — ${duration}s`,
          duration: 6000,
        });
      } else {
        toast.success(`Sincronização ${dirLabel} concluída`, {
          description: `${synced} registro(s) sincronizado(s)${skipped ? `, ${skipped} ignorado(s)` : ""} — ${duration}s`,
          duration: 5000,
        });
      }
      utils.aiControl.getErpConfig.invalidate();
    } catch (err: any) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      toast.error(`Erro na sincronização ${dirLabel}`, {
        description: err?.message || `Falha após ${duration}s. Verifique a configuração de conexão.`,
        duration: 8000,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5" style={{ color: "#06B6D4" }} />
          <h3 className="text-sm font-semibold">Integração ERP/SAP</h3>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured && (
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Configurado
            </Badge>
          )}
          {!isConfigured && (
            <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              Não Configurado
            </Badge>
          )}
        </div>
      </div>

      {/* Connection Status Card */}
      <Card className="border" style={{ background: "rgba(15,23,42,0.6)", borderColor: "rgba(255,255,255,0.08)" }}>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Database className="h-5 w-5 mx-auto mb-1" style={{ color: "#06B6D4" }} />
              <p className="text-xs text-muted-foreground">Tipo ERP</p>
              <p className="text-sm font-semibold text-foreground">{config?.erpType?.toUpperCase() || "—"}</p>
            </div>
            <div className="text-center">
              <ArrowLeftRight className="h-5 w-5 mx-auto mb-1" style={{ color: "#00D4AA" }} />
              <p className="text-xs text-muted-foreground">Direção</p>
              <p className="text-sm font-semibold text-foreground">{config?.syncDirection === "bidirectional" ? "Bidirecional" : config?.syncDirection === "inbound" ? "ERP → QTrack" : config?.syncDirection === "outbound" ? "QTrack → ERP" : "—"}</p>
            </div>
            <div className="text-center">
              <Clock className="h-5 w-5 mx-auto mb-1" style={{ color: "#F5A623" }} />
              <p className="text-xs text-muted-foreground">Intervalo</p>
              <p className="text-sm font-semibold text-foreground">{config?.syncIntervalMinutes ? `${config.syncIntervalMinutes} min` : "—"}</p>
            </div>
            <div className="text-center">
              <Activity className="h-5 w-5 mx-auto mb-1" style={{ color: "#8B5CF6" }} />
              <p className="text-xs text-muted-foreground">Última Sync</p>
              <p className="text-sm font-semibold text-foreground">{config?.lastSync ? new Date(config.lastSync).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Nunca"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Sync Actions */}
      {isConfigured && (
        <div className="flex gap-3">
          <Button
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs gap-1.5"
            onClick={() => handleSync("inbound")}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}
            Sync ERP → QTrack
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            onClick={() => handleSync("outbound")}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}
            Sync QTrack → ERP
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 border-border/50"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            {isEditing ? "Cancelar" : "Editar Config"}
          </Button>
        </div>
      )}

      {/* Configuration Form */}
      {(!isConfigured || isEditing) && (
        <Card className="border" style={{ background: "rgba(15,23,42,0.6)", borderColor: "rgba(255,255,255,0.08)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4" style={{ color: "#06B6D4" }} />
              Configuração de Conexão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tipo de ERP</Label>
                <Select value={formData.erpType} onValueChange={(v) => setFormData(p => ({ ...p, erpType: v }))}>
                  <SelectTrigger className="h-9 text-xs bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sap">SAP ECC/S4HANA</SelectItem>
                    <SelectItem value="oracle">Oracle EBS</SelectItem>
                    <SelectItem value="dynamics">Microsoft Dynamics</SelectItem>
                    <SelectItem value="totvs">TOTVS Protheus</SelectItem>
                    <SelectItem value="custom">API Customizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Autenticação</Label>
                <Select value={formData.authType} onValueChange={(v) => setFormData(p => ({ ...p, authType: v }))}>
                  <SelectTrigger className="h-9 text-xs bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="certificate">Certificado mTLS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">URL Base do ERP</Label>
                <Input
                  className="h-9 text-xs bg-background/50 border-border/50"
                  placeholder="https://erp.empresa.com/api/v1"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData(p => ({ ...p, baseUrl: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">API Key / Token</Label>
                <Input
                  className="h-9 text-xs bg-background/50 border-border/50"
                  type="password"
                  placeholder="••••••••••••••••"
                  value={formData.apiKey}
                  onChange={(e) => setFormData(p => ({ ...p, apiKey: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Direção de Sincronização</Label>
                <Select value={formData.syncDirection} onValueChange={(v) => setFormData(p => ({ ...p, syncDirection: v }))}>
                  <SelectTrigger className="h-9 text-xs bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bidirectional">Bidirecional</SelectItem>
                    <SelectItem value="inbound">ERP → QTrack (Somente leitura)</SelectItem>
                    <SelectItem value="outbound">QTrack → ERP (Somente escrita)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Intervalo de Sync (minutos)</Label>
                <Select value={formData.syncInterval} onValueChange={(v) => setFormData(p => ({ ...p, syncInterval: v }))}>
                  <SelectTrigger className="h-9 text-xs bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutos</SelectItem>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="360">6 horas</SelectItem>
                    <SelectItem value="1440">24 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Field Mapping */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mapeamento de Campos (QTrack → ERP)</Label>
              <textarea
                className="w-full h-40 text-xs font-mono rounded-lg p-3 bg-background/50 border border-border/50 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                value={formData.fieldMapping}
                onChange={(e) => setFormData(p => ({ ...p, fieldMapping: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">JSON com mapeamento: chave = campo QTrack, valor = campo ERP/SAP</p>
            </div>

            <div className="flex justify-end gap-2">
              {isEditing && (
                <Button size="sm" variant="outline" className="text-xs border-border/50" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
              )}
              <Button
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs gap-1.5"
                onClick={handleSave}
                disabled={saveMutation.isPending || !formData.baseUrl}
              >
                {saveMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar Configuração
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SAP Transaction Codes Reference */}
      <Card className="border" style={{ background: "rgba(15,23,42,0.6)", borderColor: "rgba(255,255,255,0.08)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" style={{ color: "#F5A623" }} />
            Referência SAP QM — Transações Suportadas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { code: "QM01", desc: "Criar Nota QM", status: "active" },
              { code: "QM02", desc: "Modificar Nota QM", status: "active" },
              { code: "QM03", desc: "Exibir Nota QM", status: "active" },
              { code: "QA01", desc: "Criar Lote Inspeção", status: "planned" },
              { code: "QA32", desc: "Decisão de Utilização", status: "planned" },
              { code: "QS21", desc: "Manter Catálogo", status: "planned" },
              { code: "BAPI_QUALNOT", desc: "BAPI Notificação", status: "active" },
              { code: "RFC_READ_TABLE", desc: "Leitura Genérica", status: "active" },
            ].map((tx) => (
              <div
                key={tx.code}
                className="p-3 rounded-lg border text-center"
                style={{
                  background: tx.status === "active" ? "rgba(0,212,170,0.05)" : "rgba(255,255,255,0.02)",
                  borderColor: tx.status === "active" ? "rgba(0,212,170,0.2)" : "rgba(255,255,255,0.06)",
                }}
              >
                <p className="text-xs font-mono font-bold" style={{ color: tx.status === "active" ? "#00D4AA" : "#8BA3BF" }}>{tx.code}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{tx.desc}</p>
                <Badge variant="secondary" className={`text-[9px] mt-1 ${tx.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"}`}>
                  {tx.status === "active" ? "Ativo" : "Planejado"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================
// TRIAGE ACCURACY MONITOR
// =====================================================
function TriageAccuracyMonitor() {
  const { data: accuracyData, isLoading } = trpc.aiControl.triageAccuracy.useQuery();
  const { data: trendData } = trpc.aiControl.accuracyTrend.useQuery();
  const overrideMutation = trpc.aiControl.overrideTriageDecision.useMutation();
  const utils = trpc.useUtils();

  const [overrideForm, setOverrideForm] = useState<{ decisionId: number | null; humanValue: string; reason: string }>({
    decisionId: null,
    humanValue: "",
    reason: "",
  });

  const handleOverride = async () => {
    if (!overrideForm.decisionId || !overrideForm.humanValue) return;
    try {
      await overrideMutation.mutateAsync({
        decisionId: overrideForm.decisionId,
        humanValue: overrideForm.humanValue,
        reason: overrideForm.reason || undefined,
      });
      utils.aiControl.triageAccuracy.invalidate();
      setOverrideForm({ decisionId: null, humanValue: "", reason: "" });
      toast.success("Override registrado. Feedback Agent irá ajustar thresholds.");
    } catch {
      toast.error("Erro ao registrar override");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const data = accuracyData as any;
  const total = data?.total ?? 0;
  const overridden = data?.overridden ?? 0;
  const approved = data?.approved ?? 0;
  const accuracy = data?.accuracy ?? 0;
  const byField = (data?.byField ?? {}) as Record<string, { total: number; overridden: number }>;
  const recentOverrides = (data?.recentOverrides ?? []) as any[];

  const accuracyColor = accuracy >= 90 ? "#00D4AA" : accuracy >= 75 ? "#F5A623" : "#EF4444";
  const accuracyLabel = accuracy >= 90 ? "Excelente" : accuracy >= 75 ? "Bom" : accuracy >= 50 ? "Precisa Ajuste" : "Crítico";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5" style={{ color: "#8B5CF6" }} />
        <h3 className="text-sm font-semibold">Monitoramento de Acurácia — Triage Agent</h3>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border" style={{ background: "rgba(15,23,42,0.6)", borderColor: "rgba(255,255,255,0.08)" }}>
          <CardContent className="pt-4 pb-4 text-center">
            <Target className="h-5 w-5 mx-auto mb-1" style={{ color: accuracyColor }} />
            <p className="text-2xl font-bold" style={{ color: accuracyColor }}>{accuracy}%</p>
            <p className="text-xs text-muted-foreground">Acurácia</p>
            <Badge variant="secondary" className={`text-[9px] mt-1 ${accuracy >= 90 ? "bg-emerald-500/20 text-emerald-400" : accuracy >= 75 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
              {accuracyLabel}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border" style={{ background: "rgba(15,23,42,0.6)", borderColor: "rgba(255,255,255,0.08)" }}>
          <CardContent className="pt-4 pb-4 text-center">
            <Brain className="h-5 w-5 mx-auto mb-1" style={{ color: "#3B82F6" }} />
            <p className="text-2xl font-bold text-blue-400">{total}</p>
            <p className="text-xs text-muted-foreground">Total Decisões</p>
          </CardContent>
        </Card>

        <Card className="border" style={{ background: "rgba(15,23,42,0.6)", borderColor: "rgba(255,255,255,0.08)" }}>
          <CardContent className="pt-4 pb-4 text-center">
            <ThumbsUp className="h-5 w-5 mx-auto mb-1" style={{ color: "#00D4AA" }} />
            <p className="text-2xl font-bold text-emerald-400">{approved}</p>
            <p className="text-xs text-muted-foreground">Aprovadas</p>
          </CardContent>
        </Card>

        <Card className="border" style={{ background: "rgba(15,23,42,0.6)", borderColor: "rgba(255,255,255,0.08)" }}>
          <CardContent className="pt-4 pb-4 text-center">
            <ThumbsDown className="h-5 w-5 mx-auto mb-1" style={{ color: "#EF4444" }} />
            <p className="text-2xl font-bold text-red-400">{overridden}</p>
            <p className="text-xs text-muted-foreground">Overrides</p>
          </CardContent>
        </Card>
      </div>

      {/* Accuracy by Field */}
      {Object.keys(byField).length > 0 && (
        <Card className="border" style={{ background: "rgba(15,23,42,0.6)", borderColor: "rgba(255,255,255,0.08)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" style={{ color: "#8B5CF6" }} />
              Acurácia por Campo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {Object.entries(byField).map(([field, stats]) => {
                const fieldAccuracy = stats.total > 0 ? Math.round(((stats.total - stats.overridden) / stats.total) * 100) : 100;
                const barColor = fieldAccuracy >= 90 ? "#00D4AA" : fieldAccuracy >= 75 ? "#F5A623" : "#EF4444";
                return (
                  <div key={field} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium capitalize">{field}</span>
                      <span className="text-xs text-muted-foreground">{fieldAccuracy}% ({stats.total - stats.overridden}/{stats.total})</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${fieldAccuracy}%`, background: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Overrides */}
      <Card className="border" style={{ background: "rgba(15,23,42,0.6)", borderColor: "rgba(255,255,255,0.08)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <RotateCcw className="h-4 w-4" style={{ color: "#F5A623" }} />
            Overrides Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {recentOverrides.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-400/30" />
              <p className="text-sm text-muted-foreground">Nenhum override registrado.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">O Triage Agent está operando com acurácia total.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">ID</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Tipo</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Defeito</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Confiança</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Data</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Corrigir</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOverrides.map((d: any) => (
                    <tr key={d.id} className="border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      <td className="py-2 px-3 text-xs font-mono">#{d.id}</td>
                      <td className="py-2 px-3 text-xs">{d.decisionType}</td>
                      <td className="py-2 px-3 text-xs font-mono">#{d.defectId}</td>
                      <td className="py-2 px-3 text-xs">{Math.round((d.confidence || 0) * 100)}%</td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {d.createdAt ? new Date(d.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                          onClick={() => setOverrideForm({ decisionId: d.id, humanValue: "", reason: "" })}
                        >
                          Corrigir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Override Form */}
          {overrideForm.decisionId && (
            <div className="mt-4 p-4 rounded-xl border" style={{ background: "rgba(245,166,35,0.05)", borderColor: "rgba(245,166,35,0.2)" }}>
              <p className="text-xs font-semibold text-amber-400 mb-3">Corrigir Decisão #{overrideForm.decisionId}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Valor Correto</Label>
                  <Input
                    className="h-8 text-xs bg-background/50 border-border/50"
                    placeholder="Ex: Categoria correta, severidade correta..."
                    value={overrideForm.humanValue}
                    onChange={(e) => setOverrideForm(p => ({ ...p, humanValue: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Motivo (opcional)</Label>
                  <Input
                    className="h-8 text-xs bg-background/50 border-border/50"
                    placeholder="Ex: Classificação incorreta do tipo de defeito"
                    value={overrideForm.reason}
                    onChange={(e) => setOverrideForm(p => ({ ...p, reason: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button size="sm" variant="outline" className="h-7 text-xs border-border/50" onClick={() => setOverrideForm({ decisionId: null, humanValue: "", reason: "" })}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
                  onClick={handleOverride}
                  disabled={overrideMutation.isPending || !overrideForm.humanValue}
                >
                  {overrideMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Registrar Override
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accuracy Trend Chart */}
      {trendData && (trendData as any[]).length > 0 && (
        <Card className="border" style={{ background: "rgba(15,23,42,0.6)", borderColor: "rgba(255,255,255,0.08)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: "#8B5CF6" }} />
              Tendência de Acurácia — Evolução Semanal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={(trendData as any[]).map(d => ({ ...d, weekLabel: d.week ? new Date(d.week).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "" }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="weekLabel" tick={{ fill: "rgba(148,163,184,0.7)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "rgba(148,163,184,0.7)", fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(value: number) => [`${value}%`, "Acurácia"]}
                  labelFormatter={(label) => `Semana: ${label}`}
                />
                <ReferenceLine y={90} stroke="#00D4AA" strokeDasharray="4 4" strokeOpacity={0.5} />
                <ReferenceLine y={75} stroke="#F5A623" strokeDasharray="4 4" strokeOpacity={0.3} />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  dot={{ fill: "#8B5CF6", r: 4, strokeWidth: 2, stroke: "rgba(15,23,42,0.8)" }}
                  activeDot={{ r: 6, fill: "#A78BFA", stroke: "#8B5CF6", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ background: "#00D4AA" }} />
                <span className="text-[10px] text-muted-foreground">Meta 90%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ background: "#F5A623" }} />
                <span className="text-[10px] text-muted-foreground">Alerta 75%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1 rounded" style={{ background: "#8B5CF6" }} />
                <span className="text-[10px] text-muted-foreground">Acurácia Real</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Loop Info */}
      <Card className="border" style={{ background: "rgba(15,23,42,0.6)", borderColor: "rgba(255,255,255,0.08)" }}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.15)" }}>
              <RotateCcw className="h-4 w-4" style={{ color: "#10B981" }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-400 mb-1">Feedback Loop Automático</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Cada override é processado pelo <strong className="text-foreground">Feedback Agent</strong>, que analisa padrões de erro e ajusta automaticamente os thresholds de confiança do Triage Agent. Após 50-100 defeitos processados, o sistema atinge acurácia estável. A meta é manter acurácia ≥ 90% com taxa de override ≤ 10%.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================
// MAIN PAGE
// =====================================================
export default function AiControlCenter() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const { data: healthData } = trpc.aiControl.health.useQuery();
  const { data: allStats } = trpc.aiControl.metrics.useQuery({ agentName: "all" });

  const systemStatus = (healthData as any)?.status || "healthy";
  const totalDecisions = (allStats as any)?.totalDecisions ?? 0;
  const avgConfidence = (allStats as any)?.avgConfidence ?? 0;

  // KPI data
  const kpis = useMemo(() => [
    {
      label: "Status do Sistema",
      value: systemStatus === "healthy" ? "Saudável" : systemStatus === "degraded" ? "Degradado" : "Offline",
      icon: Activity,
      color: systemStatus === "healthy" ? "#00D4AA" : systemStatus === "degraded" ? "#F5A623" : "#EF4444",
    },
    {
      label: "Agentes Ativos",
      value: "7",
      icon: Bot,
      color: "#8B5CF6",
    },
    {
      label: "Decisões Totais",
      value: totalDecisions.toLocaleString("pt-BR"),
      icon: Brain,
      color: "#3B82F6",
    },
    {
      label: "Confiança Média",
      value: `${Math.round(avgConfidence * 100)}%`,
      icon: TrendingUp,
      color: "#F5A623",
    },
  ], [systemStatus, totalDecisions, avgConfidence]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.15)" }}
            >
              <Bot className="h-5 w-5" style={{ color: "#8B5CF6" }} />
            </div>
            AI Control Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Painel de controle dos 7 agentes autônomos do QTrack System
          </p>
        </div>
        <StatusBadge status={systemStatus} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={i}
              className="border"
              style={{
                background: "rgba(15,23,42,0.8)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${kpi.color}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: kpi.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList
          className="border"
          style={{
            background: "rgba(15,23,42,0.8)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <TabsTrigger value="agents" className="text-xs gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="decisions" className="text-xs gap-1.5">
            <Brain className="h-3.5 w-3.5" />
            Decisões
          </TabsTrigger>
          <TabsTrigger value="guardrails" className="text-xs gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Guardrails
          </TabsTrigger>
          <TabsTrigger value="erp" className="text-xs gap-1.5">
            <Server className="h-3.5 w-3.5" />
            ERP/SAP
          </TabsTrigger>
          <TabsTrigger value="accuracy" className="text-xs gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Acurácia
          </TabsTrigger>
        </TabsList>

        {/* Agents Tab */}
        <TabsContent value="agents">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {AGENTS.map((agent) => (
              <AgentCard
                key={agent.name}
                agent={agent}
                onSelect={() => setSelectedAgent(agent.name)}
              />
            ))}
          </div>
        </TabsContent>

        {/* Decisions Tab */}
        <TabsContent value="decisions">
          <Card
            className="border"
            style={{
              background: "rgba(15,23,42,0.8)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4" style={{ color: "#8B5CF6" }} />
                Histórico de Decisões
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <DecisionsTable />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guardrails Tab */}
        <TabsContent value="guardrails">
          <Card
            className="border"
            style={{
              background: "rgba(15,23,42,0.8)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <CardContent className="pt-6">
              <GuardrailsConfig />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ERP/SAP Tab */}
        <TabsContent value="erp">
          <Card
            className="border"
            style={{
              background: "rgba(15,23,42,0.8)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <CardContent className="pt-6">
              <ErpIntegrationConfig />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accuracy Tab */}
        <TabsContent value="accuracy">
          <Card
            className="border"
            style={{
              background: "rgba(15,23,42,0.8)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <CardContent className="pt-6">
              <TriageAccuracyMonitor />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
