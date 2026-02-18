import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Can } from "@/components/Can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Key, Plus, Copy, Trash2, Shield, Clock, AlertTriangle, ExternalLink } from "lucide-react";

const AVAILABLE_SCOPES = [
  { value: "defects:read", label: "Defeitos — Leitura", group: "Defeitos" },
  { value: "defects:write", label: "Defeitos — Escrita", group: "Defeitos" },
  { value: "reports:read", label: "Relatórios — Leitura", group: "Relatórios" },
  { value: "suppliers:read", label: "Fornecedores — Leitura", group: "Fornecedores" },
  { value: "*", label: "Acesso Total (todas as permissões)", group: "Admin" },
];

export default function ApiKeysAdmin() {
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["defects:read"]);
  const [expiresInDays, setExpiresInDays] = useState<string>("90");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const { data: keys, refetch } = trpc.apiKey.list.useQuery();
  const createMutation = trpc.apiKey.create.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.rawKey);
      refetch();
      toast.success("API Key criada — copie a chave agora, ela não será exibida novamente.");
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    },
  });
  const revokeMutation = trpc.apiKey.revoke.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("API Key revogada");
    },
  });

  const handleCreate = () => {
    if (!newKeyName.trim()) return;
    createMutation.mutate({
      name: newKeyName,
      scopes: selectedScopes,
      expiresInDays: expiresInDays === "never" ? undefined : parseInt(expiresInDays),
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência");
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const activeKeys = keys?.filter(k => !k.revokedAt) || [];
  const revokedKeys = keys?.filter(k => k.revokedAt) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" /> API Keys
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie chaves de acesso para a API REST pública. Integre com ERP, SAP e sistemas externos.
          </p>
        </div>
        <Can resource="api_keys" action="write">
          <Dialog open={createOpen} onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) {
              setCreatedKey(null);
              setNewKeyName("");
              setSelectedScopes(["defects:read"]);
              setExpiresInDays("90");
            }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nova API Key</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              {createdKey ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" /> Chave Criada
                    </DialogTitle>
                    <DialogDescription>
                      Copie a chave abaixo. Ela <strong>não será exibida novamente</strong>.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm break-all select-all">
                    {createdKey}
                  </div>
                  <DialogFooter>
                    <Button onClick={() => handleCopy(createdKey)} variant="outline">
                      <Copy className="h-4 w-4 mr-2" /> Copiar
                    </Button>
                    <Button onClick={() => { setCreateOpen(false); setCreatedKey(null); }}>
                      Fechar
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Criar Nova API Key</DialogTitle>
                    <DialogDescription>
                      Defina um nome, escopos de acesso e expiração.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome da Chave</Label>
                      <Input
                        placeholder="ex: Integração SAP Produção"
                        value={newKeyName}
                        onChange={e => setNewKeyName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Escopos de Acesso</Label>
                      <div className="mt-2 space-y-2">
                        {AVAILABLE_SCOPES.map(scope => (
                          <div key={scope.value} className="flex items-center gap-2">
                            <Checkbox
                              id={scope.value}
                              checked={selectedScopes.includes(scope.value)}
                              onCheckedChange={() => toggleScope(scope.value)}
                            />
                            <label htmlFor={scope.value} className="text-sm cursor-pointer">
                              <span className="font-medium">{scope.label}</span>
                              <Badge variant="outline" className="ml-2 text-xs">{scope.value}</Badge>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Expiração</Label>
                      <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 dias</SelectItem>
                          <SelectItem value="90">90 dias</SelectItem>
                          <SelectItem value="180">180 dias</SelectItem>
                          <SelectItem value="365">1 ano</SelectItem>
                          <SelectItem value="never">Sem expiração</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreate} disabled={!newKeyName.trim() || selectedScopes.length === 0 || createMutation.isPending}>
                      {createMutation.isPending ? "Criando..." : "Criar Chave"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </Can>
      </div>

      {/* API Documentation Link */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4" /> Documentação da API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            A API REST pública está disponível em <code className="bg-muted px-1 py-0.5 rounded">/api/v1</code>.
            Acesse a especificação OpenAPI para detalhes completos dos endpoints.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open("/api/v1/docs", "_blank")}>
              <ExternalLink className="h-3 w-3 mr-1" /> OpenAPI Spec (JSON)
            </Button>
          </div>
          <div className="mt-3 bg-muted p-3 rounded-md text-xs font-mono">
            <p className="text-muted-foreground mb-1"># Exemplo de uso:</p>
            <p>curl -H "Authorization: Bearer qk_xxxx_..." \</p>
            <p className="pl-4">{window.location.origin}/api/v1/defects</p>
          </div>
        </CardContent>
      </Card>

      {/* Active Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" /> Chaves Ativas ({activeKeys.length})
          </CardTitle>
          <CardDescription>Chaves com acesso ativo à API REST</CardDescription>
        </CardHeader>
        <CardContent>
          {activeKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma API key ativa. Crie uma para começar a integrar.
            </p>
          ) : (
            <div className="space-y-3">
              {activeKeys.map(key => (
                <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{key.name}</span>
                      <Badge variant="outline" className="font-mono text-xs">{key.keyPrefix}...</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {(key.scopes as string[]).join(", ")}
                      </span>
                      {key.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expira: {new Date(key.expiresAt).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {key.lastUsedAt && (
                        <span>Último uso: {new Date(key.lastUsedAt).toLocaleDateString("pt-BR")}</span>
                      )}
                    </div>
                  </div>
                  <Can resource="api_keys" action="write">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => revokeMutation.mutate({ id: key.id })}
                      disabled={revokeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Can>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-400" /> Chaves Revogadas ({revokedKeys.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {revokedKeys.map(key => (
                <div key={key.id} className="flex items-center justify-between p-2 border rounded-lg opacity-60">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="line-through">{key.name}</span>
                    <Badge variant="destructive" className="text-xs">Revogada</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {key.revokedAt && new Date(key.revokedAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
