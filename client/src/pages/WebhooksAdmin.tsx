import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Webhook, Plus, Trash2, TestTube, Loader2, Clock, CheckCircle2, XCircle, Eye } from "lucide-react";

const AVAILABLE_EVENTS = [
  { id: "defect.created", label: "Defeito Criado" },
  { id: "defect.updated", label: "Defeito Atualizado" },
  { id: "defect.status_changed", label: "Status Alterado" },
  { id: "workflow.step_changed", label: "Etapa Workflow Alterada" },
  { id: "document.status_changed", label: "Documento Status Alterado" },
  { id: "sla.violated", label: "SLA Violado" },
  { id: "*", label: "Todos os Eventos" },
];

export default function WebhooksAdmin() {
  const utils = trpc.useUtils();
  const { data: configs, isLoading } = trpc.webhook.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>([]);

  const { data: logs } = trpc.webhook.logs.useQuery(
    { configId: selectedConfigId! }, { enabled: !!selectedConfigId && logsOpen }
  );

  const createMutation = trpc.webhook.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Webhook criado. Secret: ${(data as any).secret?.substring(0, 16)}...`);
      utils.webhook.list.invalidate();
      setCreateOpen(false);
      setNewName(""); setNewUrl(""); setNewEvents([]);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.webhook.delete.useMutation({
    onSuccess: () => { toast.success("Webhook removido"); utils.webhook.list.invalidate(); },
  });

  const testMutation = trpc.webhook.test.useMutation({
    onSuccess: () => toast.success("Webhook de teste enviado"),
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Webhook className="h-6 w-6" /> Webhooks & Integrações</h1>
          <p className="text-muted-foreground mt-1">Configure endpoints para receber eventos do QTrack em tempo real</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo Webhook</Button>
      </div>

      <div className="grid gap-4">
        {configs?.map((config: any) => (
          <Card key={config.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{config.name}</CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">{config.url}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {config.failCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <XCircle className="h-3 w-3 mr-1" /> {config.failCount} falhas
                    </Badge>
                  )}
                  <Badge variant={config.isActive ? "default" : "secondary"}>
                    {config.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {(config.events as string[])?.map((e: string) => (
                    <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setSelectedConfigId(config.id); setLogsOpen(true); }}>
                    <Eye className="h-3 w-3 mr-1" /> Logs
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => testMutation.mutate({ configId: config.id })}
                    disabled={testMutation.isPending}>
                    <TestTube className="h-3 w-3 mr-1" /> Testar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate({ id: config.id })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!configs || configs.length === 0) && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            Nenhum webhook configurado. Crie um para integrar com sistemas externos.
          </CardContent></Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Webhook</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: ERP Integration" /></div>
            <div><Label>URL do Endpoint</Label><Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://api.example.com/webhook" /></div>
            <div>
              <Label className="mb-2 block">Eventos</Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_EVENTS.map(ev => (
                  <label key={ev.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={newEvents.includes(ev.id)}
                      onCheckedChange={(checked) => setNewEvents(prev => checked ? [...prev, ev.id] : prev.filter(e => e !== ev.id))} />
                    {ev.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={() => createMutation.mutate({ name: newName, url: newUrl, events: newEvents })}
                disabled={createMutation.isPending || !newName || !newUrl || newEvents.length === 0}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Webhook
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Logs do Webhook</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {logs?.map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                {log.status === "SUCCESS" ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> :
                 log.status === "PENDING" ? <Clock className="h-4 w-4 text-yellow-500 shrink-0" /> :
                 <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{log.event}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  {log.responseStatus && <span className="text-xs text-muted-foreground">HTTP {log.responseStatus}</span>}
                </div>
              </div>
            ))}
            {(!logs || logs.length === 0) && <p className="text-center text-muted-foreground py-8">Nenhum log encontrado</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
