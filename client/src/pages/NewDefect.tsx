import { useState } from "react";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

export default function NewDefect() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  // Form state
  const [formData, setFormData] = useState({
    docNumber: "",
    openDate: new Date().toISOString().split("T")[0],
    mg: "",
    defectsSeverity: "",
    category: "",
    model: "",
    customer: "",
    pn: "",
    material: "",
    symptom: "",
    detection: "",
    qty: "",
    description: "",
    evidence: "",
    supplier: "",
    owner: "",
    targetDate: "",
  });

  // Mutation para criar defeito
  const createDefect = trpc.defect.create.useMutation({
    onSuccess: (data) => {
      toast.success("Defeito criado com sucesso!");
      utils.defect.list.invalidate();
      setLocation(`/defects/${data?.id}`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar defeito: ${error.message}`);
    },
  });

  // Buscar lista de fornecedores para o select
  const { data: suppliers } = trpc.supplier.list.useQuery();

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.docNumber.trim()) {
      toast.error("Número do documento é obrigatório");
      return;
    }
    if (!formData.openDate) {
      toast.error("Data de abertura é obrigatória");
      return;
    }
    if (!formData.supplier) {
      toast.error("Fornecedor é obrigatório");
      return;
    }
    if (!formData.symptom.trim()) {
      toast.error("Sintoma é obrigatório");
      return;
    }

    createDefect.mutate({
      docNumber: formData.docNumber.trim(),
      openDate: formData.openDate,
      mg: formData.mg as "S" | "A" | "B" | "C" | undefined,
      defectsSeverity: formData.defectsSeverity || undefined,
      category: formData.category || undefined,
      model: formData.model || undefined,
      customer: formData.customer || undefined,
      pn: formData.pn || undefined,
      material: formData.material || undefined,
      symptom: formData.symptom.trim(),
      detection: formData.detection || undefined,
      qty: formData.qty ? parseInt(formData.qty) : undefined,
      description: formData.description || undefined,
      evidence: formData.evidence || undefined,
      supplier: formData.supplier,
      owner: formData.owner || undefined,
      targetDate: formData.targetDate || undefined,
    });
  };

  // Gerar próximo número de documento automaticamente
  const generateDocNumber = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);
    // Formato: XX.MM.YY onde XX é um número sequencial
    const random = Math.floor(Math.random() * 100).toString().padStart(2, "0");
    return `${random}.${month}.${year}`;
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/defects")}
              className="h-10 px-4 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-medium transition-all duration-200 shadow-sm hover:shadow group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Novo Defeito</h1>
              <p className="text-muted-foreground">Registre um novo caso de defeito de qualidade</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identificação */}
          <Card>
            <CardHeader>
              <CardTitle>Identificação</CardTitle>
              <CardDescription>Informações básicas do defeito</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="docNumber">Número do Documento *</Label>
                <div className="flex gap-2">
                  <Input
                    id="docNumber"
                    value={formData.docNumber}
                    onChange={(e) => handleChange("docNumber", e.target.value)}
                    placeholder="Ex: 01.01.26"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleChange("docNumber", generateDocNumber())}
                  >
                    Gerar
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="openDate">Data de Abertura *</Label>
                <Input
                  id="openDate"
                  type="date"
                  value={formData.openDate}
                  onChange={(e) => handleChange("openDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetDate">Data Alvo</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => handleChange("targetDate", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Classificação */}
          <Card>
            <CardHeader>
              <CardTitle>Classificação</CardTitle>
              <CardDescription>Severidade e categoria do defeito</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mg">Severidade (MG)</Label>
                <Select value={formData.mg} onValueChange={(v) => handleChange("mg", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S">S - Safety Failure</SelectItem>
                    <SelectItem value="A">A - Blocking</SelectItem>
                    <SelectItem value="B">B - Major</SelectItem>
                    <SelectItem value="C">C - Minor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defectsSeverity">Tipo de Defeito</Label>
                <Select value={formData.defectsSeverity} onValueChange={(v) => handleChange("defectsSeverity", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Major">Major</SelectItem>
                    <SelectItem value="Minor">Minor</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => handleChange("category", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Packaging">Packaging</SelectItem>
                    <SelectItem value="Cosmetic">Cosmetic</SelectItem>
                    <SelectItem value="Functional">Functional</SelectItem>
                    <SelectItem value="Dimensional">Dimensional</SelectItem>
                    <SelectItem value="Documentation">Documentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Produto */}
          <Card>
            <CardHeader>
              <CardTitle>Produto</CardTitle>
              <CardDescription>Informações do produto afetado</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleChange("model", e.target.value)}
                  placeholder="Ex: TV 55"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer">Cliente</Label>
                <Input
                  id="customer"
                  value={formData.customer}
                  onChange={(e) => handleChange("customer", e.target.value)}
                  placeholder="Ex: Samsung"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pn">Part Number (P/N)</Label>
                <Input
                  id="pn"
                  value={formData.pn}
                  onChange={(e) => handleChange("pn", e.target.value)}
                  placeholder="Ex: BN96-12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material">Material</Label>
                <Input
                  id="material"
                  value={formData.material}
                  onChange={(e) => handleChange("material", e.target.value)}
                  placeholder="Ex: EPS"
                />
              </div>
            </CardContent>
          </Card>

          {/* Defeito */}
          <Card>
            <CardHeader>
              <CardTitle>Defeito</CardTitle>
              <CardDescription>Detalhes do problema identificado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Fornecedor *</Label>
                  <Select value={formData.supplier} onValueChange={(v) => handleChange("supplier", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map((s: any) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="detection">Detecção</Label>
                  <Select value={formData.detection} onValueChange={(v) => handleChange("detection", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IQC">IQC - Incoming Quality Control</SelectItem>
                      <SelectItem value="Production">Production Line</SelectItem>
                      <SelectItem value="OQC">OQC - Outgoing Quality Control</SelectItem>
                      <SelectItem value="Field">Field Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qty">Quantidade Defeituosa</Label>
                  <Input
                    id="qty"
                    type="number"
                    min="0"
                    value={formData.qty}
                    onChange={(e) => handleChange("qty", e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="symptom">Sintoma *</Label>
                <Textarea
                  id="symptom"
                  value={formData.symptom}
                  onChange={(e) => handleChange("symptom", e.target.value)}
                  placeholder="Descreva o sintoma do defeito..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição Detalhada</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Forneça detalhes adicionais sobre o defeito..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evidence">Evidências</Label>
                <Textarea
                  id="evidence"
                  value={formData.evidence}
                  onChange={(e) => handleChange("evidence", e.target.value)}
                  placeholder="Descreva as evidências coletadas..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Responsável */}
          <Card>
            <CardHeader>
              <CardTitle>Responsável</CardTitle>
              <CardDescription>Atribuição do caso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-md">
                <Label htmlFor="owner">SQA Owner</Label>
                <Input
                  id="owner"
                  value={formData.owner}
                  onChange={(e) => handleChange("owner", e.target.value)}
                  placeholder="Nome do responsável SQA"
                />
              </div>
            </CardContent>
          </Card>

          {/* Alerta */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Após criar o defeito:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>O status inicial será "ONGOING" e o step será "Aguardando Disposição"</li>
                <li>O fornecedor será notificado automaticamente (se configurado)</li>
                <li>Você poderá adicionar causa raiz, ações corretivas e anexos na página de detalhes</li>
              </ul>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setLocation("/defects")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createDefect.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createDefect.isPending ? "Salvando..." : "Criar Defeito"}
            </Button>
          </div>
        </form>
      </div>
  );
}
