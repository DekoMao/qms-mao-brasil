import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { toast } from "sonner";

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
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nível</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((d: any) => {
            const agent = AGENTS.find(a => a.name === d.agentName);
            return (
              <tr
                key={d.id}
                className="border-b transition-colors hover:bg-muted/30"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {agent && (
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ background: agent.bgColor }}
                      >
                        <agent.icon className="h-3.5 w-3.5" style={{ color: agent.color }} />
                      </div>
                    )}
                    <span className="text-xs font-medium">{agent?.label || d.agentName}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">{d.decisionType}</td>
                <td className="py-3 px-4 text-xs">
                  {d.defectId ? (
                    <span className="font-mono" style={{ color: "#00D4AA" }}>#{d.defectId}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.round((d.confidence || 0) * 100)}%`,
                          background: (d.confidence || 0) >= 0.85 ? "#00D4AA" : (d.confidence || 0) >= 0.60 ? "#F5A623" : "#EF4444",
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono">{Math.round((d.confidence || 0) * 100)}%</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <AutonomyBadge level={d.autonomyLevel || "hitl"} />
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={d.status || "pending"} />
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">
                  {d.createdAt ? new Date(d.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                </td>
                <td className="py-3 px-4 text-right">
                  {d.status === "pending_review" && (
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        onClick={(e) => { e.stopPropagation(); handleApprove(d.id); }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={(e) => { e.stopPropagation(); handleReject(d.id); }}
                      >
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
      </Tabs>
    </div>
  );
}
