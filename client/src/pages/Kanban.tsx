import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";
import { Clock, AlertTriangle, User } from "lucide-react";

const KANBAN_COLUMNS = [
  { id: "Aguardando Disposição", title: "Disposição", color: "bg-slate-500" },
  { id: "Aguardando Análise Técnica", title: "Análise Técnica", color: "bg-blue-500" },
  { id: "Aguardando Causa Raiz", title: "Causa Raiz", color: "bg-purple-500" },
  { id: "Aguardando Ação Corretiva", title: "Ação Corretiva", color: "bg-orange-500" },
  { id: "Aguardando Validação de Ação Corretiva", title: "Validação", color: "bg-yellow-500" },
  { id: "CLOSED", title: "Fechado", color: "bg-green-500" },
];

function getSeverityClass(mg: string | null) {
  switch (mg) {
    case "S": return "bg-red-600 text-white";
    case "A": return "bg-orange-500 text-white";
    case "B": return "bg-yellow-500 text-black";
    case "C": return "bg-green-500 text-white";
    default: return "bg-gray-200 text-gray-700";
  }
}

function getAgingColor(aging: number) {
  if (aging <= 7) return "text-green-600";
  if (aging <= 14) return "text-yellow-600";
  if (aging <= 30) return "text-orange-600";
  return "text-red-600";
}

export default function Kanban() {
  const [, setLocation] = useLocation();
  const { data: defectsResult, isLoading } = trpc.defect.list.useQuery({});
  const defects = defectsResult?.data;

  // Group defects by step
  const defectsByStep = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.id] = defects?.filter(d => d.step === col.id) || [];
    return acc;
  }, {} as Record<string, typeof defects>);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Kanban - Workflow 8D</h1>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(col => (
            <div key={col.id} className="min-w-[280px] w-[280px]">
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-32 w-full mb-2" />
              <Skeleton className="h-32 w-full mb-2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Kanban - Workflow 8D</h1>
          <p className="text-muted-foreground">
            {defects?.length || 0} casos no total
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map(column => {
          const columnDefects = defectsByStep[column.id] || [];
          const columnCount = columnDefects.length;
          
          return (
            <div key={column.id} className="min-w-[300px] w-[300px] flex flex-col">
              {/* Column Header */}
              <div className={`${column.color} rounded-t-lg px-4 py-3 text-white`}>
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{column.title}</h3>
                  <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                    {columnCount}
                  </Badge>
                </div>
              </div>

              {/* Column Content */}
              <ScrollArea className="flex-1 bg-muted/30 rounded-b-lg border border-t-0 min-h-[500px] max-h-[calc(100vh-250px)]">
                <div className="p-2 space-y-2">
                  {columnDefects.map(defect => (
                    <Card 
                      key={defect.id} 
                      className="kanban-card cursor-pointer hover:border-primary/50"
                      onClick={() => setLocation(`/defects/${defect.id}`)}
                    >
                      <CardContent className="p-3">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-primary text-sm">{defect.docNumber}</span>
                          {defect.mg && (
                            <Badge className={`${getSeverityClass(defect.mg)} text-xs px-1.5`}>
                              {defect.mg}
                            </Badge>
                          )}
                        </div>

                        {/* Supplier */}
                        <p className="text-sm font-medium truncate mb-1">
                          {defect.supplier || "Sem fornecedor"}
                        </p>

                        {/* Symptom */}
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {defect.symptom || "Sem sintoma definido"}
                        </p>

                        {/* Footer */}
                        <div className="flex justify-between items-center text-xs">
                          {/* Responsible */}
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <Badge variant={defect.currentResponsible === "SQA" ? "default" : "outline"} className="text-xs px-1.5 py-0">
                              {defect.currentResponsible}
                            </Badge>
                          </div>

                          {/* Aging */}
                          <div className={`flex items-center gap-1 ${getAgingColor(defect.agingTotal)}`}>
                            <Clock className="h-3 w-3" />
                            <span className="font-medium">{defect.agingTotal}d</span>
                          </div>
                        </div>

                        {/* Alerts */}
                        {(defect.daysLate > 0 || defect.status === "DELAYED") && (
                          <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            <span>
                              {defect.status === "DELAYED" ? "DELAYED" : `${defect.daysLate}d atrasado`}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {columnDefects.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum caso nesta etapa
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Severidade:</span>
              <Badge className="severity-s text-xs">S</Badge>
              <Badge className="severity-a text-xs">A</Badge>
              <Badge className="severity-b text-xs">B</Badge>
              <Badge className="severity-c text-xs">C</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Aging:</span>
              <span className="text-green-600">≤7d</span>
              <span className="text-yellow-600">8-14d</span>
              <span className="text-orange-600">15-30d</span>
              <span className="text-red-600">&gt;30d</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
