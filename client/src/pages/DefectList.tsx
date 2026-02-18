import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useLocation, useSearch } from "wouter";
import { Search, Filter, Plus, RefreshCw, X, ChevronDown, MoreHorizontal, CalendarIcon, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function getStatusBadge(status: string | null) {
  switch (status) {
    case "CLOSED": 
      return <Badge className="status-closed hover:opacity-90">CLOSED</Badge>;
    case "ONGOING": 
      return <Badge className="status-ongoing hover:opacity-90">ONGOING</Badge>;
    case "DELAYED": 
      return <Badge className="status-delayed hover:opacity-90">DELAYED</Badge>;
    default: 
      return <Badge className="status-waiting hover:opacity-90">{status || "-"}</Badge>;
  }
}

function getSeverityBadge(mg: string | null) {
  switch (mg) {
    case "S": 
      return <Badge className="severity-s hover:opacity-90">S</Badge>;
    case "A": 
      return <Badge className="severity-a hover:opacity-90">A</Badge>;
    case "B": 
      return <Badge className="severity-b hover:opacity-90">B</Badge>;
    case "C": 
      return <Badge className="severity-c hover:opacity-90">C</Badge>;
    default: 
      return null;
  }
}

// RN-FLT-03: Parse URL query params into initial filter state
function parseUrlFilters(search: string) {
  const params = new URLSearchParams(search);
  return {
    year: params.get("year") ? parseInt(params.get("year")!) : undefined,
    month: params.get("month") || undefined,
    weekKey: params.get("weekKey") || undefined,
    supplier: params.get("supplier") || undefined,
    symptom: params.get("symptom") || undefined,
    status: params.get("status") || undefined,
    step: params.get("step") || undefined,
    bucketAging: params.get("bucketAging") || undefined,
    search: params.get("search") || "",
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    mg: params.get("mg") || undefined,
    model: params.get("model") || undefined,
    customer: params.get("customer") || undefined,
    owner: params.get("owner") || undefined,
  };
}

export default function DefectList() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const initialFilters = useRef(parseUrlFilters(searchString));
  const [filters, setFilters] = useState(initialFilters.current);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    initialFilters.current.dateFrom ? new Date(initialFilters.current.dateFrom + "T00:00:00") : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    initialFilters.current.dateTo ? new Date(initialFilters.current.dateTo + "T00:00:00") : undefined
  );
  const [showFilters, setShowFilters] = useState(true);
  const [exporting, setExporting] = useState(false);

  // RN-FLT-03: Sync filters to URL query params
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    });
    const qs = params.toString();
    const newUrl = qs ? `/defects?${qs}` : "/defects";
    window.history.replaceState(null, "", newUrl);
  }, [filters]);

  const { data: defectsResult, isLoading, refetch } = trpc.defect.list.useQuery(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== undefined && v !== ""))
  );
  const defects = defectsResult?.data;
  const { data: filterOptions } = trpc.defect.filterOptions.useQuery();

  const exportExcel = trpc.defect.exportExcel.useMutation();

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
      dateFrom: undefined,
      dateTo: undefined,
      mg: undefined,
      model: undefined,
      customer: undefined,
      owner: undefined,
    });
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    setFilters({ ...filters, dateFrom: date ? format(date, "yyyy-MM-dd") : undefined });
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    setFilters({ ...filters, dateTo: date ? format(date, "yyyy-MM-dd") : undefined });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    key !== "search" && value !== undefined && value !== ""
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Lista de Defeitos</h1>
          <p className="text-muted-foreground mt-1">
            {defectsResult?.total || 0} registros encontrados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 border-border bg-transparent hover:bg-muted text-foreground">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-border bg-transparent hover:bg-muted text-foreground"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const result = await exportExcel.mutateAsync(
                  Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== undefined && v !== "")) as any
                );
                const byteChars = atob(result.base64);
                const byteNums = new Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
                const blob = new Blob([new Uint8Array(byteNums)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = result.filename;
                a.click();
                URL.revokeObjectURL(url);
                if (result.truncated) {
                  toast.warning(`Excel exportado com ${result.totalRecords.toLocaleString()} registros (limite: 10.000). Aplique filtros para refinar.`);
                } else {
                  toast.success(`Excel exportado com ${result.totalRecords.toLocaleString()} registros!`);
                }
              } catch (_e) {
                toast.error("Erro ao exportar Excel");
              } finally {
                setExporting(false);
              }
            }}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {exporting ? "Exportando..." : "Exportar Excel"}
          </Button>
          <Button size="sm" onClick={() => setLocation("/defects/new")} className="h-9" style={{ background: '#00D4AA', color: '#0A1628' }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Defeito
          </Button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions && (
          <>
            <Select
              value={filters.year?.toString() || "all"}
              onValueChange={(v) => setFilters({ ...filters, year: v === "all" ? undefined : parseInt(v) })}
            >
              <SelectTrigger className="w-auto h-9 px-3 bg-card border-border rounded-full text-sm text-foreground">
                <span className="flex items-center gap-2">
                  Ano
                  <ChevronDown className="h-3 w-3" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Anos</SelectItem>
                {filterOptions.years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.month || "all"}
              onValueChange={(v) => setFilters({ ...filters, month: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-auto h-9 px-3 bg-card border-border rounded-full text-sm text-foreground">
                <span className="flex items-center gap-2">
                  Mês
                  <ChevronDown className="h-3 w-3" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Meses</SelectItem>
                {filterOptions.months.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.weekKey || "all"}
              onValueChange={(v) => setFilters({ ...filters, weekKey: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-auto h-9 px-3 bg-card border-border rounded-full text-sm text-foreground">
                <span className="flex items-center gap-2">
                  Semana
                  <ChevronDown className="h-3 w-3" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Semanas</SelectItem>
                {filterOptions.weekKeys.slice(0, 20).map((w) => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.supplier || "all"}
              onValueChange={(v) => setFilters({ ...filters, supplier: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-auto h-9 px-3 bg-card border-border rounded-full text-sm text-foreground">
                <span className="flex items-center gap-2">
                  Fornecedor
                  <ChevronDown className="h-3 w-3" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Fornecedores</SelectItem>
                {filterOptions.suppliers.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status || "all"}
              onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-auto h-9 px-3 bg-card border-border rounded-full text-sm text-foreground">
                <span className="flex items-center gap-2">
                  Status
                  <ChevronDown className="h-3 w-3" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {filterOptions.statuses.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.bucketAging || "all"}
              onValueChange={(v) => setFilters({ ...filters, bucketAging: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-auto h-9 px-3 bg-card border-border rounded-full text-sm text-foreground">
                <span className="flex items-center gap-2">
                  Bucket
                  <ChevronDown className="h-3 w-3" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Buckets</SelectItem>
                {filterOptions.bucketAgings.map((b) => (
                  <SelectItem key={b} value={b}>{b} dias</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.mg || "all"}
              onValueChange={(v) => setFilters({ ...filters, mg: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-auto h-9 px-3 bg-card border-border rounded-full text-sm text-foreground">
                <span className="flex items-center gap-2">
                  Severidade
                  <ChevronDown className="h-3 w-3" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Severidades</SelectItem>
                {(filterOptions.severities || []).map((s: string) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.model || "all"}
              onValueChange={(v) => setFilters({ ...filters, model: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-auto h-9 px-3 bg-card border-border rounded-full text-sm text-foreground">
                <span className="flex items-center gap-2">
                  Modelo
                  <ChevronDown className="h-3 w-3" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Modelos</SelectItem>
                {(filterOptions.models || []).map((m: string) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.customer || "all"}
              onValueChange={(v) => setFilters({ ...filters, customer: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-auto h-9 px-3 bg-card border-border rounded-full text-sm text-foreground">
                <span className="flex items-center gap-2">
                  Cliente
                  <ChevronDown className="h-3 w-3" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Clientes</SelectItem>
                {(filterOptions.customers || []).map((c: string) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.owner || "all"}
              onValueChange={(v) => setFilters({ ...filters, owner: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-auto h-9 px-3 bg-card border-border rounded-full text-sm text-foreground">
                <span className="flex items-center gap-2">
                  Owner
                  <ChevronDown className="h-3 w-3" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Owners</SelectItem>
                {(filterOptions.owners || []).map((o: string) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 px-3 bg-card border-border rounded-full text-sm font-normal text-foreground">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateFrom ? format(dateFrom, "dd/MM/yy", { locale: ptBR }) : "Data Inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={handleDateFromChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 px-3 bg-card border-border rounded-full text-sm font-normal text-foreground">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateTo ? format(dateTo, "dd/MM/yy", { locale: ptBR }) : "Data Final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={handleDateToChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-9 px-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por fornecedor..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="pl-10 h-10 bg-card border-border text-foreground"
        />
      </div>

      {/* Data Table */}
      <Card className="overflow-hidden border border-border bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : defects && defects.length > 0 ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doc Nº</th>
                    <th>Fornecedor</th>
                    <th>Modelo</th>
                    <th>Sintoma</th>
                    <th>Status</th>
                    <th>Severidade</th>
                    <th>Dias em Atraso</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {defects.map((defect) => (
                    <tr 
                      key={defect.id} 
                      className="cursor-pointer group"
                      onClick={() => setLocation(`/defects/${defect.id}`)}
                    >
                      <td>
                        <span className="font-semibold" style={{ color: '#00D4AA' }}>{defect.docNumber}</span>
                      </td>
                      <td>
                        <span className="font-medium">{defect.supplier || "-"}</span>
                      </td>
                      <td className="text-muted-foreground">{defect.model || "-"}</td>
                      <td className="max-w-[200px]">
                        <span className="truncate block">{defect.symptom || "-"}</span>
                      </td>
                      <td>{getStatusBadge(defect.status)}</td>
                      <td>{getSeverityBadge(defect.mg)}</td>
                      <td>
                        {defect.daysLate > 0 ? (
                          <span className="days-late-badge">{defect.daysLate} Dias</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/defects/${defect.id}`);
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mb-4 opacity-30" />
              <p className="font-medium">Nenhum defeito encontrado</p>
              <p className="text-sm mt-1">Tente ajustar os filtros ou criar um novo registro</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
