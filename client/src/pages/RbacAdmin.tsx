import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Shield, Users, Key, Settings, ChevronRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function RbacAdmin() {
  const { t } = useTranslation();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const { data: roles, isLoading: rolesLoading } = trpc.rbac.roles.useQuery();
  const { data: permissions } = trpc.rbac.permissions.useQuery();
  const { data: rolePerms, refetch: refetchRolePerms } = trpc.rbac.rolePermissions.useQuery(
    { roleId: selectedRoleId! },
    { enabled: !!selectedRoleId }
  );

  const seedMutation = trpc.rbac.seed.useMutation({
    onSuccess: () => { toast.success("Roles e permissões inicializados com sucesso"); },
    onError: (err) => toast.error(err.message),
  });

  const setPermsMutation = trpc.rbac.setRolePermissions.useMutation({
    onSuccess: () => { toast.success("Permissões atualizadas"); refetchRolePerms(); },
    onError: (err) => toast.error(err.message),
  });

  const [editPerms, setEditPerms] = useState<number[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (rolePerms) setEditPerms(rolePerms.map((p: any) => p.id));
  }, [rolePerms]);

  const groupedPermissions = permissions?.reduce((acc: Record<string, any[]>, p: any) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {} as Record<string, any[]>) || {};

  if (rolesLoading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" /> RBAC — Controle de Acesso</h1>
          <p className="text-muted-foreground mt-1">Gerencie roles, permissões e atribuições de usuários</p>
        </div>
        {(!roles || roles.length === 0) && (
          <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Inicializar Roles Padrão
          </Button>
        )}
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles"><Key className="h-4 w-4 mr-1" /> Roles</TabsTrigger>
          <TabsTrigger value="matrix"><Settings className="h-4 w-4 mr-1" /> Matriz de Permissões</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles?.map((role: any) => (
              <Card key={role.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedRoleId === role.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedRoleId(role.id)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    {role.isSystem && <Badge variant="secondary">Sistema</Badge>}
                  </div>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full"
                    onClick={(e) => { e.stopPropagation(); setSelectedRoleId(role.id); setEditOpen(true); }}>
                    <Settings className="h-3 w-3 mr-1" /> Editar Permissões
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedRoleId && rolePerms && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Permissões do Role: {roles?.find((r: any) => r.id === selectedRoleId)?.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {rolePerms.map((p: any) => (
                    <Badge key={p.id} variant="outline">{p.resource}.{p.action}</Badge>
                  ))}
                  {rolePerms.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma permissão atribuída</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Recurso / Ação</th>
                    {roles?.map((r: any) => (
                      <th key={r.id} className="p-3 text-center font-medium text-xs">{r.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedPermissions).map(([resource, perms]) => (
                    perms.map((perm: any) => (
                      <tr key={perm.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{resource}.{perm.action}</td>
                        {roles?.map((r: any) => (
                          <td key={r.id} className="p-3 text-center">
                            <span className="text-xs">—</span>
                          </td>
                        ))}
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Permissões: {roles?.find((r: any) => r.id === selectedRoleId)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {Object.entries(groupedPermissions).map(([resource, perms]) => (
              <div key={resource}>
                <h4 className="font-semibold text-sm mb-2 capitalize flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" /> {resource}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 ml-4">
                  {perms.map((perm: any) => (
                    <label key={perm.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={editPerms.includes(perm.id)}
                        onCheckedChange={(checked) => {
                          setEditPerms(prev => checked ? [...prev, perm.id] : prev.filter(id => id !== perm.id));
                        }}
                      />
                      {perm.action}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-4">
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
