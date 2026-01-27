import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText, MessageSquare, History, AlertTriangle 
} from "lucide-react";

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
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const currentStepIndex = defect ? getStepIndex(defect.step) : 0;
  const nextStep = defect ? getNextStep(defect.step) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/defects")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? "Novo Defeito" : `Defeito ${defect?.docNumber}`}
            </h1>
            {defect && (
              <div className="flex items-center gap-2 mt-1">
                <Badge className={defect.status === "CLOSED" ? "status-closed" : defect.status === "DELAYED" ? "status-delayed" : "status-ongoing"}>
                  {defect.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Responsável: <strong>{defect.currentResponsible}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
          {defect && nextStep && (
            <Button 
              variant="default" 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleAdvanceStep}
              disabled={advanceStepMutation.isPending}
            >
              Avançar para {nextStep.replace("Aguardando ", "")}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Workflow Progress */}
      {defect && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progresso do Workflow 8D</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {STEPS.map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`flex flex-col items-center ${index <= currentStepIndex ? "text-primary" : "text-muted-foreground"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${index < currentStepIndex ? "bg-green-500 text-white" : 
                        index === currentStepIndex ? "bg-primary text-primary-foreground" : 
                        "bg-muted"}`}>
                      {index < currentStepIndex ? "✓" : index + 1}
                    </div>
                    <span className="text-xs mt-1 max-w-[80px] text-center truncate">
                      {step.replace("Aguardando ", "").substring(0, 12)}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-12 h-0.5 mx-1 ${index < currentStepIndex ? "bg-green-500" : "bg-muted"}`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aging Summary */}
      {defect && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{defect.agingTotal}</div>
              <p className="text-xs text-muted-foreground">Aging Total (dias)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{defect.agingByStep}</div>
              <p className="text-xs text-muted-foreground">Aging na Etapa</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <Badge className={`bucket-${defect.bucketAging === "<=4" ? "4" : defect.bucketAging === "5-14" ? "14" : defect.bucketAging === "15-29" ? "29" : defect.bucketAging === "30-59" ? "59" : "60"}`}>
                {defect.bucketAging}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Bucket Aging</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className={`text-2xl font-bold ${defect.daysLate > 0 ? "text-red-600" : ""}`}>
                {defect.daysLate || 0}
              </div>
              <p className="text-xs text-muted-foreground">Dias em Atraso</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm font-medium">{defect.weekKey}</div>
              <p className="text-xs text-muted-foreground">Semana de Abertura</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info"><FileText className="h-4 w-4 mr-2" />Informações</TabsTrigger>
          <TabsTrigger value="8d"><Clock className="h-4 w-4 mr-2" />Processo 8D</TabsTrigger>
          <TabsTrigger value="comments" disabled={isNew}><MessageSquare className="h-4 w-4 mr-2" />Comentários</TabsTrigger>
          <TabsTrigger value="history" disabled={isNew}><History className="h-4 w-4 mr-2" />Histórico</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Identification */}
            <Card>
              <CardHeader>
                <CardTitle>Identificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Doc Number *</label>
                    <Input value={getValue("docNumber")} onChange={(e) => setValue("docNumber", e.target.value)} placeholder="XX.MM.AA" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data de Abertura *</label>
                    <Input type="date" value={getValue("openDate")} onChange={(e) => setValue("openDate", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Severidade (MG)</label>
                    <Select value={getValue("mg") || "none"} onValueChange={(v) => setValue("mg", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        <SelectItem value="S">S - Safety</SelectItem>
                        <SelectItem value="A">A - Blocking</SelectItem>
                        <SelectItem value="B">B - Major</SelectItem>
                        <SelectItem value="C">C - Minor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Categoria</label>
                    <Input value={getValue("category")} onChange={(e) => setValue("category", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">QCR Number</label>
                  <Input value={getValue("qcrNumber")} onChange={(e) => setValue("qcrNumber", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Product */}
            <Card>
              <CardHeader>
                <CardTitle>Produto / Material</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Modelo</label>
                    <Input value={getValue("model")} onChange={(e) => setValue("model", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cliente</label>
                    <Input value={getValue("customer")} onChange={(e) => setValue("customer", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Part Number (PN)</label>
                    <Input value={getValue("pn")} onChange={(e) => setValue("pn", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Material</label>
                    <Input value={getValue("material")} onChange={(e) => setValue("material", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Defect Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informações do Defeito</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Sintoma</label>
                  <Input value={getValue("symptom")} onChange={(e) => setValue("symptom", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Detecção</label>
                    <Input value={getValue("detection")} onChange={(e) => setValue("detection", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantidade</label>
                    <Input type="number" value={getValue("qty")} onChange={(e) => setValue("qty", parseInt(e.target.value) || null)} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea value={getValue("description")} onChange={(e) => setValue("description", e.target.value)} rows={3} />
                </div>
              </CardContent>
            </Card>

            {/* Supplier */}
            <Card>
              <CardHeader>
                <CardTitle>Fornecedor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Fornecedor</label>
                  <Input value={getValue("supplier")} onChange={(e) => setValue("supplier", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Owner</label>
                    <Input value={getValue("owner")} onChange={(e) => setValue("owner", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Target Date</label>
                    <Input type="date" value={getValue("targetDate")} onChange={(e) => setValue("targetDate", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Status Feedback</label>
                  <Select value={getValue("statusSupplyFB") || "none"} onValueChange={(v) => setValue("statusSupplyFB", v === "none" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      <SelectItem value="On Time">On Time</SelectItem>
                      <SelectItem value="Late Replay">Late Replay</SelectItem>
                      <SelectItem value="DELAYED">DELAYED</SelectItem>
                      <SelectItem value="ONGOING">ONGOING</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 8D Tab */}
        <TabsContent value="8d" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Datas do Processo 8D</CardTitle>
                <CardDescription>Preencha as datas conforme o avanço do processo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Disposição</label>
                    <Input type="date" value={getValue("dateDisposition")} onChange={(e) => setValue("dateDisposition", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Análise Técnica</label>
                    <Input type="date" value={getValue("dateTechAnalysis")} onChange={(e) => setValue("dateTechAnalysis", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Causa Raiz</label>
                    <Input type="date" value={getValue("dateRootCause")} onChange={(e) => setValue("dateRootCause", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Ação Corretiva</label>
                    <Input type="date" value={getValue("dateCorrectiveAction")} onChange={(e) => setValue("dateCorrectiveAction", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Validação</label>
                  <Input type="date" value={getValue("dateValidation")} onChange={(e) => setValue("dateValidation", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análise e Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Causa Raiz</label>
                  <Textarea value={getValue("cause")} onChange={(e) => setValue("cause", e.target.value)} rows={3} placeholder="Descreva a causa raiz identificada..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Ações Corretivas</label>
                  <Textarea value={getValue("correctiveActions")} onChange={(e) => setValue("correctiveActions", e.target.value)} rows={3} placeholder="Descreva as ações corretivas implementadas..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Feedback do Fornecedor</label>
                  <Textarea value={getValue("supplyFeedback")} onChange={(e) => setValue("supplyFeedback", e.target.value)} rows={3} />
                </div>
                <div>
                  <label className="text-sm font-medium">Acompanhamento</label>
                  <Textarea value={getValue("trackingProgress")} onChange={(e) => setValue("trackingProgress", e.target.value)} rows={3} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>Comentários</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea 
                  value={newComment} 
                  onChange={(e) => setNewComment(e.target.value)} 
                  placeholder="Adicione um comentário..."
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim()}>Enviar</Button>
              </div>
              <div className="space-y-4 mt-4">
                {comments?.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{comment.userName}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}
                {(!comments || comments.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">Nenhum comentário ainda</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Alterações</CardTitle>
              <CardDescription>Registro imutável de todas as alterações</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs?.map((log) => (
                  <div key={log.id} className="border-l-2 border-primary pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="outline">{log.action}</Badge>
                        {log.fieldName && <span className="ml-2 text-sm font-medium">{log.fieldName}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Por: {log.userName}</p>
                    {log.oldValue && log.newValue && (
                      <p className="text-sm mt-1">
                        <span className="line-through text-red-500">{log.oldValue}</span>
                        {" → "}
                        <span className="text-green-600">{log.newValue}</span>
                      </p>
                    )}
                  </div>
                ))}
                {(!auditLogs || auditLogs.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">Nenhum registro de alteração</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
