import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Package, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  LogIn, 
  FileText,
  Send,
  Building2
} from "lucide-react";

export default function SupplierPortal() {
  const [accessCode, setAccessCode] = useState("");
  const [supplierSession, setSupplierSession] = useState<{
    supplier: { id: number; name: string; email: string | null };
    token: string;
  } | null>(null);
  const [selectedDefect, setSelectedDefect] = useState<number | null>(null);
  const [updateForm, setUpdateForm] = useState({
    cause: "",
    correctiveActions: "",
    supplyFeedback: "",
  });

  const loginMutation = trpc.supplier.loginWithCode.useMutation({
    onSuccess: (data) => {
      setSupplierSession(data);
      toast.success(`Bem-vindo, ${data.supplier.name}!`);
    },
    onError: (error) => {
      toast.error("Código de acesso inválido");
    },
  });

  const { data: defects, isLoading, refetch } = trpc.supplier.myDefects.useQuery(
    { supplierName: supplierSession?.supplier.name || "" },
    { enabled: !!supplierSession }
  );

  const updateDefectMutation = trpc.supplier.updateDefect.useMutation({
    onSuccess: () => {
      toast.success("Defeito atualizado com sucesso!");
      setSelectedDefect(null);
      setUpdateForm({ cause: "", correctiveActions: "", supplyFeedback: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const handleLogin = () => {
    if (!accessCode.trim()) {
      toast.error("Digite o código de acesso");
      return;
    }
    loginMutation.mutate({ accessCode: accessCode.trim() });
  };

  const handleLogout = () => {
    setSupplierSession(null);
    setAccessCode("");
  };

  const handleUpdateDefect = () => {
    if (!selectedDefect || !supplierSession) return;
    
    updateDefectMutation.mutate({
      defectId: selectedDefect,
      supplierName: supplierSession.supplier.name,
      ...updateForm,
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "CLOSED":
        return <Badge className="bg-green-500">Fechado</Badge>;
      case "DELAYED":
        return <Badge className="bg-red-500">Atrasado</Badge>;
      case "ONGOING":
        return <Badge className="bg-blue-500">Em Andamento</Badge>;
      default:
        return <Badge className="bg-gray-500">{status || "N/A"}</Badge>;
    }
  };

  const getStepBadge = (step: string) => {
    const stepColors: Record<string, string> = {
      "Aguardando Disposição": "bg-yellow-500",
      "Aguardando Análise Técnica": "bg-orange-500",
      "Aguardando Causa Raiz": "bg-purple-500",
      "Aguardando Ação Corretiva": "bg-blue-500",
      "Aguardando Validação de Ação Corretiva": "bg-indigo-500",
      "CLOSED": "bg-green-500",
    };
    return <Badge className={stepColors[step] || "bg-gray-500"}>{step}</Badge>;
  };

  // Login Screen
  if (!supplierSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Portal do Fornecedor</CardTitle>
            <CardDescription>
              QMS MAO Brasil - Sistema de Gestão de Qualidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessCode">Código de Acesso</Label>
              <Input
                id="accessCode"
                type="text"
                placeholder="Digite seu código de acesso"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleLogin}
              disabled={loginMutation.isPending}
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Solicite seu código de acesso ao departamento de qualidade da MAO Brasil.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Supplier Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">Portal do Fornecedor</h1>
              <p className="text-sm text-muted-foreground">{supplierSession.supplier.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{defects?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total de Casos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {defects?.filter(d => d.status === "ONGOING").length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Em Andamento</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {defects?.filter(d => d.status === "DELAYED").length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Atrasados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {defects?.filter(d => d.status === "CLOSED").length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Fechados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Defects List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Meus Casos de Defeito
            </CardTitle>
            <CardDescription>
              Visualize e atualize informações dos casos atribuídos à sua empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando casos...
              </div>
            ) : defects?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum caso encontrado para sua empresa.
              </div>
            ) : (
              <div className="space-y-4">
                {defects?.map((defect) => (
                  <div
                    key={defect.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">{defect.docNumber}</span>
                          {getStatusBadge(defect.status)}
                          {getStepBadge(defect.step)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <strong>Sintoma:</strong> {defect.symptom || "N/A"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Material:</strong> {defect.material || "N/A"} | 
                          <strong> P/N:</strong> {defect.pn || "N/A"}
                        </p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Aberto: {defect.openDate}</span>
                          <span>Aging: {defect.agingTotal} dias</span>
                          <span>Responsável: {defect.currentResponsible}</span>
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setSelectedDefect(defect.id);
                              setUpdateForm({
                                cause: defect.cause || "",
                                correctiveActions: defect.correctiveActions || "",
                                supplyFeedback: defect.supplyFeedback || "",
                              });
                            }}
                            disabled={defect.status === "CLOSED"}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {defect.status === "CLOSED" ? "Fechado" : "Atualizar"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Atualizar Caso {defect.docNumber}</DialogTitle>
                            <DialogDescription>
                              Preencha as informações de causa raiz e ações corretivas
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Causa Raiz</Label>
                              <Textarea
                                placeholder="Descreva a causa raiz identificada..."
                                value={updateForm.cause}
                                onChange={(e) => setUpdateForm(prev => ({ ...prev, cause: e.target.value }))}
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Ações Corretivas</Label>
                              <Textarea
                                placeholder="Descreva as ações corretivas implementadas..."
                                value={updateForm.correctiveActions}
                                onChange={(e) => setUpdateForm(prev => ({ ...prev, correctiveActions: e.target.value }))}
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Feedback do Fornecedor</Label>
                              <Textarea
                                placeholder="Comentários adicionais..."
                                value={updateForm.supplyFeedback}
                                onChange={(e) => setUpdateForm(prev => ({ ...prev, supplyFeedback: e.target.value }))}
                                rows={2}
                              />
                            </div>
                            <Button 
                              className="w-full" 
                              onClick={handleUpdateDefect}
                              disabled={updateDefectMutation.isPending}
                            >
                              {updateDefectMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
