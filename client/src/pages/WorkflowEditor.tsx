import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { GitBranch, Plus, ArrowRight, Loader2, Play, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface WorkflowStep {
  id: string; name: string; order: number;
  responsible: "SQA" | "SUPPLIER" | "BOTH";
  requiredFields: string[]; slaDefault: number;
}

export default function WorkflowEditor() {
  const { data: definitions, isLoading, refetch } = trpc.workflow.definitions.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: selectedDef } = trpc.workflow.definitionById.useQuery(
    { id: selectedId! }, { enabled: !!selectedId }
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const seedMutation = trpc.workflow.seed.useMutation({
    onSuccess: () => { toast.success("Workflow 8D padrão criado"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const createMutation = trpc.workflow.create.useMutation({
    onSuccess: () => { toast.success("Workflow criado"); refetch(); setCreateOpen(false); },
    onError: (err) => toast.error(err.message),
  });

  const responsibleColor = (r: string) => {
    if (r === "SQA") return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    if (r === "SUPPLIER") return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
  };

  const stepIcon = (step: WorkflowStep) => {
    if (step.id === "closed") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (step.responsible === "SQA") return <Play className="h-5 w-5 text-blue-500" />;
    return <Clock className="h-5 w-5 text-orange-500" />;
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="h-6 w-6" /> Workflow Engine</h1>
          <p className="text-muted-foreground mt-1">Gerencie definições de workflow e visualize etapas</p>
        </div>
        <div className="flex gap-2">
          {(!definitions || definitions.length === 0) && (
            <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              {seedMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar 8D Padrão
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo Workflow</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Definições</h3>
          {definitions?.map((def: any) => (
            <Card key={def.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedId === def.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelectedId(def.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{def.name}</CardTitle>
                  <div className="flex gap-1">
                    {def.isDefault && <Badge>Padrão</Badge>}
                    <Badge variant="outline">v{def.version}</Badge>
                  </div>
                </div>
                <CardDescription>{def.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
          {(!definitions || definitions.length === 0) && (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum workflow definido. Clique em "Criar 8D Padrão" para começar.</p>
          )}
        </div>

        <div className="md:col-span-2">
          {selectedDef ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selectedDef.name} <Badge variant="outline">v{selectedDef.version}</Badge>
                </CardTitle>
                <CardDescription>{selectedDef.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="font-semibold mb-4">Etapas do Workflow</h4>
                <div className="space-y-3">
                  {(selectedDef.steps as WorkflowStep[])?.sort((a, b) => a.order - b.order).map((step, idx) => (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          {stepIcon(step)}
                        </div>
                        {idx < ((selectedDef.steps as WorkflowStep[])?.length || 0) - 1 && (
                          <div className="w-0.5 h-8 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 mb-1">
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
                            {step.requiredFields.map(f => (
                              <Badge key={f} variant="outline" className="text-xs font-mono">{f}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {(selectedDef as any).transitions && (
                  <>
                    <h4 className="font-semibold mt-6 mb-3">Transições</h4>
                    <div className="space-y-2">
                      {((selectedDef as any).transitions as any[])?.map((tr, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-2">
                          <Badge variant="outline" className="font-mono text-xs">{tr.fromStepId}</Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline" className="font-mono text-xs">{tr.toStepId}</Badge>
                          {tr.actions?.map((a: string) => (
                            <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>Selecione um workflow para visualizar</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Workflow</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: SCAR Workflow" /></div>
            <div><Label>Descrição</Label><Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descrição do workflow" /></div>
            <p className="text-sm text-muted-foreground">O workflow será criado com etapas padrão. Você pode editá-las depois.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={() => {
                createMutation.mutate({
                  name: newName, description: newDesc,
                  steps: [
                    { id: "open", name: "Aberto", order: 1, responsible: "SQA", requiredFields: [], slaDefault: 3 },
                    { id: "analysis", name: "Em Análise", order: 2, responsible: "SUPPLIER", requiredFields: [], slaDefault: 7 },
                    { id: "action", name: "Ação Corretiva", order: 3, responsible: "SUPPLIER", requiredFields: [], slaDefault: 10 },
                    { id: "closed", name: "Fechado", order: 4, responsible: "SQA", requiredFields: [], slaDefault: 0 },
                  ],
                  transitions: [
                    { fromStepId: "open", toStepId: "analysis", conditions: [], actions: ["notify_supplier"] },
                    { fromStepId: "analysis", toStepId: "action", conditions: [], actions: [] },
                    { fromStepId: "action", toStepId: "closed", conditions: [], actions: ["close_defect"] },
                  ],
                });
              }} disabled={createMutation.isPending || !newName}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
