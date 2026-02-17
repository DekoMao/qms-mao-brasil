import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GitBranch, Plus, ArrowRight, Loader2, Play, CheckCircle2, Clock, Zap, FileSearch, ShieldAlert, Trash2, GripVertical } from "lucide-react";
import { Can } from "@/components/Can";

interface WorkflowStep {
  id: string; name: string; order: number;
  responsible: "SQA" | "SUPPLIER" | "BOTH";
  requiredFields: string[]; slaDefault: number;
}

interface WorkflowTransition {
  fromStepId: string; toStepId: string;
  conditions: string[]; actions: string[];
}

// Predefined workflow templates
const TEMPLATES: Record<string, { name: string; description: string; icon: any; steps: WorkflowStep[]; transitions: WorkflowTransition[] }> = {
  scar: {
    name: "SCAR (Supplier Corrective Action Request)",
    description: "Processo simplificado para ações corretivas de fornecedor",
    icon: ShieldAlert,
    steps: [
      { id: "open", name: "Abertura SCAR", order: 1, responsible: "SQA", requiredFields: ["description", "supplier"], slaDefault: 1 },
      { id: "supplier_response", name: "Resposta Fornecedor", order: 2, responsible: "SUPPLIER", requiredFields: ["rootCause", "correctiveAction"], slaDefault: 7 },
      { id: "sqa_review", name: "Revisão SQA", order: 3, responsible: "SQA", requiredFields: [], slaDefault: 3 },
      { id: "verification", name: "Verificação Eficácia", order: 4, responsible: "SQA", requiredFields: [], slaDefault: 30 },
      { id: "closed", name: "Fechado", order: 5, responsible: "SQA", requiredFields: [], slaDefault: 0 },
    ],
    transitions: [
      { fromStepId: "open", toStepId: "supplier_response", conditions: [], actions: ["notify_supplier"] },
      { fromStepId: "supplier_response", toStepId: "sqa_review", conditions: [], actions: ["notify_sqa"] },
      { fromStepId: "sqa_review", toStepId: "verification", conditions: [], actions: [] },
      { fromStepId: "sqa_review", toStepId: "supplier_response", conditions: ["rejected"], actions: ["notify_supplier"] },
      { fromStepId: "verification", toStepId: "closed", conditions: [], actions: ["close_defect"] },
    ],
  },
  fast_track: {
    name: "Fast Track",
    description: "Processo rápido para defeitos de baixa severidade",
    icon: Zap,
    steps: [
      { id: "open", name: "Abertura", order: 1, responsible: "SQA", requiredFields: ["description"], slaDefault: 1 },
      { id: "containment", name: "Contenção", order: 2, responsible: "BOTH", requiredFields: ["containmentAction"], slaDefault: 2 },
      { id: "closed", name: "Fechado", order: 3, responsible: "SQA", requiredFields: [], slaDefault: 0 },
    ],
    transitions: [
      { fromStepId: "open", toStepId: "containment", conditions: [], actions: ["notify_supplier"] },
      { fromStepId: "containment", toStepId: "closed", conditions: [], actions: ["close_defect"] },
    ],
  },
  investigation: {
    name: "Investigação Detalhada",
    description: "Processo completo para defeitos críticos com múltiplas revisões",
    icon: FileSearch,
    steps: [
      { id: "open", name: "Abertura", order: 1, responsible: "SQA", requiredFields: ["description", "severity"], slaDefault: 1 },
      { id: "containment", name: "Contenção Imediata", order: 2, responsible: "BOTH", requiredFields: ["containmentAction"], slaDefault: 2 },
      { id: "investigation", name: "Investigação", order: 3, responsible: "SUPPLIER", requiredFields: ["rootCause", "ishikawa"], slaDefault: 10 },
      { id: "action_plan", name: "Plano de Ação", order: 4, responsible: "SUPPLIER", requiredFields: ["correctiveAction", "preventiveAction"], slaDefault: 7 },
      { id: "sqa_approval", name: "Aprovação SQA", order: 5, responsible: "SQA", requiredFields: [], slaDefault: 3 },
      { id: "implementation", name: "Implementação", order: 6, responsible: "SUPPLIER", requiredFields: [], slaDefault: 14 },
      { id: "verification", name: "Verificação", order: 7, responsible: "SQA", requiredFields: [], slaDefault: 30 },
      { id: "closed", name: "Fechado", order: 8, responsible: "SQA", requiredFields: [], slaDefault: 0 },
    ],
    transitions: [
      { fromStepId: "open", toStepId: "containment", conditions: [], actions: ["notify_supplier"] },
      { fromStepId: "containment", toStepId: "investigation", conditions: [], actions: [] },
      { fromStepId: "investigation", toStepId: "action_plan", conditions: [], actions: [] },
      { fromStepId: "action_plan", toStepId: "sqa_approval", conditions: [], actions: ["notify_sqa"] },
      { fromStepId: "sqa_approval", toStepId: "implementation", conditions: [], actions: [] },
      { fromStepId: "sqa_approval", toStepId: "action_plan", conditions: ["rejected"], actions: ["notify_supplier"] },
      { fromStepId: "implementation", toStepId: "verification", conditions: [], actions: [] },
      { fromStepId: "verification", toStepId: "closed", conditions: [], actions: ["close_defect"] },
    ],
  },
};

