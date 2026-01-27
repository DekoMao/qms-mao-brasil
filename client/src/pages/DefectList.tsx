import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Search, Filter, Plus, Download, RefreshCw, X } from "lucide-react";

function getStatusClass(status: string | null) {
  switch (status) {
    case "CLOSED": return "status-closed";
    case "ONGOING": return "status-ongoing";
    case "DELAYED": return "status-delayed";
    case "Waiting for CHK Solution": return "status-waiting";
    default: return "bg-gray-100 text-gray-800";
  }
}

function getSeverityClass(mg: string | null) {
  switch (mg) {
    case "S": return "severity-s";
    case "A": return "severity-a";
    case "B": return "severity-b";
    case "C": return "severity-c";
    default: return "bg-gray-200 text-gray-700";
  }
}

function getSlaClass(agingByStep: number) {
  if (agingByStep <= 7) return "sla-green";
  if (agingByStep <= 14) return "sla-yellow";
  return "sla-red";
}

export default function DefectList() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    year: undefined as number | undefined,
    month: undefined as string | undefined,
    weekKey: undefined as string | undefined,
    supplier: undefined as string | undefined,
    symptom: undefined as string | undefined,
    status: undefined as string | undefined,
    step: undefined as string | undefined,
    bucketAging: undefined as string | undefined,
    search: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: defects, isLoading, refetch } = trpc.defect.list.useQuery(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== undefined && v !== ""))
  );
  const { data: filterOptions } = trpc.defect.filterOptions.useQuery();

  const clearFilters = () => {
    setFilters({
      year: undefined,
      month: undefined,
      weekKey: undefined,
      supplier: undefined,
      symptom: undefined,
      status: undefined,
      step: undefined,
      bucketAging: undefined,
      search: "",
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    key !== "search" && value !== undefined && value !== ""
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lista de Defeitos</h1>
          <p className="text-muted-foreground">
            {defects?.length || 0} registros encontrados
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setLocation("/defects/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Defeito
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por Doc Number, PN ou descrição..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            <Button 
              variant={showFilters ? "secondary" : "outline"} 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                  !
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && filterOptions && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-1 block">Ano</label>
                <Select
                  value={filters.year?.toString() || "all"}
                  onValueChange={(v) => setFilters({ ...filters, year: v === "all" ? undefined : parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filterOptions.years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Mês</label>
                <Select
                  value={filters.month || "all"}
                  onValueChange={(v) => setFilters({ ...filters, month: v === "all" ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filterOptions.months.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Semana</label>
                <Select
                  value={filters.weekKey || "all"}
                  onValueChange={(v) => setFilters({ ...filters, weekKey: v === "all" ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {filterOptions.weekKeys.slice(0, 20).map((w) => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Fornecedor</label>
                <Select
                  value={filters.supplier || "all"}
                  onValueChange={(v) => setFilters({ ...filters, supplier: v === "all" ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filterOptions.suppliers.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filterOptions.statuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Etapa</label>
                <Select
                  value={filters.step || "all"}
                  onValueChange={(v) => setFilters({ ...filters, step: v === "all" ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {filterOptions.steps.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Aging</label>
                <Select
                  value={filters.bucketAging || "all"}
                  onValueChange={(v) => setFilters({ ...filters, bucketAging: v === "all" ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filterOptions.bucketAgings.map((b) => (
                      <SelectItem key={b} value={b}>{b} dias</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : defects && defects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doc Number</th>
                    <th>MG</th>
                    <th>Fornecedor</th>
                    <th>Modelo</th>
                    <th>Sintoma</th>
                    <th>Status</th>
                    <th>Etapa</th>
                    <th>Responsável</th>
                    <th>Aging</th>
                    <th>SLA</th>
                    <th>Atraso</th>
                  </tr>
                </thead>
                <tbody>
                  {defects.map((defect) => (
                    <tr 
                      key={defect.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/defects/${defect.id}`)}
                    >
                      <td className="font-medium text-primary">{defect.docNumber}</td>
                      <td>
                        {defect.mg && (
                          <Badge className={getSeverityClass(defect.mg)}>{defect.mg}</Badge>
                        )}
                      </td>
                      <td className="max-w-[150px] truncate">{defect.supplier || "-"}</td>
                      <td>{defect.model || "-"}</td>
                      <td className="max-w-[200px] truncate">{defect.symptom || "-"}</td>
                      <td>
                        <Badge className={getStatusClass(defect.status)}>{defect.status}</Badge>
                      </td>
                      <td className="text-xs max-w-[120px] truncate">{defect.step}</td>
                      <td>
                        <Badge variant={defect.currentResponsible === "SQA" ? "default" : "outline"}>
                          {defect.currentResponsible}
                        </Badge>
                      </td>
                      <td className="font-medium">{defect.agingTotal}d</td>
                      <td>
                        <div className={`w-3 h-3 rounded-full ${getSlaClass(defect.agingByStep)}`} 
                             title={`${defect.agingByStep} dias na etapa atual`} />
                      </td>
                      <td className={defect.daysLate > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>
                        {defect.daysLate > 0 ? `${defect.daysLate}d` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum defeito encontrado</p>
              <p className="text-sm mt-1">Tente ajustar os filtros ou criar um novo registro</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
