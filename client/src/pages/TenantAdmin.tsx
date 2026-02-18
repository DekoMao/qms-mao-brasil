import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Can } from "@/components/Can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Users,
  UserPlus,
  UserMinus,
  Crown,
  Shield,
  ChevronRight,
  Search,
  Loader2,
} from "lucide-react";

export default function TenantAdmin() {
  const { data: tenants, isLoading: tenantsLoading } = trpc.tenant.list.useQuery();
  const { data: activeTenant } = trpc.tenant.activeTenant.useQuery();
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: "", slug: "", plan: "free", maxUsers: 50, maxDefects: 10000 });
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const createMutation = trpc.tenant.create.useMutation();
  const addUserMutation = trpc.tenant.addUser.useMutation();
  const removeUserMutation = trpc.tenant.removeUser.useMutation();
  const switchMutation = trpc.tenant.switchTenant.useMutation();
  const utils = trpc.useUtils();

  const selectedTenant = tenants?.find((t: any) => t.id === selectedTenantId);
  const { data: members, isLoading: membersLoading } = trpc.tenant.members.useQuery(
    { tenantId: selectedTenantId! },
    { enabled: !!selectedTenantId }
  );
  const { data: allUsers } = trpc.tenant.allUsers.useQuery(undefined, { enabled: showAddUserDialog });

  const availableUsers = useMemo(() => {
    if (!allUsers || !members) return [];
    const memberIds = new Set(members.map((m: any) => m.userId));
    return allUsers.filter((u: any) => !memberIds.has(u.id) && u.name?.toLowerCase().includes(userSearch.toLowerCase()));
  }, [allUsers, members, userSearch]);

  const handleCreate = async () => {
    if (!newTenant.name || !newTenant.slug) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    try {
      await createMutation.mutateAsync(newTenant);
      toast.success("Tenant criado com sucesso");
      setShowCreateDialog(false);
      setNewTenant({ name: "", slug: "", plan: "free", maxUsers: 50, maxDefects: 10000 });
      utils.tenant.list.invalidate();
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar tenant");
    }
  };

  const handleAddUser = async (userId: number) => {
    if (!selectedTenantId) return;
    try {
      await addUserMutation.mutateAsync({ userId, tenantId: selectedTenantId });
      toast.success("Usuário adicionado ao tenant");
      utils.tenant.members.invalidate({ tenantId: selectedTenantId });
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar usuário");
    }
  };

  const handleRemoveUser = async (userId: number) => {
    if (!selectedTenantId) return;
    try {
      await removeUserMutation.mutateAsync({ userId, tenantId: selectedTenantId });
      toast.success("Usuário removido do tenant");
      utils.tenant.members.invalidate({ tenantId: selectedTenantId });
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover usuário");
    }
  };

  const handleSwitchTenant = async (tenantId: number) => {
    try {
      await switchMutation.mutateAsync({ tenantId });
      toast.success("Tenant ativo alterado");
      utils.invalidate();
    } catch (e: any) {
      toast.error(e.message || "Erro ao trocar tenant");
    }
  };

  if (tenantsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Multi-tenancy</h2>
          <p className="text-muted-foreground">Gerencie organizações, membros e isolamento de dados</p>
        </div>
        <Can resource="tenant" action="manage" fallback={null}>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Novo Tenant</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Tenant</DialogTitle>
                <DialogDescription>Crie uma nova organização para isolar dados e usuários.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={newTenant.name}
                    onChange={e => setNewTenant(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Planta São Paulo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <Input
                    value={newTenant.slug}
                    onChange={e => setNewTenant(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                    placeholder="Ex: planta-sp"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plano</Label>
                    <Select value={newTenant.plan} onValueChange={v => setNewTenant(prev => ({ ...prev, plan: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Máx. Usuários</Label>
                    <Input
                      type="number"
                      value={newTenant.maxUsers}
                      onChange={e => setNewTenant(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 50 }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Can>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Organizações</h3>
          {tenants?.map((tenant: any) => (
            <Card
              key={tenant.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedTenantId === tenant.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedTenantId(tenant.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeTenant?.tenantId === tenant.id && (
                      <Badge variant="default" className="text-[10px]">Ativo</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">{tenant.plan || "free"}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!tenants || tenants.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum tenant cadastrado</p>
          )}
        </div>

        {/* Tenant Details */}
        <div className="lg:col-span-2">
          {selectedTenant ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {selectedTenant.name}
                    </CardTitle>
                    <CardDescription>
                      Slug: {selectedTenant.slug} | Plano: {selectedTenant.plan || "free"} | Máx. Usuários: {selectedTenant.maxUsers || "Ilimitado"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {activeTenant?.tenantId !== selectedTenant.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSwitchTenant(selectedTenant.id)}
                        disabled={switchMutation.isPending}
                      >
                        <Crown className="mr-1 h-3 w-3" />
                        Ativar
                      </Button>
                    )}
                    <Can resource="tenant" action="manage" fallback={null}>
                      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <UserPlus className="mr-1 h-3 w-3" />
                            Adicionar Membro
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adicionar Membro</DialogTitle>
                            <DialogDescription>Selecione um usuário para adicionar a {selectedTenant.name}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                className="pl-9"
                                placeholder="Buscar usuário..."
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                              />
                            </div>
                            <div className="max-h-64 overflow-y-auto space-y-2">
                              {availableUsers.map((user: any) => (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                                >
                                  <div>
                                    <p className="font-medium text-sm">{user.name || "Sem nome"}</p>
                                    <p className="text-xs text-muted-foreground">{user.email || "-"}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAddUser(user.id)}
                                    disabled={addUserMutation.isPending}
                                  >
                                    <UserPlus className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              {availableUsers.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Nenhum usuário disponível
                                </p>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </Can>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Membros ({members?.length || 0})
                  </div>
                  {membersLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {members?.map((member: any) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">
                                {(member.userName || "U").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{member.userName || "Sem nome"}</p>
                              <p className="text-xs text-muted-foreground">{member.userEmail || "-"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={member.role === "admin" ? "default" : "secondary"} className="text-[10px]">
                              {member.role === "admin" ? (
                                <><Shield className="mr-1 h-3 w-3" />Admin</>
                              ) : (
                                member.role || "user"
                              )}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">{member.userRole}</Badge>
                            <Can resource="tenant" action="manage" fallback={null}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveUser(member.userId)}
                                disabled={removeUserMutation.isPending}
                              >
                                <UserMinus className="h-3 w-3" />
                              </Button>
                            </Can>
                          </div>
                        </div>
                      ))}
                      {(!members || members.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Nenhum membro neste tenant
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Building2 className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium">Selecione um tenant</p>
                <p className="text-sm">Clique em uma organização à esquerda para ver detalhes e membros</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
