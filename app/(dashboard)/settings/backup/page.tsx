"use client"

import { useState, useRef } from "react"
import { useTenant } from "@/lib/tenant/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Download, 
  Upload, 
  Shield, 
  Database, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
  RotateCcw,
  HardDrive,
  Clock
} from "lucide-react"
import useSWR from "swr"

const BACKUP_TABLES = [
  { id: "categories", label: "Catégories", critical: true },
  { id: "finished_products", label: "Produits Finis", critical: true },
  { id: "raw_materials", label: "Matières Premières", critical: true },
  { id: "consumables", label: "Consommables", critical: true },
  { id: "clients", label: "Clients", critical: true },
  { id: "orders", label: "Commandes", critical: true },
  { id: "order_items", label: "Lignes de Commande", critical: false },
  { id: "stock_by_location", label: "Stocks par Emplacement", critical: true },
  { id: "storage_locations", label: "Emplacements", critical: false },
  { id: "recipes", label: "Recettes", critical: false },
  { id: "recipe_ingredients", label: "Ingrédients Recettes", critical: false },
  { id: "production_batches", label: "Lots de Production", critical: false },
  { id: "delivery_notes", label: "Bons de Livraison", critical: false },
]

interface DeletedRecord {
  id: string
  table_name: string
  record_id: string
  record_data: Record<string, unknown>
  deleted_at: string
  deletion_type: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function BackupPage() {
  const { tenant } = useTenant()
  const [selectedTables, setSelectedTables] = useState<string[]>(
    BACKUP_TABLES.filter((t) => t.critical).map((t) => t.id)
  )
  const [isExporting, setIsExporting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreResult, setRestoreResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [restoringRecord, setRestoringRecord] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: deletedRecords, mutate: refreshDeleted } = useSWR<{
    records: DeletedRecord[]
    count: number
  }>(tenant?.id ? `/api/backup/deleted-records?tenantId=${tenant.id}` : null, fetcher)

  const handleExport = async () => {
    if (!tenant?.id) return

    setIsExporting(true)
    try {
      const tables = selectedTables.join(",")
      const response = await fetch(
        `/api/backup/export?tenantId=${tenant.id}&tables=${tables}`
      )

      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `backup_${tenant.id.slice(0, 8)}_${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Export error:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsRestoring(true)
    setRestoreResult(null)

    try {
      const text = await file.text()
      const backup = JSON.parse(text)

      const response = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backup,
          options: { mode: "merge" },
        }),
      })

      const result = await response.json()
      setRestoreResult({
        success: result.success,
        message: result.message || result.error,
      })
    } catch (error) {
      setRestoreResult({
        success: false,
        message: "Erreur lors de la lecture du fichier de sauvegarde",
      })
    } finally {
      setIsRestoring(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRestoreRecord = async (auditId: string) => {
    setRestoringRecord(auditId)
    try {
      const response = await fetch("/api/backup/deleted-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId }),
      })

      if (response.ok) {
        refreshDeleted()
      }
    } catch (error) {
      console.error("Restore error:", error)
    } finally {
      setRestoringRecord(null)
    }
  }

  const toggleTable = (tableId: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableId)
        ? prev.filter((t) => t !== tableId)
        : [...prev, tableId]
    )
  }

  const selectAllTables = () => {
    setSelectedTables(BACKUP_TABLES.map((t) => t.id))
  }

  const selectCriticalTables = () => {
    setSelectedTables(BACKUP_TABLES.filter((t) => t.critical).map((t) => t.id))
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sauvegarde et Protection</h1>
          <p className="text-muted-foreground">
            Gérez vos sauvegardes locales et récupérez les données supprimées
          </p>
        </div>
        <Badge variant="outline" className="border-amber-500 text-amber-500">
          <Shield className="h-3 w-3 mr-1" />
          Protection Activée
        </Badge>
      </div>

      <Tabs defaultValue="export" className="space-y-4">
        <TabsList className="bg-[#1a1a1a]">
          <TabsTrigger value="export">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="h-4 w-4 mr-2" />
            Restaurer
          </TabsTrigger>
          <TabsTrigger value="deleted">
            <Trash2 className="h-4 w-4 mr-2" />
            Corbeille
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-amber-500" />
                Exporter une Sauvegarde Locale
              </CardTitle>
              <CardDescription>
                Téléchargez une copie de vos données au format JSON
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllTables}
                  className="border-[#2a2a2a]"
                >
                  Tout sélectionner
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectCriticalTables}
                  className="border-[#2a2a2a]"
                >
                  Tables critiques
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {BACKUP_TABLES.map((table) => (
                  <div
                    key={table.id}
                    className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTables.includes(table.id)
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-[#2a2a2a] hover:border-[#3a3a3a]"
                    }`}
                    onClick={() => toggleTable(table.id)}
                  >
                    <Checkbox
                      checked={selectedTables.includes(table.id)}
                      onCheckedChange={() => toggleTable(table.id)}
                    />
                    <div className="flex-1">
                      <span className="text-sm text-white">{table.label}</span>
                      {table.critical && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-xs border-red-500 text-red-500"
                        >
                          Critique
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleExport}
                disabled={isExporting || selectedTables.length === 0}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Export en cours...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger la Sauvegarde ({selectedTables.length} tables)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-green-500" />
                Restaurer depuis une Sauvegarde
              </CardTitle>
              <CardDescription>
                Importez un fichier de sauvegarde JSON pour restaurer vos données
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-amber-500">Attention</AlertTitle>
                <AlertDescription className="text-amber-200">
                  La restauration fusionnera les données existantes avec celles de la
                  sauvegarde. Les enregistrements avec le même ID seront mis à jour.
                </AlertDescription>
              </Alert>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isRestoring}
                variant="outline"
                className="w-full border-dashed border-2 border-[#3a3a3a] h-32 hover:border-amber-500"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                    Restauration en cours...
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                    <span>Cliquez pour sélectionner un fichier de sauvegarde</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Format: JSON
                    </span>
                  </div>
                )}
              </Button>

              {restoreResult && (
                <Alert
                  className={
                    restoreResult.success
                      ? "border-green-500/50 bg-green-500/10"
                      : "border-red-500/50 bg-red-500/10"
                  }
                >
                  {restoreResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <AlertTitle
                    className={restoreResult.success ? "text-green-500" : "text-red-500"}
                  >
                    {restoreResult.success ? "Succès" : "Erreur"}
                  </AlertTitle>
                  <AlertDescription
                    className={restoreResult.success ? "text-green-200" : "text-red-200"}
                  >
                    {restoreResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deleted" className="space-y-4">
          <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Enregistrements Supprimés
              </CardTitle>
              <CardDescription>
                Récupérez les données supprimées récemment (conservées 30 jours)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {deletedRecords?.records && deletedRecords.records.length > 0 ? (
                  <div className="space-y-2">
                    {deletedRecords.records.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-[#2a2a2a] hover:border-[#3a3a3a]"
                      >
                        <div className="flex items-center gap-3">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">
                                {(record.record_data as Record<string, unknown>)?.name as string || record.record_id.slice(0, 8)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {record.table_name}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(record.deleted_at).toLocaleString("fr-FR")}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreRecord(record.id)}
                          disabled={restoringRecord === record.id}
                          className="border-green-500 text-green-500 hover:bg-green-500/10"
                        >
                          {restoringRecord === record.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restaurer
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-4 text-green-500" />
                    <p>Aucun enregistrement supprimé</p>
                    <p className="text-sm">La corbeille est vide</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
