import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Plus, Loader2, Search, Eye, Trash2, Upload, CheckCircle2, Clock, XCircle, FileCheck } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Rascunho", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", icon: FileText },
  REVIEW: { label: "Em Revisão", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Clock },
  APPROVED: { label: "Aprovado", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle2 },
  PUBLISHED: { label: "Publicado", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: FileCheck },
  OBSOLETE: { label: "Obsoleto", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
};

const CATEGORIES = ["PROCEDURE", "WORK_INSTRUCTION", "FORM", "POLICY", "STANDARD", "REPORT"];

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
    onError: (err) => toast.error(err.message),
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

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Controle de Documentos</h1>
          <p className="text-muted-foreground mt-1">Gerencie documentos ISO, procedimentos e instruções de trabalho</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo Documento</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por título ou número..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {docs?.map((doc: any) => {
          const st = STATUS_MAP[doc.status] || STATUS_MAP.DRAFT;
          return (
            <Card key={doc.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => setDetailId(doc.id)}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{doc.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="font-mono">{doc.documentNumber}</span>
                      <span>•</span>
                      <span>{doc.category?.replace(/_/g, " ")}</span>
                      <span>•</span>
                      <span>v{doc.currentVersion}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={st.color}>{st.label}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!docs || docs.length === 0) && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            Nenhum documento encontrado. Crie um novo para começar.
          </CardContent></Card>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> {detail?.title}
              <Badge variant="outline" className="font-mono text-xs">{detail?.documentNumber}</Badge>
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Categoria:</span> {detail.category?.replace(/_/g, " ")}</div>
                <div><span className="text-muted-foreground">Versão:</span> v{detail.currentVersion}</div>
                <div><span className="text-muted-foreground">Status:</span>
                  <Badge className={`ml-2 ${(STATUS_MAP[detail.status || "DRAFT"] || STATUS_MAP.DRAFT).color}`}>
                    {(STATUS_MAP[detail.status || "DRAFT"] || STATUS_MAP.DRAFT).label}
                  </Badge>
                </div>
                <div><span className="text-muted-foreground">Criado:</span> {new Date(detail.createdAt).toLocaleDateString()}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                {detail.status === "DRAFT" && (
                  <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: detail.id, status: "IN_REVIEW" })}>
                    Enviar para Revisão
                  </Button>
                )}
                {detail.status === "IN_REVIEW" && (
                  <>
                    <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: detail.id, status: "APPROVED" })}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: detail.id, status: "DRAFT" })}>
                      Devolver
                    </Button>
                  </>
                )}
                {detail.status === "APPROVED" && (
                  <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: detail.id, status: "APPROVED" })}>
                    Publicar
                  </Button>
                )}
                {(detail.status as string) === "PUBLISHED" && (
                  <Button size="sm" variant="secondary" onClick={() => updateStatusMutation.mutate({ id: detail.id, status: "OBSOLETE" })}>
                    Tornar Obsoleto
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setVersionOpen(true)}>
                  <Upload className="h-3 w-3 mr-1" /> Nova Versão
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { deleteMutation.mutate({ id: detail.id }); }}>
                  <Trash2 className="h-3 w-3 mr-1" /> Excluir
                </Button>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Histórico de Versões</h4>
                <div className="space-y-2">
                  {versions?.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                      <div>
                        <span className="font-medium">v{v.version}</span>
                        {v.changeDescription && <span className="text-muted-foreground ml-2">— {v.changeDescription}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span>
                        {v.fileUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={v.fileUrl} target="_blank" rel="noopener noreferrer"><Eye className="h-3 w-3" /></a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!versions || versions.length === 0) && <p className="text-muted-foreground text-sm">Nenhuma versão registrada</p>}
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
            <div><Label>Título</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Procedimento de Inspeção de Entrada" /></div>
            <div>
              <Label>Categoria</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tags (separadas por vírgula)</Label><Input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="ISO, qualidade, inspeção" /></div>
            <div className="flex justify-end gap-2">
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
            <div><Label>URL do Arquivo</Label><Input value={versionUrl} onChange={e => setVersionUrl(e.target.value)} placeholder="https://..." /></div>
            <div><Label>Descrição da Alteração</Label><Textarea value={versionDesc} onChange={e => setVersionDesc(e.target.value)} placeholder="O que mudou nesta versão?" /></div>
            <div className="flex justify-end gap-2">
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
