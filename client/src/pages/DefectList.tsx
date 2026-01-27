import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useLocation } from "wouter";
import { Search, Filter, Plus, RefreshCw, X, ChevronDown, MoreHorizontal, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function getStatusBadge(status: string | null) {
  switch (status) {
    case "CLOSED": 
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">CLOSED</Badge>;
    case "ONGOING": 
      return <Badge className="bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100">ONGOING</Badge>;
    case "DELAYED": 
      return <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100">DELAYED</Badge>;
    default: 
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">{status || "-"}</Badge>;
  }
}

function getSeverityBadge(mg: string | null) {
  switch (mg) {
    case "S": 
      return <Badge className="bg-rose-500 text-white hover:bg-rose-500 font-bold">S</Badge>;
    case "A": 
      return <Badge className="bg-amber-500 text-white hover:bg-amber-500 font-bold">A</Badge>;
    case "B": 
      return <Badge className="bg-sky-500 text-white hover:bg-sky-500 font-bold">B</Badge>;
    case "C": 
      return <Badge className="bg-slate-400 text-white hover:bg-slate-400 font-bold">C</Badge>;
    default: 
      return null;
  }
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
    dateFrom: undefined as string | undefined,
    dateTo: undefined as string | undefined,
  });
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(true);

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
      dateFrom: undefined,
      dateTo: undefined,
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
          <h1 className="text-2xl font-bold tracking-tight">Lista de Defeitos</h1>
          <p className="text-muted-foreground mt-1">
            {defects?.length || 0} registros encontrados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setLocation("/defects/new")} className="h-9">
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
              <SelectTrigger className="w-auto h-9 px-3 bg-white border rounded-full text-sm">
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
              <SelectTrigger className="w-auto h-9 px-3 bg-white border rounded-full text-sm">
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
              <SelectTrigger className="w-auto h-9 px-3 bg-white border rounded-full text-sm">
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
              <SelectTrigger className="w-auto h-9 px-3 bg-white border rounded-full text-sm">
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
              <SelectTrigger className="w-auto h-9 px-3 bg-white border rounded-full text-sm">
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
              <SelectTrigger className="w-auto h-9 px-3 bg-white border rounded-full text-sm">
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

            {/* Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 px-3 bg-white border rounded-full text-sm font-normal">
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
                <Button variant="outline" className="h-9 px-3 bg-white border rounded-full text-sm font-normal">
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
          className="pl-10 h-10 bg-white"
        />
      </div>

      {/* Data Table */}
      <Card className="overflow-hidden border-0 shadow-sm">
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
                        <span className="font-semibold text-primary">{defect.docNumber}</span>
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