export default function WorkflowEditor() {
  const { data: definitions, isLoading, refetch } = trpc.workflow.definitions.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: selectedDef } = trpc.workflow.definitionById.useQuery(
    { id: selectedId! }, { enabled: !!selectedId }
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState<string>("custom");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [customSteps, setCustomSteps] = useState<WorkflowStep[]>([
    { id: "open", name: "Aberto", order: 1, responsible: "SQA", requiredFields: [], slaDefault: 3 },
    { id: "closed", name: "Fechado", order: 2, responsible: "SQA", requiredFields: [], slaDefault: 0 },
  ]);

  const seedMutation = trpc.workflow.seed.useMutation({
    onSuccess: () => { toast.success("Workflow 8D padrão criado"); refetch(); },
    onError: (err: any) => toast.error(err.message),
  });

  const createMutation = trpc.workflow.create.useMutation({
    onSuccess: () => { toast.success("Workflow criado"); refetch(); setCreateOpen(false); resetForm(); },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setNewName(""); setNewDesc(""); setTemplateKey("custom");
    setCustomSteps([
      { id: "open", name: "Aberto", order: 1, responsible: "SQA", requiredFields: [], slaDefault: 3 },
      { id: "closed", name: "Fechado", order: 2, responsible: "SQA", requiredFields: [], slaDefault: 0 },
    ]);
  };

  const responsibleColor = (r: string) => {
    if (r === "SQA") return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
    if (r === "SUPPLIER") return "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200";
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200";
  };

  const stepIcon = (step: WorkflowStep) => {
    if (step.id === "closed") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (step.responsible === "SQA") return <Play className="h-5 w-5 text-blue-500" />;
    if (step.responsible === "SUPPLIER") return <Clock className="h-5 w-5 text-orange-500" />;
    return <Zap className="h-5 w-5 text-purple-500" />;
  };

  const addCustomStep = () => {
    const order = customSteps.length + 1;
    const id = `step_${Date.now()}`;
    setCustomSteps(prev => {
      const newSteps = [...prev];
      // Insert before the last step (closed)
      newSteps.splice(newSteps.length - 1, 0, {
        id, name: `Etapa ${order - 1}`, order: order - 1,
        responsible: "SQA", requiredFields: [], slaDefault: 5,
      });
      // Reorder
      return newSteps.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const removeCustomStep = (id: string) => {
    if (id === "open" || id === "closed") return;
    setCustomSteps(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const updateCustomStep = (id: string, field: string, value: any) => {
    setCustomSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleCreate = () => {
    let steps: WorkflowStep[];
    let transitions: WorkflowTransition[];

    if (templateKey !== "custom" && TEMPLATES[templateKey]) {
      const tpl = TEMPLATES[templateKey];
      steps = tpl.steps;
      transitions = tpl.transitions;
    } else {
      steps = customSteps;
      transitions = customSteps.slice(0, -1).map((s, i) => ({
        fromStepId: s.id, toStepId: customSteps[i + 1].id,
        conditions: [], actions: i === customSteps.length - 2 ? ["close_defect"] : [],
      }));
    }

    createMutation.mutate({
      name: newName || (templateKey !== "custom" ? TEMPLATES[templateKey].name : "Custom Workflow"),
      description: newDesc || (templateKey !== "custom" ? TEMPLATES[templateKey].description : ""),
      steps, transitions,
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-teal-500" /> Workflow Engine
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie definições de workflow e visualize etapas</p>
        </div>
        <div className="flex gap-2">
          {(!definitions || definitions.length === 0) && (
            <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              {seedMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar 8D Padrão
            </Button>
          )}
          <Can resource="workflow" action="manage">
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo Workflow</Button>
          </Can>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <GitBranch className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{definitions?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Workflows Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Play className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{selectedDef ? (selectedDef.steps as WorkflowStep[])?.length || 0 : "—"}</p>
                <p className="text-xs text-muted-foreground">Etapas (Selecionado)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Object.keys(TEMPLATES).length + 1}</p>
                <p className="text-xs text-muted-foreground">Templates Disponíveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Definitions List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Definições</h3>
          {definitions?.map((def: any) => (
            <Card key={def.id}
              className={`cursor-pointer transition-all hover:shadow-md ${selectedId === def.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelectedId(def.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{def.name}</CardTitle>
                  <div className="flex gap-1">
                    {def.isDefault && <Badge className="text-[10px]">Padrão</Badge>}
                    <Badge variant="outline" className="text-[10px]">v{def.version}</Badge>
                  </div>
                </div>
                <CardDescription className="text-xs">{def.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Play className="h-3 w-3" />
                  <span>{(def.steps as WorkflowStep[])?.length || 0} etapas</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!definitions || definitions.length === 0) && (
            <p className="text-muted-foreground text-sm text-center py-8">
              Nenhum workflow definido. Clique em "Criar 8D Padrão" para começar.
            </p>
          )}
        </div>

        {/* Workflow Detail */}
        <div className="md:col-span-2">
          {selectedDef ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedDef.name}
                      <Badge variant="outline">v{selectedDef.version}</Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">{selectedDef.description}</CardDescription>
                  </div>
                  <Can resource="workflow" action="manage">
                    <Button variant="outline" size="sm" onClick={() => toast.info("Edição visual em desenvolvimento")}>
                      Editar
                    </Button>
                  </Can>
                </div>
              </CardHeader>
              <CardContent>
                {/* Visual Pipeline */}
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Pipeline de Etapas</h4>
                <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-muted/30 rounded-lg">
                  {(selectedDef.steps as WorkflowStep[])?.sort((a, b) => a.order - b.order).map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <div className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                        step.id === "closed" ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300" :
                        step.responsible === "SQA" ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300" :
                        step.responsible === "SUPPLIER" ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-300" :
                        "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300"
                      }`}>
                        {step.name}
                      </div>
                      {idx < ((selectedDef.steps as WorkflowStep[])?.length || 0) - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Detailed Steps */}
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Detalhes das Etapas</h4>
                <div className="space-y-3">
                  {(selectedDef.steps as WorkflowStep[])?.sort((a, b) => a.order - b.order).map((step, idx) => (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          {stepIcon(step)}
                        </div>
                        {idx < ((selectedDef.steps as WorkflowStep[])?.length || 0) - 1 && (
                          <div className="w-0.5 h-8 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium">{step.order}. {step.name}</span>
                          <Badge variant="secondary" className={responsibleColor(step.responsible)}>
                            {step.responsible}
                          </Badge>
                          {step.slaDefault > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" /> SLA: {step.slaDefault}d
                            </Badge>
                          )}
                        </div>
                        {step.requiredFields.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-xs text-muted-foreground mr-1">Campos:</span>
                            {step.requiredFields.map(f => (
                              <Badge key={f} variant="outline" className="text-[10px] font-mono">{f}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Transitions */}
                {(selectedDef as any).transitions && (selectedDef as any).transitions.length > 0 && (
                  <>
                    <h4 className="font-semibold mt-6 mb-3 text-sm uppercase tracking-wider text-muted-foreground">Transições</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {((selectedDef as any).transitions as WorkflowTransition[])?.map((tr, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-2">
                          <Badge variant="outline" className="font-mono text-[10px]">{tr.fromStepId}</Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <Badge variant="outline" className="font-mono text-[10px]">{tr.toStepId}</Badge>
                          {tr.conditions?.length > 0 && tr.conditions.map((c: string) => (
                            <Badge key={c} variant="destructive" className="text-[10px]">{c}</Badge>
                          ))}
                          {tr.actions?.length > 0 && tr.actions.map((a: string) => (
                            <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <GitBranch className="h-12 w-12 mb-3 opacity-30" />
              <p>Selecione um workflow para visualizar</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog with Templates */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Template Selection */}
            <div>
              <Label className="text-sm font-medium">Template</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  className={`p-3 rounded-lg border text-left transition-all ${templateKey === "custom" ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                  onClick={() => setTemplateKey("custom")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium text-sm">Custom</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Criar do zero</p>
                </button>
                {Object.entries(TEMPLATES).map(([key, tpl]) => {
                  const Icon = tpl.icon;
                  return (
                    <button key={key}
                      className={`p-3 rounded-lg border text-left transition-all ${templateKey === key ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                      onClick={() => { setTemplateKey(key); setNewName(tpl.name); setNewDesc(tpl.description); }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4" />
                        <span className="font-medium text-sm">{tpl.name.split("(")[0].trim()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{tpl.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do workflow" /></div>
              <div><Label>Descrição</Label><Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descrição" /></div>
            </div>

            {/* Custom Step Editor */}
            {templateKey === "custom" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Etapas</Label>
                  <Button variant="outline" size="sm" onClick={addCustomStep}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Etapa
                  </Button>
                </div>
                <div className="space-y-2">
                  {customSteps.map((step) => (
                    <div key={step.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono text-muted-foreground w-6">{step.order}</span>
                      <Input
                        value={step.name}
                        onChange={e => updateCustomStep(step.id, "name", e.target.value)}
                        className="h-8 text-sm flex-1"
                        placeholder="Nome da etapa"
                      />
                      <Select value={step.responsible} onValueChange={v => updateCustomStep(step.id, "responsible", v)}>
                        <SelectTrigger className="h-8 w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SQA">SQA</SelectItem>
                          <SelectItem value="SUPPLIER">Fornecedor</SelectItem>
                          <SelectItem value="BOTH">Ambos</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={step.slaDefault}
                        onChange={e => updateCustomStep(step.id, "slaDefault", parseInt(e.target.value) || 0)}
                        className="h-8 w-16 text-sm"
                        placeholder="SLA"
                      />
                      <span className="text-xs text-muted-foreground">d</span>
                      {step.id !== "open" && step.id !== "closed" && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeCustomStep(step.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Template Preview */}
            {templateKey !== "custom" && TEMPLATES[templateKey] && (
              <div>
                <Label className="text-sm">Preview das Etapas</Label>
                <div className="flex flex-wrap items-center gap-2 mt-2 p-3 bg-muted/30 rounded-lg">
                  {TEMPLATES[templateKey].steps.map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">{step.name}</Badge>
                      {idx < TEMPLATES[templateKey].steps.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending || !newName}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Workflow
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
