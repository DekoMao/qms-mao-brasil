import { useState } from "react";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Building2, 
  Plus, 
  Copy, 
  RefreshCw,
  Mail,
  Phone,
  User,
  Key,
  Pencil
} from "lucide-react";

interface Supplier {
  id: number;
  name: string;
  code: string | null;
  email: string | null;
  contactName: string | null;
  phone: string | null;
  accessCode: string | null;
  isActive: boolean;
}

export default function Suppliers() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    code: "",
    email: "",
    contactName: "",
    phone: "",
  });
  const [editSupplier, setEditSupplier] = useState({
    id: 0,
    name: "",
    code: "",
    email: "",
    contactName: "",
    phone: "",
    isActive: true,
  });

  const { data: suppliers, isLoading, refetch } = trpc.supplier.list.useQuery();

  const createMutation = trpc.supplier.create.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor criado com sucesso!");
      setIsCreateOpen(false);
      setNewSupplier({ name: "", code: "", email: "", contactName: "", phone: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateMutation = trpc.supplier.update.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor atualizado com sucesso!");
      setIsEditOpen(false);
      setEditingSupplier(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const regenerateCodeMutation = trpc.supplier.regenerateAccessCode.useMutation({
    onSuccess: () => {
      toast.success("Código de acesso regenerado!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newSupplier.name.trim()) {
      toast.error("Nome do fornecedor é obrigatório");
      return;
    }
    createMutation.mutate(newSupplier);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setEditSupplier({
      id: supplier.id,
      name: supplier.name,
      code: supplier.code || "",
      email: supplier.email || "",
      contactName: supplier.contactName || "",
      phone: supplier.phone || "",
      isActive: supplier.isActive,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editSupplier.name.trim()) {
      toast.error("Nome do fornecedor é obrigatório");
      return;
    }
    updateMutation.mutate({
      id: editSupplier.id,
      name: editSupplier.name,
      code: editSupplier.code || undefined,
      email: editSupplier.email || undefined,
      contactName: editSupplier.contactName || undefined,
      phone: editSupplier.phone || undefined,
      isActive: editSupplier.isActive,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Código copiado para a área de transferência!");
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gerenciamento de Fornecedores</h1>
            <p className="text-muted-foreground">
              Gerencie fornecedores e seus códigos de acesso ao portal
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Fornecedor</DialogTitle>
                <DialogDescription>
                  Preencha os dados do fornecedor. Um código de acesso será gerado automaticamente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Fornecedor *</Label>
                  <Input
                    placeholder="Ex: ABC Components Ltd"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    placeholder="Código interno (opcional)"
                    value={newSupplier.code}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, code: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    placeholder="contato@fornecedor.com"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Contato</Label>
                  <Input
                    placeholder="Nome da pessoa de contato"
                    value={newSupplier.contactName}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, contactName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="+55 92 99999-9999"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Criando..." : "Criar Fornecedor"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Fornecedor</DialogTitle>
              <DialogDescription>
                Atualize os dados do fornecedor. O código de acesso não será alterado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Fornecedor *</Label>
                <Input
                  placeholder="Ex: ABC Components Ltd"
                  value={editSupplier.name}
                  onChange={(e) => setEditSupplier(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  placeholder="Código interno (opcional)"
                  value={editSupplier.code}
                  onChange={(e) => setEditSupplier(prev => ({ ...prev, code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  placeholder="contato@fornecedor.com"
                  value={editSupplier.email}
                  onChange={(e) => setEditSupplier(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do Contato</Label>
                <Input
                  placeholder="Nome da pessoa de contato"
                  value={editSupplier.contactName}
                  onChange={(e) => setEditSupplier(prev => ({ ...prev, contactName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="+55 92 99999-9999"
                  value={editSupplier.phone}
                  onChange={(e) => setEditSupplier(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Status do Fornecedor</Label>
                  <p className="text-sm text-muted-foreground">
                    Fornecedores inativos não podem acessar o portal
                  </p>
                </div>
                <Switch
                  checked={editSupplier.isActive}
                  onCheckedChange={(checked) => setEditSupplier(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Portal Link Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Link do Portal do Fornecedor</p>
                <p className="text-sm text-blue-700 mt-1">
                  Compartilhe este link com os fornecedores junto com o código de acesso:
                </p>
                <code className="text-xs bg-blue-100 px-2 py-1 rounded mt-2 inline-block">
                  {window.location.origin}/supplier-portal
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suppliers List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Fornecedores Cadastrados
            </CardTitle>
            <CardDescription>
              {suppliers?.length || 0} fornecedores registrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando fornecedores...
              </div>
            ) : suppliers?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum fornecedor cadastrado. Clique em "Novo Fornecedor" para adicionar.
              </div>
            ) : (
              <div className="space-y-4">
                {suppliers?.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{supplier.name}</span>
                          {supplier.code && (
                            <Badge variant="outline">{supplier.code}</Badge>
                          )}
                          <Badge className={supplier.isActive ? "bg-green-500" : "bg-gray-500"}>
                            {supplier.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {supplier.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {supplier.email}
                            </span>
                          )}
                          {supplier.contactName && (
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {supplier.contactName}
                            </span>
                          )}
                          {supplier.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {supplier.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">Código de Acesso:</span>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                            {supplier.accessCode || "N/A"}
                          </code>
                          {supplier.accessCode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(supplier.accessCode!)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(supplier as Supplier)}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => regenerateCodeMutation.mutate({ id: supplier.id })}
                          disabled={regenerateCodeMutation.isPending}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Regenerar Código
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
