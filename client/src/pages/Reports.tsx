import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileSpreadsheet, FileText, Filter } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const [reportType, setReportType] = useState<string>("all");
  const [filters, setFilters] = useState({
    year: undefined as number | undefined,
    status: undefined as string | undefined,
    supplier: undefined as string | undefined,
  });

  const { data: defectsResult, isLoading } = trpc.defect.list.useQuery(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== undefined))
  );
  const defects = defectsResult?.data;
  const { data: filterOptions } = trpc.defect.filterOptions.useQuery();
  const { data: stats } = trpc.defect.stats.useQuery();

  const exportToCSV = () => {
    if (!defects || defects.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const headers = [
      "Doc Number", "Open Date", "MG", "Status", "Step", "Supplier", "Model", 
      "Symptom", "Description", "Owner", "Target Date", "Aging Total", 
      "Aging By Step", "Bucket Aging", "Days Late", "Current Responsible"
    ];

    const rows = defects.map(d => [
      d.docNumber,
      d.openDate,
      d.mg || "",
      d.status || "",
      d.step,
      d.supplier || "",
      d.model || "",
      d.symptom || "",
      (d.description || "").replace(/"/g, '""'),
      d.owner || "",
      d.targetDate || "",
      d.agingTotal,
      d.agingByStep,
      d.bucketAging,
      d.daysLate,
      d.currentResponsible
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `qms-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    
    toast.success("Relatório exportado com sucesso!");
  };

  const exportToExcel = async () => {
    if (!defects || defects.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      
      const data = defects.map(d => ({
        "Doc Number": d.docNumber,
        "Open Date": d.openDate,
        "MG": d.mg || "",
        "Status": d.status || "",
        "Step": d.step,
        "Supplier": d.supplier || "",
        "Model": d.model || "",
        "Customer": d.customer || "",
        "PN": d.pn || "",
        "Material": d.material || "",
        "Symptom": d.symptom || "",
        "Description": d.description || "",
        "Owner": d.owner || "",
        "Target Date": d.targetDate || "",
        "Aging Total": d.agingTotal,
        "Aging By Step": d.agingByStep,
        "Bucket Aging": d.bucketAging,
        "Days Late": d.daysLate,
        "Current Responsible": d.currentResponsible,
        "Date Disposition": d.dateDisposition || "",
        "Date Tech Analysis": d.dateTechAnalysis || "",
        "Date Root Cause": d.dateRootCause || "",
        "Date Corrective Action": d.dateCorrectiveAction || "",
        "Date Validation": d.dateValidation || "",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Defects");
      XLSX.writeFile(wb, `qms-report-${new Date().toISOString().split("T")[0]}.xlsx`);
      
      toast.success("Relatório Excel exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar Excel");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">
          Gere e exporte relatórios do sistema de qualidade
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <SelectItem value="all">Todos os anos</SelectItem>
                  {filterOptions?.years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
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
                  <SelectItem value="all">Todos os status</SelectItem>
                  {filterOptions?.statuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
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
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {filterOptions?.suppliers.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={exportToCSV} variant="outline" className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button onClick={exportToExcel} className="flex-1">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{defects?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Registros Filtrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {defects?.filter(d => d.status === "CLOSED").length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Fechados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {defects?.filter(d => d.status === "ONGOING").length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Em Andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {defects?.filter(d => d.status === "DELAYED" || d.daysLate > 0).length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Atrasados</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Prévia dos Dados</CardTitle>
          <CardDescription>
            Mostrando os primeiros 20 registros do relatório
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : defects && defects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doc Number</th>
                    <th>Status</th>
                    <th>Fornecedor</th>
                    <th>Sintoma</th>
                    <th>Aging</th>
                    <th>Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {defects.slice(0, 20).map(defect => (
                    <tr key={defect.id}>
                      <td className="font-medium">{defect.docNumber}</td>
                      <td>
                        <Badge className={
                          defect.status === "CLOSED" ? "status-closed" :
                          defect.status === "DELAYED" ? "status-delayed" :
                          "status-ongoing"
                        }>
                          {defect.status}
                        </Badge>
                      </td>
                      <td>{defect.supplier || "-"}</td>
                      <td className="max-w-[200px] truncate">{defect.symptom || "-"}</td>
                      <td>{defect.agingTotal}d</td>
                      <td>
                        <Badge variant="outline">{defect.currentResponsible}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {defects.length > 20 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  ... e mais {defects.length - 20} registros
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado encontrado com os filtros selecionados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={exportToCSV}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Relatório Geral
            </CardTitle>
            <CardDescription>
              Exporta todos os defeitos com informações completas em formato CSV
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={exportToExcel}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5" />
              Relatório Excel
            </CardTitle>
            <CardDescription>
              Exporta dados formatados em planilha Excel para análise avançada
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5" />
              Relatório Semanal
            </CardTitle>
            <CardDescription>
              Resumo semanal com métricas e tendências (em breve)
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
