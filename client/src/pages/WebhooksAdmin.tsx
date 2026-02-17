import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Webhook, Plus, Trash2, TestTube, Loader2, Clock, CheckCircle2, XCircle, Eye, Shield, Zap, AlertTriangle, Copy } from "lucide-react";
import { Can } from "@/components/Can";

const AVAILABLE_EVENTS = [
  { id: "defect.created", label: "Defeito Criado", category: "Defeitos" },
  { id: "defect.updated", label: "Defeito Atualizado", category: "Defeitos" },
  { id: "defect.status_changed", label: "Status Alterado", category: "Defeitos" },
  { id: "workflow.step_changed", label: "Etapa Workflow Alterada", category: "Workflow" },
  { id: "document.status_changed", label: "Documento Status Alterado", category: "Documentos" },
  { id: "sla.violated", label: "SLA Violado", category: "SLA" },
  { id: "*", label: "Todos os Eventos", category: "Global" },
];

const groupedEvents = AVAILABLE_EVENTS.reduce((acc, ev) => {
  if (!acc[ev.category]) acc[ev.category] = [];
  acc[ev.category].push(ev);
  return acc;
}, {} as Record<string, typeof AVAILABLE_EVENTS>);

export default function WebhooksAdmin() {
  const utils = trpc.useUtils();
  const { data: configs, isLoading } = trpc.webhook.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<{ configId: number; status: string; message: string } | null>(null);

  const { data: logs } = trpc.webhook.logs.useQuery(
    { configId: selectedConfigId! }, { enabled: !!selectedConfigId && logsOpen }
  );

  const createMutation = trpc.webhook.create.useMutation({
    onSuccess: (data) => {
      const secret = (data as any).secret;
      toast.success("Webhook criado com sucesso!");
      if (secret) {
        toast.info(`Secret HMAC (copie agora): ${secret.substring(0, 20)}...`, { duration: 10000 });
      }
      utils.webhook.list.invalidate();
      setCreateOpen(false);
      setNewName(""); setNewUrl(""); setNewEvents([]);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.webhook.delete.useMutation({
    onSuccess: () => { toast.success("Webhook removido"); utils.webhook.list.invalidate(); },
  });

  const testMutation = trpc.webhook.test.useMutation({
    onSuccess: (_, vars) => {
      setTestResult({ configId: vars.configId, status: "success", message: "Payload de teste enviado com sucesso" });
      toast.success("Webhook de teste enviado");
    },
    onError: (err: any, vars) => {
      setTestResult({ configId: vars.configId, status: "error", message: err.message });
      toast.error(err.message);
    },
  });

  const totalWebhooks = configs?.length || 0;
  const activeWebhooks = configs?.filter((c: any) => c.isActive).length || 0;
  const failedWebhooks = configs?.filter((c: any) => (c.failCount || 0) > 0).length || 0;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Webhook className="h-6 w-6 text-pink-500" /> Webhooks & Integrações
          </h1>
          <p className="text-muted-foreground mt-1">Configure endpoints para receber eventos do QTrack em tempo real</p>
        </div>
        <Can resource="webhook" action="manage">
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo Webhook</Button>
        </Can>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Webhook className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalWebhooks}</p>
                <p className="text-xs text-muted-foreground">Total Webhooks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeWebhooks}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{failedWebhooks}</p>
                <p className="text-xs text-muted-foreground">Com Falhas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook List */}
      <div className="grid gap-4">
        {configs?.map((config: any) => (
          <Card key={config.id} className="transition-all hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${config.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                  <div>
                    <CardTitle className="text-base">{config.name}</CardTitle>
                    <CardDescription className="font-mono text-xs mt-0.5">{config.url}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(config.failCount || 0) > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <XCircle className="h-3 w-3 mr-1" /> {config.failCount} falhas
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" /> HMAC-SHA256
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {(config.events as string[])?.map((e: string) => (
                    <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setSelectedConfigId(config.id); setLogsOpen(true); }}>
                    <Eye className="h-3 w-3 mr-1" /> Logs
                  </Button>
                  <Can resource="webhook" action="manage">
                    <Button variant="outline" size="sm"
                      onClick={() => { setTestResult(null); testMutation.mutate({ configId: config.id }); }}
                      disabled={testMutation.isPending && testMutation.variables?.configId === config.id}>
                      {testMutation.isPending && testMutation.variables?.configId === config.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <TestTube className="h-3 w-3 mr-1" />
                      )}
                      Testar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => {
                      if (confirm("Remover este webhook?")) deleteMutation.mutate({ id: config.id });
                    }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Can>
                </div>
              </div>
              {/* Test Result */}
              {testResult && testResult.configId === config.id && (
                <div className={`mt-3 p-2 rounded-lg text-sm flex items-center gap-2 ${
                  testResult.status === "success" ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300" :
                  "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                }`}>
                  {testResult.status === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {testResult.message}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {(!configs || configs.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <Webhook className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum webhook configurado.</p>
              <p className="text-xs text-muted-foreground mt-1">Crie um para integrar com sistemas externos.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* HMAC Info Card */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Segurança HMAC-SHA256</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Todos os webhooks são assinados com HMAC-SHA256. O header <code className="bg-muted px-1 rounded">X-QTrack-Signature</code> contém
                a assinatura do payload. Verifique a assinatura no seu endpoint para garantir a autenticidade da requisição.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Política de retry: até 3 tentativas com backoff exponencial (1s, 2s, 4s).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Webhook</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: ERP Integration" />
            </div>
            <div>
              <Label>URL do Endpoint</Label>
              <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://api.example.com/webhook" />
              <p className="text-xs text-muted-foreground mt-1">Deve aceitar POST requests com payload JSON</p>
            </div>
            <div>
              <Label className="mb-2 block">Eventos</Label>
              {Object.entries(groupedEvents).map(([category, events]) => (
                <div key={category} className="mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{category}</span>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {events.map(ev => (
                      <label key={ev.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                        <Checkbox checked={newEvents.includes(ev.id)}
                          onCheckedChange={(checked) => setNewEvents(prev => checked ? [...prev, ev.id] : prev.filter(e => e !== ev.id))} />
                        {ev.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
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

      {/* Logs Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Logs do Webhook: {configs?.find((c: any) => c.id === selectedConfigId)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {logs?.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                {log.status === "SUCCESS" ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> :
                 log.status === "PENDING" ? <Clock className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" /> :
                 log.status === "RETRYING" ? <Loader2 className="h-4 w-4 text-orange-500 shrink-0 mt-0.5 animate-spin" /> :
                 <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{log.event}</Badge>
                    <Badge variant={log.status === "SUCCESS" ? "default" : log.status === "FAILED" ? "destructive" : "secondary"} className="text-[10px]">
                      {log.status}
                    </Badge>
                    {log.responseStatus && (
                      <span className="text-xs text-muted-foreground">HTTP {log.responseStatus}</span>
                    )}
                    {log.attempts > 1 && (
                      <span className="text-xs text-muted-foreground">{log.attempts} tentativas</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {(!logs || logs.length === 0) && (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">Nenhum log encontrado</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
