import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  ArrowLeft, Save, ChevronRight, Clock, User, Calendar, 
  FileText, MessageSquare, History, AlertTriangle, X, Pause, Download,
  Filter, GitCommitHorizontal, Plus, Trash2, RotateCcw, ArrowRightLeft, Search
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { generateDefect8DReport } from "@/lib/pdfExport";

// =====================================================
// AUDIT HISTORY TAB — Diff Visual Component
// =====================================================
const ACTION_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  CREATE: { icon: Plus, label: "Criação", color: "text-green-600", bg: "bg-green-100" },
  UPDATE: { icon: ArrowRightLeft, label: "Alteração", color: "text-blue-600", bg: "bg-blue-100" },
  DELETE: { icon: Trash2, label: "Exclusão", color: "text-red-600", bg: "bg-red-100" },
  ADVANCE_STEP: { icon: ChevronRight, label: "Avanço de Etapa", color: "text-purple-600", bg: "bg-purple-100" },
  RESTORE: { icon: RotateCcw, label: "Restauração", color: "text-amber-600", bg: "bg-amber-100" },
};

function DiffDisplay({ oldValue, newValue }: { oldValue: string | null; newValue: string | null }) {
  const old = oldValue || "(vazio)";
  const nw = newValue || "(vazio)";
  if (old === nw) return <span className="text-xs text-muted-foreground">{nw}</span>;
  return (
    <div className="flex flex-col gap-1 text-xs mt-1">
      <div className="flex items-start gap-2">
        <span className="shrink-0 px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-mono line-through">
          {old.length > 120 ? old.slice(0, 120) + "..." : old}
        </span>
      </div>
      <div className="flex items-start gap-2">
        <span className="shrink-0 px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-mono">
          {nw.length > 120 ? nw.slice(0, 120) + "..." : nw}
        </span>
      </div>
    </div>
  );
}

