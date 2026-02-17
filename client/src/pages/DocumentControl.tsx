import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Plus, Loader2, Search, Eye, Trash2, Upload, CheckCircle2, Clock, XCircle, FileCheck, ArrowRight, AlertTriangle, FolderOpen } from "lucide-react";
import { Can } from "@/components/Can";

const STATUS_MAP: Record<string, { label: string; color: string; icon: any; bgClass: string }> = {
  DRAFT: { label: "Rascunho", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", icon: FileText, bgClass: "bg-gray-500/10" },
  IN_REVIEW: { label: "Em Revisão", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Clock, bgClass: "bg-yellow-500/10" },
  APPROVED: { label: "Aprovado", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle2, bgClass: "bg-green-500/10" },
  OBSOLETE: { label: "Obsoleto", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle, bgClass: "bg-red-500/10" },
};

const CATEGORIES = [
  { value: "PROCEDURE", label: "Procedimento" },
  { value: "WORK_INSTRUCTION", label: "Instrução de Trabalho" },
  { value: "FORM", label: "Formulário" },
  { value: "TEMPLATE", label: "Template" },
  { value: "SPECIFICATION", label: "Especificação" },
  { value: "REPORT", label: "Relatório" },
  { value: "CERTIFICATE", label: "Certificado" },
  { value: "OTHER", label: "Outro" },
];

// Visual workflow steps for document approval
const WORKFLOW_STEPS = [
  { id: "DRAFT", label: "Rascunho", icon: FileText, color: "text-gray-500" },
  { id: "IN_REVIEW", label: "Em Revisão", icon: Clock, color: "text-yellow-500" },
  { id: "APPROVED", label: "Aprovado", icon: CheckCircle2, color: "text-green-500" },
  { id: "OBSOLETE", label: "Obsoleto", icon: XCircle, color: "text-red-500" },
];

export default function DocumentControl() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("PROCEDURE");
  const [newTags, setNewTags] = useState("");
  const [versionOpen, setVersionOpen] = useState(false);
  const [versionUrl, setVersionUrl] = useState("");
  const [versionDesc, setVersionDesc] = useState("");

  const { data: docs, isLoading } = trpc.document.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    search: search || undefined,
  });

  const { data: detail } = trpc.document.byId.useQuery({ id: detailId! }, { enabled: !!detailId });
  const { data: versions } = trpc.document.versions.useQuery({ documentId: detailId! }, { enabled: !!detailId });

  const createMutation = trpc.document.create.useMutation({
    onSuccess: () => {
      toast.success("Documento criado");
      utils.document.list.invalidate();
      setCreateOpen(false);
      setNewTitle(""); setNewTags("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatusMutation = trpc.document.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado");
      utils.document.list.invalidate();
      utils.document.byId.invalidate({ id: detailId! });
    },
  });

  const addVersionMutation = trpc.document.addVersion.useMutation({
    onSuccess: () => {
      toast.success("Nova versão adicionada");
      utils.document.versions.invalidate({ documentId: detailId! });
      utils.document.byId.invalidate({ id: detailId! });
      setVersionOpen(false); setVersionUrl(""); setVersionDesc("");
    },
  });

  const deleteMutation = trpc.document.delete.useMutation({
    onSuccess: () => {
      toast.success("Documento removido");
      utils.document.list.invalidate();
      setDetailId(null);
    },
  });

  // Stats
  const stats = useMemo(() => {
    if (!docs) return { total: 0, draft: 0, inReview: 0, approved: 0, obsolete: 0 };
    return {
      total: docs.length,
      draft: docs.filter((d: any) => d.status === "DRAFT").length,
      inReview: docs.filter((d: any) => d.status === "IN_REVIEW").length,
      approved: docs.filter((d: any) => d.status === "APPROVED").length,
      obsolete: docs.filter((d: any) => d.status === "OBSOLETE").length,
    };
  }, [docs]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-500" /> Controle de Documentos
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie documentos ISO, procedimentos e instruções de trabalho</p>
        </div>
        <Can resource="document" action="create">
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo Documento</Button>
        </Can>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setStatusFilter("all")}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xl font-bold">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {[
          { key: "DRAFT", count: stats.draft, icon: FileText, color: "text-gray-500" },
          { key: "IN_REVIEW", count: stats.inReview, icon: Clock, color: "text-yellow-500" },
          { key: "APPROVED", count: stats.approved, icon: CheckCircle2, color: "text-green-500" },
          { key: "OBSOLETE", count: stats.obsolete, icon: XCircle, color: "text-red-500" },
        ].map(s => (
          <Card key={s.key} className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === s.key ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === s.key ? "all" : s.key)}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <div>
                  <p className="text-xl font-bold">{s.count}</p>
                  <p className="text-[10px] text-muted-foreground">{STATUS_MAP[s.key].label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Approval Workflow Visual */}
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {WORKFLOW_STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm ${
                  statusFilter === step.id ? "ring-2 ring-primary bg-primary/5" : "bg-muted/30"
                }`}>
                  <step.icon className={`h-4 w-4 ${step.color}`} />
                  <span className="font-medium">{step.label}</span>
                </div>
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por título ou número..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      <div className="grid gap-3">
        {docs?.map((doc: any) => {
          const st = STATUS_MAP[doc.status] || STATUS_MAP.DRAFT;
          const StIcon = st.icon;
          return (
            <Card key={doc.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => setDetailId(doc.id)}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${st.bgClass} flex items-center justify-center`}>
                    <StIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{doc.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span className="font-mono">{doc.documentNumber}</span>
                      <span>|</span>
                      <span>{CATEGORIES.find(c => c.value === doc.category)?.label || doc.category?.replace(/_/g, " ")}</span>
                      <span>|</span>
                      <span>v{doc.currentVersion}</span>
                      {doc.tags && (doc.tags as string[]).length > 0 && (
                        <>
                          <span>|</span>
                          {(doc.tags as string[]).slice(0, 3).map((t: string) => (
                            <Badge key={t} variant="outline" className="text-[9px] px-1">{t}</Badge>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Badge className={st.color}>{st.label}</Badge>
              </CardContent>
            </Card>
          );
        })}
        {(!docs || docs.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum documento encontrado.</p>
              <p className="text-xs text-muted-foreground mt-1">Crie um novo para começar a gerenciar seus documentos.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" /> {detail?.title}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-5">
              {/* Document Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 bg-muted/30 rounded-lg">
                  <span className="text-xs text-muted-foreground block">Número</span>
                  <span className="font-mono font-medium">{detail.documentNumber}</span>
                </div>
                <div className="p-2 bg-muted/30 rounded-lg">
                  <span className="text-xs text-muted-foreground block">Categoria</span>
                  <span className="font-medium">{CATEGORIES.find(c => c.value === detail.category)?.label || detail.category}</span>
                </div>
                <div className="p-2 bg-muted/30 rounded-lg">
                  <span className="text-xs text-muted-foreground block">Versão</span>
                  <span className="font-medium">v{detail.currentVersion}</span>
                </div>
                <div className="p-2 bg-muted/30 rounded-lg">
                  <span className="text-xs text-muted-foreground block">Criado em</span>
                  <span className="font-medium">{new Date(detail.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Visual Workflow Status */}
              <div className="p-3 bg-muted/20 rounded-lg">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Workflow de Aprovação</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const isCurrent = detail.status === step.id;
                    const isPast = WORKFLOW_STEPS.findIndex(s => s.id === detail.status) > idx;
                    return (
                      <div key={step.id} className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          isCurrent ? "ring-2 ring-primary bg-primary/10 border-primary" :
                          isPast ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300" :
                          "bg-muted/50 text-muted-foreground"
                        }`}>
                          <step.icon className={`h-3.5 w-3.5 ${isCurrent ? step.color : isPast ? "text-green-500" : "text-muted-foreground/50"}`} />
                          {step.label}
                        </div>
                        {idx < WORKFLOW_STEPS.length - 1 && (
                          <ArrowRight className={`h-3 w-3 ${isPast ? "text-green-500" : "text-muted-foreground/30"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <Can resource="document" action="manage">
                <div className="flex flex-wrap gap-2">
                  {detail.status === "DRAFT" && (
                    <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: detail.id, status: "IN_REVIEW" })}
                      disabled={updateStatusMutation.isPending}>
                      <Clock className="h-3 w-3 mr-1" /> Enviar para Revisão
                    </Button>
                  )}
                  {detail.status === "IN_REVIEW" && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700"
                        onClick={() => updateStatusMutation.mutate({ id: detail.id, status: "APPROVED" })}
                        disabled={updateStatusMutation.isPending}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: detail.id, status: "DRAFT" })}
                        disabled={updateStatusMutation.isPending}>
                        <ArrowRight className="h-3 w-3 mr-1 rotate-180" /> Devolver ao Rascunho
                      </Button>
                    </>
                  )}
                  {detail.status === "APPROVED" && (
                    <Button size="sm" variant="secondary"
                      onClick={() => updateStatusMutation.mutate({ id: detail.id, status: "OBSOLETE" })}
                      disabled={updateStatusMutation.isPending}>
                      <AlertTriangle className="h-3 w-3 mr-1" /> Tornar Obsoleto
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setVersionOpen(true)}>
                    <Upload className="h-3 w-3 mr-1" /> Nova Versão
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => {
                    if (confirm("Excluir este documento?")) deleteMutation.mutate({ id: detail.id });
                  }}>
                    <Trash2 className="h-3 w-3 mr-1" /> Excluir
                  </Button>
                </div>
              </Can>

              {/* Version History */}
              <div>
                <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Histórico de Versões</h4>
                <div className="space-y-2">
                  {versions?.map((v: any, idx: number) => (
                    <div key={v.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-500">
                          v{v.version}
                        </div>
                        {idx < (versions?.length || 0) - 1 && <div className="w-0.5 h-4 bg-border mt-1" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{v.changeDescription || "Versão inicial"}</span>
                          <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span>
                        </div>
                        {v.fileUrl && (
                          <a href={v.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                            <Eye className="h-3 w-3" /> Ver arquivo
                          </a>
                        )}
                        {v.fileSize && <span className="text-xs text-muted-foreground ml-2">{(v.fileSize / 1024).toFixed(1)} KB</span>}
                      </div>
                    </div>
                  ))}
                  {(!versions || versions.length === 0) && (
                    <p className="text-muted-foreground text-sm text-center py-4">Nenhuma versão registrada</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Documento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Procedimento de Inspeção de Entrada" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="ISO, qualidade, inspeção" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={() => createMutation.mutate({
                title: newTitle, category: newCategory,
                tags: newTags ? newTags.split(",").map(t => t.trim()) : undefined,
              })} disabled={createMutation.isPending || !newTitle}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Documento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Version Dialog */}
      <Dialog open={versionOpen} onOpenChange={setVersionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Versão</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>URL do Arquivo</Label>
              <Input value={versionUrl} onChange={e => setVersionUrl(e.target.value)} placeholder="https://..." />
              <p className="text-xs text-muted-foreground mt-1">Cole a URL do arquivo hospedado (PDF, DOCX, etc.)</p>
            </div>
            <div>
              <Label>Descrição da Alteração</Label>
              <Textarea value={versionDesc} onChange={e => setVersionDesc(e.target.value)} placeholder="O que mudou nesta versão?" rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setVersionOpen(false)}>Cancelar</Button>
              <Button onClick={() => {
                if (detailId) addVersionMutation.mutate({ documentId: detailId, fileUrl: versionUrl, changeDescription: versionDesc });
              }} disabled={addVersionMutation.isPending || !versionUrl}>
                {addVersionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Adicionar Versão
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
