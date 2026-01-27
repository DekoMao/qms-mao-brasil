import { useState } from "react";
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
  FileText, MessageSquare, History, AlertTriangle, X, Pause
} from "lucide-react";

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
            size="icon" 
            onClick={() => setLocation("/defects")}
            className="h-9 w-9 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
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
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <X className="h-4 w-4" />
          </Button>
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
          <TabsTrigger value="info" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="8d" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            8D
          </TabsTrigger>
          <TabsTrigger value="evidence" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Evidências
          </TabsTrigger>
          <TabsTrigger value="comments" disabled={isNew} className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Comentários
          </TabsTrigger>
          <TabsTrigger value="history" disabled={isNew} className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Auditoria
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
              <CardTitle className="text-lg">Evidências</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <FileText className="h-12 w-12 mb-4 opacity-30" />
                <p className="font-medium">Nenhuma evidência anexada</p>
                <p className="text-sm mt-1">Arraste arquivos aqui ou clique para fazer upload</p>
                <Button variant="outline" className="mt-4">
                  Selecionar Arquivos
                </Button>
              </div>
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Auditoria</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs && auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border-b last:border-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <History className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{log.userName || "Sistema"}</span>
                          {" alterou "}
                          <span className="font-medium">{log.field}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.oldValue || "(vazio)"} → {log.newValue || "(vazio)"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma alteração registrada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