function AuditHistoryTab({ auditLogs }: { auditLogs: any[] }) {
  const [filterField, setFilterField] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [searchText, setSearchText] = useState("");

  const uniqueFields = useMemo(() => {
    const fields = new Set(auditLogs.map((l: any) => l.fieldName).filter(Boolean));
    return Array.from(fields).sort();
  }, [auditLogs]);

  const uniqueUsers = useMemo(() => {
    const users = new Set(auditLogs.map((l: any) => l.userName).filter(Boolean));
    return Array.from(users).sort();
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log: any) => {
      if (filterField && filterField !== "all_fields" && log.fieldName !== filterField) return false;
      if (filterUser && filterUser !== "all_users" && log.userName !== filterUser) return false;
      if (filterAction && filterAction !== "all_actions" && log.action !== filterAction) return false;
      if (searchText) {
        const s = searchText.toLowerCase();
        const matches = [
          log.fieldName, log.oldValue, log.newValue, log.userName, log.action
        ].some(v => v && String(v).toLowerCase().includes(s));
        if (!matches) return false;
      }
      return true;
    });
  }, [auditLogs, filterField, filterUser, filterAction, searchText]);

  const hasFilters = filterField || filterUser || filterAction || searchText;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações
            <Badge variant="secondary" className="ml-2">{filteredLogs.length}</Badge>
          </CardTitle>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterField(""); setFilterUser(""); setFilterAction(""); setSearchText(""); }}>
              Limpar filtros
            </Button>
          )}
        </div>
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={filterField} onValueChange={setFilterField}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Campo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_fields">Todos os campos</SelectItem>
              {uniqueFields.map((f: string) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_users">Todos os usuários</SelectItem>
              {uniqueUsers.map((u: string) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_actions">Todas as ações</SelectItem>
              {Object.entries(ACTION_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLogs.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-0">
              {filteredLogs.map((log: any, idx: number) => {
                const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.UPDATE;
                const IconComp = config.icon;
                return (
                  <div key={log.id} className="relative pl-10 pb-4 last:pb-0">
                    {/* Timeline dot */}
                    <div className={`absolute left-2 top-1 w-5 h-5 rounded-full ${config.bg} flex items-center justify-center ring-2 ring-background`}>
                      <IconComp className={`h-3 w-3 ${config.color}`} />
                    </div>
                    {/* Content */}
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50 hover:border-border transition-colors">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] ${config.color} border-current`}>
                            {config.label}
                          </Badge>
                          {log.fieldName && (
                            <span className="text-sm font-medium text-foreground">{log.fieldName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{log.userName || "Sistema"}</span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>{new Date(log.timestamp).toLocaleString("pt-BR")}</span>
                        </div>
                      </div>
                      {(log.oldValue || log.newValue) && log.action !== "CREATE" && (
                        <DiffDisplay oldValue={log.oldValue} newValue={log.newValue} />
                      )}
                      {log.action === "CREATE" && log.newValue && (
                        <div className="text-xs mt-1">
                          <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-mono">
                            {String(log.newValue).length > 120 ? String(log.newValue).slice(0, 120) + "..." : log.newValue}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <History className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {hasFilters ? "Nenhuma alteração encontrada com os filtros aplicados" : "Nenhuma alteração registrada"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const WORKFLOW_STEPS = [
  { id: 1, label: "Disposição", shortLabel: "Disp." },
  { id: 2, label: "Análise Técnica", shortLabel: "Análise" },
  { id: 3, label: "Causa Técnica", shortLabel: "Causa T." },
  { id: 4, label: "Causa Raiz", shortLabel: "Causa R." },
  { id: 5, label: "Ação Corretiva", shortLabel: "Ação C." },
  { id: 6, label: "Verificação", shortLabel: "Verif." },
  { id: 7, label: "Fechado", shortLabel: "Fechado" },
  { id: 8, label: "Pausado", shortLabel: "Pausado" },
];

const STEPS = [
  "Aguardando Disposição",
  "Aguardando Análise Técnica",
  "Aguardando Causa Raiz",
  "Aguardando Ação Corretiva",
  "Aguardando Validação de Ação Corretiva",
  "CLOSED"
] as const;

function getStepIndex(step: string): number {
  return STEPS.indexOf(step as any);
}

function getNextStep(currentStep: string): typeof STEPS[number] | null {
  const currentIndex = getStepIndex(currentStep);
  if (currentIndex < STEPS.length - 1) {
    return STEPS[currentIndex + 1];
  }
  return null;
}

function getStepNumber(step: string): number {
  const index = getStepIndex(step);
  return index >= 0 ? index + 1 : 1;
}

export default function DefectDetail() {
  const [, params] = useRoute("/defects/:id");
  const [, setLocation] = useLocation();
  const defectId = params?.id ? parseInt(params.id) : null;
  const isNew = params?.id === "new";

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [newComment, setNewComment] = useState("");

  const { data: defect, isLoading, refetch } = trpc.defect.byId.useQuery(
    { id: defectId! },
    { enabled: !!defectId && !isNew }
  );

  const { data: comments } = trpc.comment.list.useQuery(
    { defectId: defectId! },
    { enabled: !!defectId && !isNew }
  );

  const { data: auditLogs } = trpc.defect.auditLogs.useQuery(
    { defectId: defectId! },
    { enabled: !!defectId && !isNew }
  );

  const { data: attachments } = trpc.attachment.list.useQuery(
    { defectId: defectId! },
    { enabled: !!defectId && !isNew }
  );

  const createMutation = trpc.defect.create.useMutation({
    onSuccess: (data) => {
      toast.success("Defeito criado com sucesso!");
      setLocation(`/defects/${data?.id}`);
    },
    onError: (error) => {
      toast.error(`Erro ao criar: ${error.message}`);
    },
  });

  const updateMutation = trpc.defect.update.useMutation({
    onSuccess: () => {
      toast.success("Defeito atualizado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const advanceStepMutation = trpc.defect.advanceStep.useMutation({
    onSuccess: () => {
      toast.success("Etapa avançada com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao avançar etapa: ${error.message}`);
    },
  });

  const addCommentMutation = trpc.comment.create.useMutation({
    onSuccess: () => {
      toast.success("Comentário adicionado!");
      setNewComment("");
      refetch();
    },
  });

  const utils = trpc.useUtils();

  const uploadMutation = trpc.attachment.upload.useMutation({
    onSuccess: () => {
      toast.success("Arquivo enviado com sucesso!");
      utils.attachment.list.invalidate({ defectId: defectId! });
    },
    onError: (error) => {
      toast.error(`Erro no upload: ${error.message}`);
    },
  });

  const deleteMutation = trpc.attachment.delete.useMutation({
    onSuccess: () => {
      toast.success("Anexo excluído!");
      utils.attachment.list.invalidate({ defectId: defectId! });
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (isNew) {
      createMutation.mutate({
        docNumber: formData.docNumber || "",
        openDate: formData.openDate || new Date().toISOString().split("T")[0],
        ...formData,
      });
    } else if (defectId) {
      updateMutation.mutate({ id: defectId, ...formData });
    }
  };

  const handleAdvanceStep = () => {
    if (!defect || !defectId) return;
    const nextStep = getNextStep(defect.step);
    if (nextStep) {
      advanceStepMutation.mutate({ id: defectId, step: nextStep });
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !defectId) return;
    addCommentMutation.mutate({ defectId, content: newComment });
  };

  const getValue = (field: string) => {
    if (formData[field] !== undefined) return formData[field];
    if (defect) return (defect as any)[field] || "";
    return "";
  };

  const setValue = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  if (isLoading && !isNew) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const currentStepIndex = defect ? getStepIndex(defect.step) : 0;
  const nextStep = defect ? getNextStep(defect.step) : null;
  const currentStepNumber = defect ? getStepNumber(defect.step) : 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/defects")}
            className="h-10 px-4 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-medium transition-all duration-200 shadow-sm hover:shadow group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Voltar
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {isNew ? "Novo Defeito" : `Defeito ${defect?.docNumber}`}
              </h1>
              {defect && defect.status === "DELAYED" && (
                <Badge className="bg-rose-100 text-rose-700 border-rose-200 font-semibold">
                  DELAYED
                </Badge>
              )}
            </div>
            {defect && (
              <p className="text-muted-foreground mt-1">
                Responsável: <span className="font-medium text-foreground">{defect.currentResponsible}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleSave} 
            disabled={createMutation.isPending || updateMutation.isPending}
            className="h-9"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
          {defect && (
            <Button
              variant="outline"
              onClick={() => {
                if (!defect) return;
                const lang = (document.documentElement.lang || 'pt-BR') as 'pt-BR' | 'en';
                generateDefect8DReport(
                  defect as any,
                  comments || [],
                  attachments || [],
                  lang.startsWith('en') ? 'en' : 'pt-BR'
                );
                toast.success('PDF 8D gerado com sucesso!');
              }}
              className="h-9"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF 8D
            </Button>
          )}
          {defect && nextStep && (
            <Button 
              onClick={handleAdvanceStep}
              disabled={advanceStepMutation.isPending}
              className="h-9 bg-primary"
            >
              Avançar etapa
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          
        </div>
      </div>

      {/* Aging Summary Cards */}
      {defect && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="aging-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Aging Total</p>
              <p className="text-3xl font-bold text-rose-600">{defect.agingTotal} <span className="text-lg font-normal">Dias</span></p>
            </CardContent>
          </Card>
          <Card className="aging-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Aging na Etapa</p>
              <p className="text-3xl font-bold text-sky-600">{defect.agingByStep} <span className="text-lg font-normal">Dias</span></p>
            </CardContent>
          </Card>
          <Card className="aging-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Bucket</p>
              <p className="text-3xl font-bold text-amber-600">{defect.bucketAging}</p>
            </CardContent>
          </Card>
          <Card className="aging-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Dias em Atraso</p>
              <p className={`text-3xl font-bold flex items-center gap-2 ${defect.daysLate > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {defect.daysLate > 0 ? <AlertTriangle className="h-5 w-5" /> : null}
                {defect.daysLate || 0} <span className="text-lg font-normal">Dias</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workflow Progress */}
      {defect && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="workflow-progress">
              {WORKFLOW_STEPS.slice(0, 7).map((step, index) => {
                const isCompleted = index < currentStepNumber;
                const isCurrent = index + 1 === currentStepNumber;
                return (
                  <div 
                    key={step.id} 
                    className={`workflow-step ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}
                  >
                    <div className={`workflow-step-number ${isCompleted ? "bg-emerald-500 text-white" : isCurrent ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                      {index + 1}
                    </div>
                    <span className="workflow-step-label">{step.label}</span>
                  </div>
                );
              })}
              <div className="workflow-step">
                <div className="workflow-step-number bg-muted text-muted-foreground">
                  <Pause className="h-3 w-3" />
                </div>
                <span className="workflow-step-label">Pausado</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="info" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="8d" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            8D
          </TabsTrigger>
          <TabsTrigger value="evidence" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Evidências
          </TabsTrigger>
          <TabsTrigger value="comments" disabled={isNew} className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Comentários
          </TabsTrigger>
          <TabsTrigger value="history" disabled={isNew} className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Auditoria
          </TabsTrigger>
          <TabsTrigger value="costs" disabled={isNew} className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Custos
          </TabsTrigger>
          <TabsTrigger value="ai" disabled={isNew} className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            IA
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Visão Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
                <div>
                  <p className="text-sm text-muted-foreground">Disposição</p>
                  <p className="font-medium">{getValue("disposition") || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fornecedor</p>
                  <p className="font-medium">{getValue("supplier") || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">RCL</p>
                  <p className="font-medium">{getValue("rcl") || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bover 1163</p>
                  <p className="font-medium">{getValue("bover1163") || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modelo</p>
                  <p className="font-medium">{getValue("model") || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tomcedos</p>
                  <p className="font-medium">{getValue("tomcedos") || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Identification */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Identificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Doc Number</label>
                    <Input
                      value={getValue("docNumber")}
                      onChange={(e) => setValue("docNumber", e.target.value)}
                      disabled={!isNew}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Data Abertura</label>
                    <Input
                      type="date"
                      value={getValue("openDate")}
                      onChange={(e) => setValue("openDate", e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Fornecedor</label>
                    <Input
                      value={getValue("supplier")}
                      onChange={(e) => setValue("supplier", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Modelo</label>
                    <Input
                      value={getValue("model")}
                      onChange={(e) => setValue("model", e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Part Number</label>
                  <Input
                    value={getValue("pn")}
                    onChange={(e) => setValue("pn", e.target.value)}
                    className="h-9"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Classification */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Classificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Status</label>
                    <Select
                      value={getValue("status") || "ONGOING"}
                      onValueChange={(v) => setValue("status", v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ONGOING">ONGOING</SelectItem>
                        <SelectItem value="CLOSED">CLOSED</SelectItem>
                        <SelectItem value="DELAYED">DELAYED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Severidade (MG)</label>
                    <Select
                      value={getValue("mg") || "B"}
                      onValueChange={(v) => setValue("mg", v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S">S - Crítico</SelectItem>
                        <SelectItem value="A">A - Alto</SelectItem>
                        <SelectItem value="B">B - Médio</SelectItem>
                        <SelectItem value="C">C - Baixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Sintoma</label>
                  <Input
                    value={getValue("symptom")}
                    onChange={(e) => setValue("symptom", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Descrição</label>
                  <Textarea
                    value={getValue("description")}
                    onChange={(e) => setValue("description", e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 8D Tab */}
        <TabsContent value="8d" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">D3 - Ações de Contenção</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Data Disposição</label>
                  <Input
                    type="date"
                    value={getValue("dispositionDate")}
                    onChange={(e) => setValue("dispositionDate", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Disposição</label>
                  <Textarea
                    value={getValue("disposition")}
                    onChange={(e) => setValue("disposition", e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">D4 - Análise de Causa Raiz</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Data Causa Raiz</label>
                  <Input
                    type="date"
                    value={getValue("rootCauseDate")}
                    onChange={(e) => setValue("rootCauseDate", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Causa Raiz</label>
                  <Textarea
                    value={getValue("rootCause")}
                    onChange={(e) => setValue("rootCause", e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">D5/D6 - Ações Corretivas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Data Ação Corretiva</label>
                  <Input
                    type="date"
                    value={getValue("correctiveActionDate")}
                    onChange={(e) => setValue("correctiveActionDate", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Ação Corretiva</label>
                  <Textarea
                    value={getValue("correctiveAction")}
                    onChange={(e) => setValue("correctiveAction", e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">D7/D8 - Verificação e Fechamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Data Verificação</label>
                  <Input
                    type="date"
                    value={getValue("verificationDate")}
                    onChange={(e) => setValue("verificationDate", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Data Fechamento</label>
                  <Input
                    type="date"
                    value={getValue("closeDate")}
                    onChange={(e) => setValue("closeDate", e.target.value)}
                    className="h-9"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Evidências / Anexos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Area */}
              <div
                className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv';
                  input.onchange = async (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (!files || !defectId) return;
                    for (const file of Array.from(files)) {
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error(`${file.name}: Arquivo muito grande (max 10MB)`);
                        continue;
                      }
                      try {
                        const reader = new FileReader();
                        const base64 = await new Promise<string>((resolve, reject) => {
                          reader.onload = () => {
                            const result = reader.result as string;
                            resolve(result.split(',')[1]);
                          };
                          reader.onerror = reject;
                          reader.readAsDataURL(file);
                        });
                        await uploadMutation.mutateAsync({
                          defectId,
                          fileName: file.name,
                          fileData: base64,
                          mimeType: file.type || 'application/octet-stream',
                          fileSize: file.size,
                        });
                      } catch (err) {
                        toast.error(`Erro ao enviar ${file.name}`);
                      }
                    }
                  };
                  input.click();
                }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5'); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                  const files = e.dataTransfer.files;
                  if (!files || !defectId) return;
                  for (const file of Array.from(files)) {
                    if (file.size > 10 * 1024 * 1024) {
                      toast.error(`${file.name}: Arquivo muito grande (max 10MB)`);
                      continue;
                    }
                    try {
                      const reader = new FileReader();
                      const base64 = await new Promise<string>((resolve, reject) => {
                        reader.onload = () => {
                          const result = reader.result as string;
                          resolve(result.split(',')[1]);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                      });
                      await uploadMutation.mutateAsync({
                        defectId,
                        fileName: file.name,
                        fileData: base64,
                        mimeType: file.type || 'application/octet-stream',
                        fileSize: file.size,
                      });
                    } catch (err) {
                      toast.error(`Erro ao enviar ${file.name}`);
                    }
                  }
                }}
              >
                <FileText className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">Arraste arquivos aqui ou clique para fazer upload</p>
                <p className="text-xs mt-1">Imagens, PDF, Excel, Word (max 10MB)</p>
                {uploadMutation.isPending && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </div>
                )}
              </div>

              {/* Attachment List */}
              {attachments && attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((att: any) => {
                    const isImage = att.mimeType?.startsWith('image/');
                    return (
                      <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                        {isImage ? (
                          <img src={att.fileUrl} alt={att.fileName} className="h-12 w-12 rounded object-cover border" />
                        ) : (
                          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{att.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {att.uploadedByName || 'Usuário'} · {new Date(att.createdAt).toLocaleString('pt-BR')}
                            {att.fileSize && ` · ${(att.fileSize / 1024).toFixed(0)} KB`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={att.fileUrl} target="_blank" rel="noopener noreferrer">Abrir</a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('Excluir este anexo?')) {
                                deleteMutation.mutate({ id: att.id });
                              }
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma evidência anexada ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Comentários</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Textarea
                  placeholder="Adicione um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  className="self-end"
                >
                  Enviar
                </Button>
              </div>
              
              <div className="space-y-3 mt-4">
                {comments && comments.length > 0 ? (
                  comments.map((comment: any) => (
                    <div key={comment.id} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{comment.authorName || "Usuário"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum comentário ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <AuditHistoryTab auditLogs={auditLogs || []} />
        </TabsContent>

        {/* Costs Tab (COPQ) */}
        <TabsContent value="costs">
          {!isNew && defectId && <CostsTab defectId={defectId} />}
        </TabsContent>

        {/* AI Suggestions Tab */}
        <TabsContent value="ai">
          {!isNew && defectId && <AiSuggestionsTab defectId={defectId} defectStep={defect?.step || ""} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =====================================================
// COSTS TAB (COPQ)
// =====================================================
const COST_TYPES = [
  "SCRAP","REWORK","REINSPECTION","DOWNTIME","WARRANTY","RETURN",
  "RECALL","COMPLAINT","INSPECTION","TESTING","AUDIT","TRAINING",
  "PLANNING","QUALIFICATION","OTHER"
] as const;

const COST_TYPE_LABELS: Record<string, string> = {
  SCRAP: "Sucata", REWORK: "Retrabalho", REINSPECTION: "Reinspeção",
  DOWNTIME: "Parada", WARRANTY: "Garantia", RETURN: "Devolução",
  RECALL: "Recall", COMPLAINT: "Reclamação", INSPECTION: "Inspeção",
  TESTING: "Teste", AUDIT: "Auditoria", TRAINING: "Treinamento",
  PLANNING: "Planejamento", QUALIFICATION: "Qualificação", OTHER: "Outro",
};

function CostsTab({ defectId }: { defectId: number }) {
  const [showAdd, setShowAdd] = useState(false);
  const [costType, setCostType] = useState<string>("SCRAP");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const utils = trpc.useUtils();

  const { data: costs, isLoading } = trpc.copq.byDefect.useQuery({ defectId });

  const addCost = trpc.copq.addCost.useMutation({
    onSuccess: () => {
      toast.success("Custo adicionado!");
      utils.copq.byDefect.invalidate({ defectId });
      setShowAdd(false);
      setAmount("");
      setDescription("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCost = trpc.copq.deleteCost.useMutation({
    onSuccess: () => {
      toast.success("Custo removido!");
      utils.copq.byDefect.invalidate({ defectId });
    },
  });

  const totalCost = costs?.reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0) || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-red-500">R$</span> Custos COPQ
            <Badge variant="secondary">{costs?.length || 0}</Badge>
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-red-600">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalCost)}
            </span>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showAdd && (
          <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select value={costType} onValueChange={setCostType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COST_TYPES.map(ct => (
                    <SelectItem key={ct} value={ct}>{COST_TYPE_LABELS[ct] || ct}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Valor (R$)" value={amount} onChange={(e) => setAmount(e.target.value)} min="0.01" step="0.01" />
              <Input placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => {
                if (!amount || parseFloat(amount) <= 0) { toast.error("Valor deve ser positivo"); return; }
                addCost.mutate({ defectId, costType: costType as any, amount: parseFloat(amount), description: description || undefined });
              }} disabled={addCost.isPending}>
                {addCost.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : costs && costs.length > 0 ? (
          <div className="space-y-2">
            {costs.map((cost: any) => (
              <div key={cost.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">{COST_TYPE_LABELS[cost.costType] || cost.costType}</Badge>
                  <span className="font-medium">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: cost.currency || "BRL" }).format(parseFloat(cost.amount))}
                  </span>
                  {cost.description && <span className="text-sm text-muted-foreground">{cost.description}</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteCost.mutate({ id: cost.id })} className="text-red-500 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <span className="text-3xl">R$</span>
            <p className="mt-2">Nenhum custo registrado para este defeito</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// AI SUGGESTIONS TAB
// =====================================================
import { Sparkles, Check, XCircle, RefreshCw } from "lucide-react";

function AiSuggestionsTab({ defectId, defectStep }: { defectId: number; defectStep: string }) {
  const utils = trpc.useUtils();
  const { data: suggestions, isLoading } = trpc.ai.byDefect.useQuery({ defectId });

  const suggestMutation = trpc.ai.suggestRootCause.useMutation({
    onSuccess: () => {
      toast.success("Sugestão de IA gerada!");
      utils.ai.byDefect.invalidate({ defectId });
    },
    onError: (e) => toast.error(`Erro na IA: ${e.message}`),
  });

  const respondMutation = trpc.ai.respondToSuggestion.useMutation({
    onSuccess: () => {
      toast.success("Resposta registrada!");
      utils.ai.byDefect.invalidate({ defectId });
    },
  });

  const rootCauseSuggestion = suggestions?.find((s: any) => s.type === "ROOT_CAUSE");
  const metadata = rootCauseSuggestion?.metadata as any;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Sugestões de IA
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => suggestMutation.mutate({ defectId, force: !!rootCauseSuggestion })}
            disabled={suggestMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${suggestMutation.isPending ? "animate-spin" : ""}`} />
            {rootCauseSuggestion ? "Regenerar" : "Gerar Sugestão"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {suggestMutation.isPending ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded" />
            <p className="text-sm text-muted-foreground text-center mt-4">Analisando defeito com IA... (pode levar até 30s)</p>
          </div>
        ) : rootCauseSuggestion ? (
          <div className="space-y-4">
            {/* Confidence Badge */}
            <div className="flex items-center gap-3">
              <Badge className={`${
                parseFloat(rootCauseSuggestion.confidence || "0") >= 0.7 ? "bg-green-500" :
                parseFloat(rootCauseSuggestion.confidence || "0") >= 0.5 ? "bg-yellow-500" : "bg-red-500"
              } text-white`}>
                Confiança: {(parseFloat(rootCauseSuggestion.confidence || "0") * 100).toFixed(0)}%
              </Badge>
              {rootCauseSuggestion.accepted === true && <Badge className="bg-green-100 text-green-700"><Check className="h-3 w-3 mr-1" /> Aceita</Badge>}
              {rootCauseSuggestion.accepted === false && <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" /> Rejeitada</Badge>}
            </div>

            {/* Suggested Category */}
            {rootCauseSuggestion.suggestedCategory && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-medium text-purple-800">Categoria Sugerida</p>
                <p className="text-lg font-bold text-purple-900">{rootCauseSuggestion.suggestedCategory}</p>
              </div>
            )}

            {/* Reasoning */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Raciocínio</p>
              <p className="text-sm text-muted-foreground">{rootCauseSuggestion.suggestion}</p>
            </div>

            {/* Suggested Actions */}
            {metadata?.suggestedActions && metadata.suggestedActions.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">Ações Corretivas Sugeridas</p>
                <ul className="space-y-1">
                  {metadata.suggestedActions.map((action: string, i: number) => (
                    <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Accept/Reject Buttons */}
            {rootCauseSuggestion.accepted === null && (
              <div className="flex gap-2">
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => respondMutation.mutate({ suggestionId: rootCauseSuggestion.id, accepted: true })}>
                  <Check className="h-4 w-4 mr-1" /> Aceitar
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => respondMutation.mutate({ suggestionId: rootCauseSuggestion.id, accepted: false })}>
                  <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 mx-auto text-purple-300 mb-3" />
            <p className="text-muted-foreground mb-2">Nenhuma sugestão de IA disponível</p>
            <p className="text-sm text-muted-foreground">
              Clique em "Gerar Sugestão" para obter uma análise de causa raiz assistida por IA
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
