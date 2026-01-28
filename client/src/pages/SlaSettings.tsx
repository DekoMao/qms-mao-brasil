import { useState } from "react";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Clock, 
  Bell, 
  Plus, 
  Trash2,
  AlertTriangle,
  Send,
  Mail,
  Settings
} from "lucide-react";

const STEPS = [
  "Aguardando Disposição",
  "Aguardando Análise Técnica",
  "Aguardando Causa Raiz",
  "Aguardando Ação Corretiva",
  "Aguardando Validação de Ação Corretiva",
];

const SEVERITIES = ["S", "A", "B", "C"];

export default function SlaSettings() {
  const [isCreateSlaOpen, setIsCreateSlaOpen] = useState(false);
  const [isAddRecipientOpen, setIsAddRecipientOpen] = useState(false);
  const [newSla, setNewSla] = useState({
    step: "",
    severityMg: "",
    maxDays: 7,
    warningDays: 5,
  });
  const [newRecipient, setNewRecipient] = useState({
    email: "",
    name: "",
    notificationType: "ALL",
  });

  const { data: slaConfigs, refetch: refetchSla } = trpc.sla.list.useQuery();
  const { data: recipients, refetch: refetchRecipients } = trpc.notification.recipients.useQuery();
  const { data: violations } = trpc.sla.checkViolations.useQuery();
  const { data: pendingNotifications } = trpc.notification.pending.useQuery();

  const createSlaMutation = trpc.sla.create.useMutation({
    onSuccess: () => {
      toast.success("Configuração de SLA criada!");
      setIsCreateSlaOpen(false);
      setNewSla({ step: "", severityMg: "", maxDays: 7, warningDays: 5 });
      refetchSla();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const addRecipientMutation = trpc.notification.addRecipient.useMutation({
    onSuccess: () => {
      toast.success("Destinatário adicionado!");
      setIsAddRecipientOpen(false);
      setNewRecipient({ email: "", name: "", notificationType: "ALL" });
      refetchRecipients();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const removeRecipientMutation = trpc.notification.removeRecipient.useMutation({
    onSuccess: () => {
      toast.success("Destinatário removido!");
      refetchRecipients();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const sendAlertsMutation = trpc.notification.sendSlaAlerts.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.notificationsCreated} notificações criadas para ${data.violationsFound} violações!`);
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const handleCreateSla = () => {
    if (!newSla.step) {
      toast.error("Selecione uma etapa");
      return;
    }
    createSlaMutation.mutate({
      step: newSla.step as any,
      severityMg: newSla.severityMg as any || undefined,
      maxDays: newSla.maxDays,
      warningDays: newSla.warningDays,
    });
  };

  const handleAddRecipient = () => {
    if (!newRecipient.email) {
      toast.error("E-mail é obrigatório");
      return;
    }
    addRecipientMutation.mutate({
      email: newRecipient.email,
      name: newRecipient.name || undefined,
      notificationType: newRecipient.notificationType as any,
    });
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Configurações de SLA e Notificações
          </h1>
          <p className="text-muted-foreground">
            Configure prazos de SLA e destinatários de alertas
          </p>
        </div>

        <Tabs defaultValue="sla">
          <TabsList>
            <TabsTrigger value="sla">
              <Clock className="w-4 h-4 mr-2" />
              Configuração de SLA
            </TabsTrigger>
            <TabsTrigger value="recipients">
              <Mail className="w-4 h-4 mr-2" />
              Destinatários
            </TabsTrigger>
            <TabsTrigger value="violations">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Violações Atuais
            </TabsTrigger>
          </TabsList>

          {/* SLA Configuration Tab */}
          <TabsContent value="sla" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Configurações de SLA por Etapa</CardTitle>
                  <CardDescription>
                    Defina prazos máximos e de aviso para cada etapa do workflow
                  </CardDescription>
                </div>
                <Dialog open={isCreateSlaOpen} onOpenChange={setIsCreateSlaOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Configuração
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Configuração de SLA</DialogTitle>
                      <DialogDescription>
                        Defina os prazos para uma etapa específica
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Etapa do Workflow *</Label>
                        <Select
                          value={newSla.step}
                          onValueChange={(value) => setNewSla(prev => ({ ...prev, step: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a etapa" />
                          </SelectTrigger>
                          <SelectContent>
                            {STEPS.map(step => (
                              <SelectItem key={step} value={step}>{step}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Severidade (opcional)</Label>
                        <Select
                          value={newSla.severityMg}
                          onValueChange={(value) => setNewSla(prev => ({ ...prev, severityMg: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todas as severidades" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Todas</SelectItem>
                            {SEVERITIES.map(sev => (
                              <SelectItem key={sev} value={sev}>Severidade {sev}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Dias de Aviso</Label>
                          <Input
                            type="number"
                            min={1}
                            value={newSla.warningDays}
                            onChange={(e) => setNewSla(prev => ({ ...prev, warningDays: parseInt(e.target.value) || 5 }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Dias Máximos</Label>
                          <Input
                            type="number"
                            min={1}
                            value={newSla.maxDays}
                            onChange={(e) => setNewSla(prev => ({ ...prev, maxDays: parseInt(e.target.value) || 7 }))}
                          />
                        </div>
                      </div>
                      <Button className="w-full" onClick={handleCreateSla} disabled={createSlaMutation.isPending}>
                        {createSlaMutation.isPending ? "Criando..." : "Criar Configuração"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {slaConfigs?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma configuração de SLA definida. Use os valores padrão (7 dias).
                  </div>
                ) : (
                  <div className="space-y-2">
                    {slaConfigs?.map((config) => (
                      <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{config.step}</p>
                            <p className="text-sm text-muted-foreground">
                              {config.severityMg ? `Severidade ${config.severityMg}` : "Todas as severidades"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm">
                              <span className="text-yellow-600">Aviso: {config.warningDays}d</span>
                              {" | "}
                              <span className="text-red-600">Máx: {config.maxDays}d</span>
                            </p>
                          </div>
                          <Badge className={config.isActive ? "bg-green-500" : "bg-gray-500"}>
                            {config.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recipients Tab */}
          <TabsContent value="recipients" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Destinatários de Notificações</CardTitle>
                  <CardDescription>
                    Gerencie quem recebe alertas de SLA
                  </CardDescription>
                </div>
                <Dialog open={isAddRecipientOpen} onOpenChange={setIsAddRecipientOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Destinatário
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Destinatário</DialogTitle>
                      <DialogDescription>
                        Configure um novo destinatário para receber alertas
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>E-mail *</Label>
                        <Input
                          type="email"
                          placeholder="email@empresa.com"
                          value={newRecipient.email}
                          onChange={(e) => setNewRecipient(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          placeholder="Nome do destinatário"
                          value={newRecipient.name}
                          onChange={(e) => setNewRecipient(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Notificação</Label>
                        <Select
                          value={newRecipient.notificationType}
                          onValueChange={(value) => setNewRecipient(prev => ({ ...prev, notificationType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">Todas as notificações</SelectItem>
                            <SelectItem value="SLA_WARNING">Apenas avisos de SLA</SelectItem>
                            <SelectItem value="SLA_EXCEEDED">Apenas SLA excedido</SelectItem>
                            <SelectItem value="STEP_CHANGE">Mudança de etapa</SelectItem>
                            <SelectItem value="SUPPLIER_UPDATE">Atualização de fornecedor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="w-full" onClick={handleAddRecipient} disabled={addRecipientMutation.isPending}>
                        {addRecipientMutation.isPending ? "Adicionando..." : "Adicionar"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {recipients?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum destinatário configurado.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recipients?.map((recipient) => (
                      <div key={recipient.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{recipient.name || recipient.email}</p>
                            <p className="text-sm text-muted-foreground">{recipient.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{recipient.notificationType}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRecipientMutation.mutate({ id: recipient.id })}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Violations Tab */}
          <TabsContent value="violations" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Violações de SLA Atuais
                  </CardTitle>
                  <CardDescription>
                    {violations?.length || 0} casos com SLA em risco ou excedido
                  </CardDescription>
                </div>
                <Button onClick={() => sendAlertsMutation.mutate()} disabled={sendAlertsMutation.isPending}>
                  <Send className="w-4 h-4 mr-2" />
                  {sendAlertsMutation.isPending ? "Enviando..." : "Enviar Alertas"}
                </Button>
              </CardHeader>
              <CardContent>
                {violations?.length === 0 ? (
                  <div className="text-center py-8 text-green-600">
                    Nenhuma violação de SLA encontrada. Todos os casos estão dentro do prazo!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {violations?.map((violation, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className={`w-5 h-5 ${violation.violationType === "EXCEEDED" ? "text-red-500" : "text-yellow-500"}`} />
                          <div>
                            <p className="font-medium font-mono">{violation.defect.docNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              {violation.defect.step} | {violation.defect.supplier || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm">
                              <span className="font-medium">{violation.daysInStep}</span> / {violation.slaConfig.maxDays} dias
                            </p>
                          </div>
                          <Badge className={violation.violationType === "EXCEEDED" ? "bg-red-500" : "bg-yellow-500"}>
                            {violation.violationType === "EXCEEDED" ? "Excedido" : "Aviso"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notificações Pendentes
                </CardTitle>
                <CardDescription>
                  {pendingNotifications?.length || 0} notificações aguardando envio
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingNotifications?.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Nenhuma notificação pendente.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingNotifications?.slice(0, 10).map((notification) => (
                      <div key={notification.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="text-sm">
                          <p className="font-medium">{notification.subject}</p>
                          <p className="text-muted-foreground">{notification.recipientEmail}</p>
                        </div>
                        <Badge variant="outline">{notification.type}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
