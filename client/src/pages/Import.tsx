import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react";

// Column mapping from Excel to database fields
const COLUMN_MAPPING: Record<string, string> = {
  "Doc Number": "docNumber",
  "Open Date": "openDate",
  "MG": "mg",
  "Defects Severity": "defectsSeverity",
  "Category": "category",
  "Model": "model",
  "Customer": "customer",
  "PN": "pn",
  "Material": "material",
  "Symptom": "symptom",
  "Detection": "detection",
  "Rate": "rate",
  "Qty": "qty",
  "Description": "description",
  "Evidence": "evidence",
  "Cause": "cause",
  "Corrective Actions": "correctiveActions",
  "Tracking Progress": "trackingProgress",
  "Supplier": "supplier",
  "Supply Feedback": "supplyFeedback",
  "Status Supply FB": "statusSupplyFB",
  "Owner": "owner",
  "Target Date": "targetDate",
  "Check Solution": "checkSolution",
  "QCR Number": "qcrNumber",
  "Occurrence": "occurrence",
  "Date Disposition": "dateDisposition",
  "Date Tech Analysis": "dateTechAnalysis",
  "Date Root Cause": "dateRootCause",
  "Date Corrective Action": "dateCorrectiveAction",
  "Date Validation": "dateValidation",
  "Status": "status",
};

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, any>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    row: number;
    status: "OK" | "ERROR";
    message?: string;
  }[]>([]);

  const { data: importLogs } = trpc.import.logs.useQuery();
  const importMutation = trpc.import.importData.useMutation();

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResults([]);

    // Parse Excel file
    try {
      const XLSX = await import("xlsx");
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      
      // Find the NEW_FORM sheet or use first sheet
      const sheetName = workbook.SheetNames.find((name: string) => 
        name.toLowerCase().includes("new_form") || name.toLowerCase().includes("form")
      ) || workbook.SheetNames[0];
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      // Map columns to database fields
      const mappedData = (jsonData as Record<string, any>[]).map((row: Record<string, any>) => {
        const mappedRow: Record<string, any> = {};
        for (const [excelCol, dbField] of Object.entries(COLUMN_MAPPING)) {
          // Try exact match first, then case-insensitive
          let value = row[excelCol];
          if (value === undefined) {
            const key = Object.keys(row).find(k => k.toLowerCase() === excelCol.toLowerCase());
            if (key) value = row[key];
          }
          if (value !== undefined && value !== "") {
            // Handle date fields
            if (dbField.includes("Date") || dbField === "openDate" || dbField === "targetDate" || dbField === "occurrence") {
              if (typeof value === "number") {
                // Excel serial date
                const date = new Date((value - 25569) * 86400 * 1000);
                mappedRow[dbField] = date.toISOString().split("T")[0];
              } else if (typeof value === "string" && value) {
                mappedRow[dbField] = value;
              }
            } else {
              mappedRow[dbField] = value;
            }
          }
        }
        return mappedRow;
      }).filter(row => row.docNumber); // Only include rows with docNumber

      setParsedData(mappedData);
      toast.success(`${mappedData.length} registros encontrados na planilha`);
    } catch (error: any) {
      toast.error(`Erro ao ler arquivo: ${error.message}`);
    }
  }, []);

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error("Nenhum dado para importar");
      return;
    }

    setImporting(true);
    setImportResults([]);

    try {
      const result = await importMutation.mutateAsync({ data: parsedData });
      setImportResults(result.results);
      
      if (result.errorCount === 0) {
        toast.success(`${result.successCount} registros importados com sucesso!`);
      } else {
        toast.warning(`${result.successCount} importados, ${result.errorCount} erros`);
      }
    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const successCount = importResults.filter(r => r.status === "OK").length;
  const errorCount = importResults.filter(r => r.status === "ERROR").length;
  const progress = importResults.length > 0 ? (importResults.length / parsedData.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importação de Dados</h1>
        <p className="text-muted-foreground">
          Importe defeitos a partir de planilhas Excel (.xlsx)
        </p>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Arquivo
          </CardTitle>
          <CardDescription>
            Selecione uma planilha Excel com a aba NEW_FORM contendo os dados de defeitos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {file ? file.name : "Clique para selecionar arquivo"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Formatos suportados: .xlsx, .xls
              </p>
            </label>
          </div>

          {parsedData.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{parsedData.length} registros encontrados</p>
                  <p className="text-sm text-muted-foreground">
                    Pronto para importar
                  </p>
                </div>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? "Importando..." : "Iniciar Importação"}
                </Button>
              </div>
            </div>
          )}

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Processando... {importResults.length} de {parsedData.length}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Card */}
      {importResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado da Importação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">{successCount} sucesso</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium">{errorCount} erros</span>
              </div>
            </div>

            {errorCount > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <p className="text-sm font-medium text-red-600">Erros encontrados:</p>
                {importResults
                  .filter(r => r.status === "ERROR")
                  .map((result, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm bg-red-50 p-2 rounded">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                      <div>
                        <span className="font-medium">Linha {result.row}:</span>{" "}
                        {result.message}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Column Mapping Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Mapeamento de Colunas</CardTitle>
          <CardDescription>
            Certifique-se de que sua planilha possui as seguintes colunas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
            {Object.entries(COLUMN_MAPPING).map(([excel, db]) => (
              <div key={db} className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{excel}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import History */}
      {importLogs && importLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Importações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Arquivo</th>
                    <th>Total</th>
                    <th>Sucesso</th>
                    <th>Erros</th>
                    <th>Importado por</th>
                  </tr>
                </thead>
                <tbody>
                  {importLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString("pt-BR")}</td>
                      <td>{log.fileName}</td>
                      <td>{log.totalRows}</td>
                      <td className="text-green-600">{log.successRows}</td>
                      <td className={log.errorRows > 0 ? "text-red-600" : ""}>{log.errorRows}</td>
                      <td>{log.importedByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
