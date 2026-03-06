"use client"

import { useState, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
  FileSpreadsheet,
  Trash2,
  ClipboardPaste,
  Package,
  RotateCcw,
  Truck,
} from "lucide-react"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import {
  parseOrderCSVContent,
  importOrdersFromCSV,
  type OrderCSVImportRow,
  type OrderImportResult,
} from "@/lib/orders/import-actions"

interface BulkImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

type ImportStep = "upload" | "preview" | "importing" | "complete"

export function BulkImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: BulkImportDialogProps) {
  const { currentTenant } = useTenant()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<ImportStep>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState("")
  const [parsedRows, setParsedRows] = useState<OrderCSVImportRow[]>([])
  const [parseErrors, setParseErrors] = useState<Array<{ row: number; error: string }>>([])
  const [syncClients, setSyncClients] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<OrderImportResult | null>(null)
  const [inputMethod, setInputMethod] = useState<"file" | "paste">("paste")

  const statusLabels: Record<string, { label: string; color: string }> = {
    "Livr": { label: "Livre", color: "bg-green-100 text-green-800" },
    "Retour": { label: "Retour", color: "bg-violet-100 text-violet-800" },
    "En cours": { label: "En cours", color: "bg-blue-100 text-blue-800" },
  }

  const handleParseContent = useCallback(async (content: string) => {
    try {
      const { rows, errors } = await parseOrderCSVContent(content)
      
      setParsedRows(rows)
      setParseErrors(errors)
      setStep("preview")
      
      if (rows.length === 0) {
        toast.error("Aucune donnee valide trouvee")
      } else if (errors.length > 0) {
        toast.warning(`${rows.length} lignes valides, ${errors.length} erreurs detectees`)
      } else {
        toast.success(`${rows.length} lignes pretes a importer`)
      }
    } catch {
      toast.error("Erreur lors de la lecture des donnees")
    }
  }, [])

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    const content = await selectedFile.text()
    await handleParseContent(content)
  }, [handleParseContent])

  const handlePasteImport = useCallback(async () => {
    if (!pastedText.trim()) {
      toast.error("Veuillez coller les donnees")
      return
    }
    await handleParseContent(pastedText)
  }, [pastedText, handleParseContent])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith(".csv") || droppedFile.type === "text/csv" || droppedFile.name.endsWith(".txt"))) {
      handleFileSelect(droppedFile)
    } else {
      toast.error("Veuillez selectionner un fichier CSV ou TXT")
    }
  }, [handleFileSelect])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleImport = async () => {
    if (parsedRows.length === 0) return
    
    setIsImporting(true)
    setStep("importing")
    setImportProgress(0)

    const progressInterval = setInterval(() => {
      setImportProgress((prev) => Math.min(prev + 10, 90))
    }, 200)

    try {
      const result = await importOrdersFromCSV(currentTenant.id, parsedRows, syncClients)
      setImportResult(result)
      setImportProgress(100)
      setStep("complete")

      if (result.failed === 0) {
        toast.success("Import termine avec succes", {
          description: `${result.imported} crees, ${result.updated} mis a jour`,
        })
      } else {
        toast.warning("Import termine avec des erreurs", {
          description: `${result.imported + result.updated} reussis, ${result.failed} echecs`,
        })
      }

      onImportComplete()
    } catch {
      toast.error("Erreur lors de l'import")
      setStep("preview")
    } finally {
      clearInterval(progressInterval)
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setStep("upload")
    setFile(null)
    setPastedText("")
    setParsedRows([])
    setParseErrors([])
    setImportResult(null)
    setImportProgress(0)
    onOpenChange(false)
  }

  const downloadTemplate = () => {
    const template = `Code,Client,Etat,Prix,Frais,Date,Echange,Tel
104838923096,RIHAB,Retour,27.9,4,2026-02-02,,93020253
106673609708,ISRA,Livr,32,9,2026-02-16,,92245648
106807067568,Ghada,Livr,37,4,2026-02-18,,27241917`

    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "template_import_commandes.csv"
    link.click()
    
    toast.success("Modele telecharge")
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import en Masse des Commandes
          </DialogTitle>
          <DialogDescription>
            Importez vos commandes en collant le texte directement ou en chargeant un fichier CSV
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as "file" | "paste")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste" className="flex items-center gap-2">
                  <ClipboardPaste className="h-4 w-4" />
                  Coller le texte
                </TabsTrigger>
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Fichier CSV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paste-data">
                    Collez vos donnees ici (format CSV avec en-tetes)
                  </Label>
                  <Textarea
                    id="paste-data"
                    placeholder={`Code,Client,Etat,Prix,Frais,Date,Echange,Tel
104838923096,RIHAB,Retour,27.9,4,2026-02-02,,93020253
106673609708,ISRA,Livr,32,9,2026-02-16,,92245648`}
                    className="min-h-[200px] font-mono text-sm"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                  />
                </div>
                <Button onClick={handlePasteImport} className="w-full" disabled={!pastedText.trim()}>
                  <ClipboardPaste className="mr-2 h-4 w-4" />
                  Analyser les donnees
                </Button>
              </TabsContent>

              <TabsContent value="file" className="space-y-4">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm font-medium">
                    Glissez-deposez votre fichier CSV ici
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ou cliquez pour selectionner
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Telecharger le modele CSV
              </Button>
              
              <div className="text-xs text-muted-foreground">
                Formats acceptes: .csv, .txt (separateur: , ou ;)
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Format attendu:</strong> Code, Client, Etat, Prix, Frais, Date, Echange, Tel
                <br />
                <strong>Statuts reconnus:</strong> Livr, Livree, Retour, En cours
                <br />
                <span className="text-muted-foreground">Les colonnes Code et Tel sont utilisees pour identifier et mettre a jour les commandes existantes.</span>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            {(file || pastedText) && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">
                      {file ? file.name : "Donnees collees"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {parsedRows.length} lignes valides
                      {parseErrors.length > 0 && `, ${parseErrors.length} erreurs`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setPastedText("")
                    setParsedRows([])
                    setParseErrors([])
                    setStep("upload")
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Stats Preview */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <Truck className="h-5 w-5 mx-auto text-green-600 mb-1" />
                <p className="text-lg font-bold text-green-700">
                  {parsedRows.filter((r) => r.status === "livre").length}
                </p>
                <p className="text-xs text-green-600">Livres</p>
              </div>
              <div className="p-3 bg-violet-50 rounded-lg text-center">
                <RotateCcw className="h-5 w-5 mx-auto text-violet-600 mb-1" />
                <p className="text-lg font-bold text-violet-700">
                  {parsedRows.filter((r) => r.status === "retour").length}
                </p>
                <p className="text-xs text-violet-600">Retours</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <Package className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                <p className="text-lg font-bold text-blue-700">
                  {parsedRows.filter((r) => r.status !== "livre" && r.status !== "retour").length}
                </p>
                <p className="text-xs text-blue-600">Autres</p>
              </div>
            </div>

            {/* Sync Option */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="sync-clients" className="text-sm font-medium">
                    Synchroniser avec les clients
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Met a jour les compteurs livres/retours des clients automatiquement
                  </p>
                </div>
              </div>
              <Switch
                id="sync-clients"
                checked={syncClients}
                onCheckedChange={setSyncClients}
              />
            </div>

            {/* Data Preview */}
            <div>
              <p className="text-sm font-medium mb-2">Apercu des donnees</p>
              <ScrollArea className="h-[200px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Code</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Telephone</TableHead>
                      <TableHead className="w-[80px]">Prix</TableHead>
                      <TableHead className="w-[60px]">Frais</TableHead>
                      <TableHead className="w-[100px]">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 15).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">
                          {row.code || "-"}
                        </TableCell>
                        <TableCell className="text-sm">{row.customerName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.customerPhone || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {row.price ? `${row.price.toFixed(2)} DT` : "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.fees ? `${row.fees} DT` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            row.status === "livre" 
                              ? "bg-green-100 text-green-800" 
                              : row.status === "retour"
                                ? "bg-violet-100 text-violet-800"
                                : "bg-blue-100 text-blue-800"
                          }>
                            {row.status === "livre" ? "Livre" : row.status === "retour" ? "Retour" : "En cours"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {parsedRows.length > 15 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground">
                          ... et {parsedRows.length - 15} autres lignes
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Parse Errors */}
            {parseErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">{parseErrors.length} erreur(s) detectee(s):</p>
                  <ScrollArea className="h-[60px]">
                    <ul className="text-xs space-y-1">
                      {parseErrors.slice(0, 5).map((err, i) => (
                        <li key={i}>Ligne {err.row}: {err.error}</li>
                      ))}
                      {parseErrors.length > 5 && (
                        <li>... et {parseErrors.length - 5} autres erreurs</li>
                      )}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="py-8 space-y-4">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
              <p className="font-medium">Import en cours...</p>
              <p className="text-sm text-muted-foreground">
                Traitement de {parsedRows.length} lignes
              </p>
            </div>
            <Progress value={importProgress} />
            <p className="text-center text-xs text-muted-foreground">
              {importProgress}% complete
            </p>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && importResult && (
          <div className="space-y-4">
            <div className="text-center py-4">
              {importResult.failed === 0 ? (
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
              ) : (
                <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-2" />
              )}
              <p className="font-medium">
                {importResult.failed === 0 ? "Import termine avec succes!" : "Import termine avec des erreurs"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-700">{importResult.imported}</p>
                <p className="text-xs text-blue-600">Nouveaux crees</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700">{importResult.updated}</p>
                <p className="text-xs text-green-600">Mis a jour</p>
              </div>
              <div className="p-3 bg-violet-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-violet-700">{importResult.deliveredSynced}</p>
                <p className="text-xs text-violet-600">Clients livres syncs</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-orange-700">{importResult.returnedSynced}</p>
                <p className="text-xs text-orange-600">Clients retours syncs</p>
              </div>
            </div>

            {importResult.failed > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">{importResult.failed} ligne(s) en echec:</p>
                  <ScrollArea className="h-[60px]">
                    <ul className="text-xs space-y-1">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>Ligne {err.row}: {err.error}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Annuler
            </Button>
          )}
          
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Retour
              </Button>
              <Button onClick={handleImport} disabled={parsedRows.length === 0}>
                <Upload className="mr-2 h-4 w-4" />
                Importer {parsedRows.length} ligne(s)
              </Button>
            </>
          )}
          
          {step === "complete" && (
            <Button onClick={handleClose}>
              Fermer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
