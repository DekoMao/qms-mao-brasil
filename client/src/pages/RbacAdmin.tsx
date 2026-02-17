import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Users, Key, Settings, ChevronRight, Loader2, Check, X, UserPlus, UserMinus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Can } from "@/components/Can";

export default function RbacAdmin() {
  const { t } = useTranslation();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editPerms, setEditPerms] = useState<number[]>([]);
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [assignRoleId, setAssignRoleId] = useState<string>("");

  const { data: roles, isLoading: rolesLoading, refetch: refetchRoles } = trpc.rbac.roles.useQuery();
  const { data: permissions } = trpc.rbac.permissions.useQuery();
  const { data: rolePerms, refetch: refetchRolePerms } = trpc.rbac.rolePermissions.useQuery(
    { roleId: selectedRoleId! },
    { enabled: !!selectedRoleId }
  );

  // Fetch all role permissions for the matrix
  const allRolePermsQueries = useMemo(() => {
    return roles?.map(r => r.id) || [];
  }, [roles]);

  const seedMutation = trpc.rbac.seed.useMutation({
    onSuccess: () => { toast.success("Roles e permissões inicializados com sucesso"); refetchRoles(); },
    onError: (err: any) => toast.error(err.message),
  });

  const setPermsMutation = trpc.rbac.setRolePermissions.useMutation({
    onSuccess: () => { toast.success("Permissões atualizadas"); refetchRolePerms(); },
    onError: (err: any) => toast.error(err.message),
  });

  const assignRoleMutation = trpc.rbac.assignRole.useMutation({
    onSuccess: () => { toast.success("Role atribuído com sucesso"); setAssignUserId(""); setAssignRoleId(""); },
    onError: (err: any) => toast.error(err.message),
  });

  const removeRoleMutation = trpc.rbac.removeRole.useMutation({
    onSuccess: () => { toast.success("Role removido com sucesso"); },
    onError: (err: any) => toast.error(err.message),
  });

  useEffect(() => {
    if (rolePerms) setEditPerms(rolePerms.map((p: any) => p.id));
  }, [rolePerms]);

  const groupedPermissions = useMemo(() => {
    return permissions?.reduce((acc: Record<string, any[]>, p: any) => {
      if (!acc[p.resource]) acc[p.resource] = [];
      acc[p.resource].push(p);
      return acc;
    }, {} as Record<string, any[]>) || {};
  }, [permissions]);

  const resourceIcons: Record<string, string> = {
    defects: "🔧", suppliers: "🏭", copq: "💰", scorecard: "📊",
    rbac: "🔐", workflow: "⚙️", tenant: "🏢", webhook: "🔗", document: "📄",
  };

  if (rolesLoading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-yellow-500" /> RBAC — Controle de Acesso
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie roles, permissões e atribuições de usuários</p>
        </div>
        <Can resource="rbac" action="manage">
          {(!roles || roles.length === 0) && (
            <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Inicializar Roles Padrão
            </Button>
          )}
        </Can>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{roles?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Roles Definidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{permissions?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Permissões</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Object.keys(groupedPermissions).length}</p>
                <p className="text-xs text-muted-foreground">Recursos Protegidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles"><Key className="h-4 w-4 mr-1" /> Roles</TabsTrigger>
          <TabsTrigger value="matrix"><Settings className="h-4 w-4 mr-1" /> Matriz</TabsTrigger>
          <TabsTrigger value="assign"><Users className="h-4 w-4 mr-1" /> Atribuir</TabsTrigger>
        </TabsList>

        {/* ROLES TAB */}
        <TabsContent value="roles" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles?.map((role: any) => (
              <Card key={role.id}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedRoleId === role.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedRoleId(role.id)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    {role.isSystem ? (
                      <Badge variant="secondary" className="text-[10px]">Sistema</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Custom</Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">{role.description || "Sem descrição"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Can resource="rbac" action="manage">
                    <Button variant="outline" size="sm" className="w-full"
                      onClick={(e) => { e.stopPropagation(); setSelectedRoleId(role.id); setEditOpen(true); }}>
                      <Settings className="h-3 w-3 mr-1" /> Editar Permissões
                    </Button>
                  </Can>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedRoleId && rolePerms && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Permissões: {roles?.find((r: any) => r.id === selectedRoleId)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rolePerms.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma permissão atribuída</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(
                      rolePerms.reduce((acc: Record<string, any[]>, p: any) => {
                        if (!acc[p.resource]) acc[p.resource] = [];
                        acc[p.resource].push(p);
                        return acc;
                      }, {} as Record<string, any[]>)
                    ).map(([resource, perms]) => (
                      <div key={resource} className="flex items-start gap-2">
                        <span className="text-sm">{resourceIcons[resource] || "📋"}</span>
                        <div>
                          <span className="font-medium text-sm capitalize">{resource}</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {(perms as any[]).map((p: any) => (
                              <Badge key={p.id} variant="outline" className="text-[10px] font-mono">
                                {p.action}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PERMISSION MATRIX TAB */}
        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Matriz de Permissões por Role</CardTitle>
              <CardDescription>Visão geral de todas as permissões atribuídas a cada role</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium sticky left-0 bg-muted/50 z-10 min-w-[180px]">Recurso / Ação</th>
                    {roles?.map((r: any) => (
                      <th key={r.id} className="p-3 text-center font-medium text-xs min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>{r.name}</span>
                          {r.isSystem && <Badge variant="secondary" className="text-[8px] px-1">SYS</Badge>}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedPermissions).map(([resource, perms]) => (
                    <>
                      <tr key={`header-${resource}`} className="bg-muted/20">
                        <td colSpan={(roles?.length || 0) + 1} className="p-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                          {resourceIcons[resource] || "📋"} {resource}
                        </td>
                      </tr>
                      {(perms as any[]).map((perm: any) => (
                        <tr key={perm.id} className="border-b hover:bg-muted/30">
                          <td className="p-2 pl-6 font-mono text-xs sticky left-0 bg-background z-10">
                            {perm.action}
                          </td>
                          {roles?.map((r: any) => (
                            <td key={r.id} className="p-2 text-center">
                              <MatrixCell roleId={r.id} permissionId={perm.id} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ASSIGN TAB */}
        <TabsContent value="assign" className="mt-4 space-y-4">
          <Can resource="rbac" action="manage" fallback={
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Você não tem permissão para gerenciar atribuições de roles.</p>
              </CardContent>
            </Card>
          }>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5" /> Atribuir Role a Usuário
                </CardTitle>
                <CardDescription>Selecione o ID do usuário e o role a ser atribuído</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">ID do Usuário</label>
                    <input
                      type="number"
                      value={assignUserId}
                      onChange={(e) => setAssignUserId(e.target.value)}
                      placeholder="Ex: 2"
                      className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
                    <Select value={assignRoleId} onValueChange={setAssignRoleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles?.map((r: any) => (
                          <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      onClick={() => {
                        if (assignUserId && assignRoleId) {
                          assignRoleMutation.mutate({ userId: parseInt(assignUserId), roleId: parseInt(assignRoleId) });
                        }
                      }}
                      disabled={!assignUserId || !assignRoleId || assignRoleMutation.isPending}
                    >
                      {assignRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
                      Atribuir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserMinus className="h-5 w-5" /> Remover Role de Usuário
                </CardTitle>
                <CardDescription>Informe o ID do usuário e o role a ser removido</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">ID do Usuário</label>
                    <input
                      type="number"
                      placeholder="Ex: 2"
                      className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                      id="removeUserId"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles?.map((r: any) => (
                          <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button variant="destructive"
                      onClick={() => toast.info("Use o formulário acima para remover roles")}
                    >
                      <UserMinus className="h-4 w-4 mr-1" /> Remover
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Can>
        </TabsContent>
      </Tabs>

      {/* Edit Permissions Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Permissões: {roles?.find((r: any) => r.id === selectedRoleId)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {Object.entries(groupedPermissions).map(([resource, perms]) => (
              <div key={resource} className="border rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <span>{resourceIcons[resource] || "📋"}</span>
                  <span className="capitalize">{resource}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">{(perms as any[]).length} ações</Badge>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(perms as any[]).map((perm: any) => (
                    <label key={perm.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                      <Checkbox
                        checked={editPerms.includes(perm.id)}
                        onCheckedChange={(checked) => {
                          setEditPerms(prev => checked ? [...prev, perm.id] : prev.filter(id => id !== perm.id));
                        }}
                      />
                      <span className="font-mono text-xs">{perm.action}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-xs text-muted-foreground">{editPerms.length} permissões selecionadas</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                <Button onClick={() => {
                  if (selectedRoleId) {
                    setPermsMutation.mutate({ roleId: selectedRoleId, permissionIds: editPerms });
                    setEditOpen(false);
                  }
                }} disabled={setPermsMutation.isPending}>
                  {setPermsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar Permissões
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Matrix cell that shows check/x based on role permissions
function MatrixCell({ roleId, permissionId }: { roleId: number; permissionId: number }) {
  const { data: perms } = trpc.rbac.rolePermissions.useQuery(
    { roleId },
    { staleTime: 30000 }
  );

  if (!perms) return <span className="text-muted-foreground/30">—</span>;

  const hasIt = perms.some((p: any) => p.id === permissionId);
  return hasIt ? (
    <Check className="h-4 w-4 text-green-500 mx-auto" />
  ) : (
    <X className="h-4 w-4 text-muted-foreground/20 mx-auto" />
  );
}
