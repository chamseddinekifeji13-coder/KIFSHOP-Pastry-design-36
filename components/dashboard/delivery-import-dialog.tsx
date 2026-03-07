"use client"

import { useState, useRef, useCallback, useEffect } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  Users,
  Package,
  RotateCcw,
  ClipboardPaste,
  FileUp,
} from "lucide-react"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import {
  parseCSVContent,
  importDeliveryReport,
  type CSVImportRow,
  type ImportResult,
} from "@/lib/delivery/actions"

interface DeliveryImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

type ImportStep = "upload" | "preview" | "importing" | "complete"

export function DeliveryImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: DeliveryImportDialogProps) {
  const { currentTenant } = useTenant()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<ImportStep>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState("")
  const [inputMethod, setInputMethod] = useState<"paste" | "file">("paste")
  const [parsedRows, setParsedRows] = useState<CSVImportRow[]>([])
  const [parseErrors, setParseErrors] = useState<Array<{ row: number; error: string }>>([])
  const [syncClients, setSyncClients] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isParsing, setIsParsing] = useState(false)

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "En attente", color: "bg-gray-100 text-gray-800" },
    sent: { label: "Envoyee", color: "bg-blue-100 text-blue-800" },
    in_transit: { label: "En transit", color: "bg-yellow-100 text-yellow-800" },
    delivered: { label: "Livre", color: "bg-green-100 text-green-800" },
    failed: { label: "Echec", color: "bg-red-100 text-red-800" },
    returned: { label: "Retour", color: "bg-violet-100 text-violet-800" },
  }

  const handleParsePastedText = useCallback(async () => {
    if (!pastedText.trim()) {
      toast.error("Veuillez coller du texte d'abord")
      return
    }
    
    setIsParsing(true)
    try {
      const { rows, errors } = await parseCSVContent(pastedText)
      
      setParsedRows(rows)
      setParseErrors(errors)
      setStep("preview")
      
      if (rows.length === 0) {
        toast.error("Aucune donnee valide trouvee dans le texte")
      } else if (errors.length > 0) {
        toast.warning(`${rows.length} lignes valides, ${errors.length} erreurs detectees`)
      } else {
        toast.success(`${rows.length} lignes pretes a importer`)
      }
    } catch {
      toast.error("Erreur lors de l'analyse du texte")
    } finally {
      setIsParsing(false)
    }
  }, [pastedText])

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    
    try {
      const content = await selectedFile.text()
      const { rows, errors } = await parseCSVContent(content)
      
      setParsedRows(rows)
      setParseErrors(errors)
      setStep("preview")
      
      if (rows.length === 0) {
        toast.error("Aucune donnee valide trouvee dans le fichier")
      } else if (errors.length > 0) {
        toast.warning(`${rows.length} lignes valides, ${errors.length} erreurs detectees`)
      } else {
        toast.success(`${rows.length} lignes pretes a importer`)
      }
    } catch {
      toast.error("Erreur lors de la lecture du fichier")
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith(".csv") || droppedFile.type === "text/csv")) {
      handleFileSelect(droppedFile)
    } else {
      toast.error("Veuillez selectionner un fichier CSV")
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

    // Simulate progress
    const progressInterval = setInterval(() => {
      setImportProgress((prev) => Math.min(prev + 10, 90))
    }, 200)

    try {
      const result = await importDeliveryReport(currentTenant.id, parsedRows, syncClients)
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
    // Template matching Best Delivery format exactly
    const template = `Code;Nom;Prix;Date d'ajout;Date d'enlèvement;Date livraison;Etat
104807639707;mariem 23232024 *;53.8;2026-02-02;0000-00-00 00:00:00;2026-02-03 16:35:10;Livrée
104807907553;azza 22919861 nahj hbib thamer;53.8;2026-02-02;0000-00-00 00:00:00;2026-02-03 19:37:43;Livrée
104812017823;HANIN TLILI 54434722 CENTER;30.900;2026-02-02;0000-00-00 00:00:00;2026-02-07 10:10:38;Retour Expéditeur`

    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "template_import_best_delivery.csv"
    link.click()
    
    toast.success("Modele telecharge")
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Rapport Best Delivery
          </DialogTitle>
          <DialogDescription>
            Importez un fichier CSV pour mettre a jour les statuts de livraison en masse
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as "paste" | "file")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste" className="flex items-center gap-2">
                  <ClipboardPaste className="h-4 w-4" />
                  Coller le texte
                </TabsTrigger>
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <FileUp className="h-4 w-4" />
                  Fichier CSV
                </TabsTrigger>
              </TabsList>

              {/* Paste Tab */}
              <TabsContent value="paste" className="mt-4 space-y-4">
                <div>
                  <Textarea
                    placeholder="Collez vos donnees CSV ici...

Exemple:
Code;Nom;Prix;Date d'ajout;Date d'enlèvement;Date livraison;Etat
104807639707;mariem 23232024 *;53.8;2026-02-02;0000-00-00;2026-02-03;Livrée"
                    className="min-h-[120px] max-h-[40vh] font-mono text-xs"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {pastedText.split("\n").filter(l => l.trim()).length} lignes detectees
                  </p>
                </div>
                <Button 
                  onClick={handleParsePastedText} 
                  disabled={!pastedText.trim() || isParsing}
                  className="w-full"
                >
                  {isParsing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Analyser les donnees
                </Button>
              </TabsContent>

              {/* File Tab */}
              <TabsContent value="file" className="mt-4 space-y-4">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
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

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Ajoutes</p>
                      <p className="text-2xl font-bold">{importResult.imported}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Mise a jour</p>
                      <p className="text-2xl font-bold">{importResult.updated}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Ignores (doublons)</p>
                      <p className="text-2xl font-bold">{importResult.skipped}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Erreurs</p>
                      <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Format Best Delivery:</strong> Code, Nom, Prix, Date d{"'"}ajout, Date d{"'"}enlevement, Date livraison, Etat
                <br />
                <strong>Statuts reconnus:</strong> Livree, Retour Expediteur, En cours, Ramasse, Annule, En attente
                <br />
                <span className="text-muted-foreground">Le telephone sera extrait automatiquement du champ Nom.</span>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            {/* Source indicator - file or pasted text */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                {file ? (
                  <FileText className="h-8 w-8 text-blue-500" />
                ) : (
                  <ClipboardPaste className="h-8 w-8 text-green-500" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {file ? file.name : "Texte colle"}
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

            {/* Stats Preview */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <Package className="h-5 w-5 mx-auto text-green-600 mb-1" />
                <p className="text-lg font-bold text-green-700">
                  {parsedRows.filter((r) => r.status === "delivered").length}
                </p>
                <p className="text-xs text-green-600">Livres</p>
              </div>
              <div className="p-3 bg-violet-50 rounded-lg text-center">
                <RotateCcw className="h-5 w-5 mx-auto text-violet-600 mb-1" />
                <p className="text-lg font-bold text-violet-700">
                  {parsedRows.filter((r) => r.status === "returned").length}
                </p>
                <p className="text-xs text-violet-600">Retours</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <XCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
                <p className="text-lg font-bold text-red-700">
                  {parsedRows.filter((r) => r.status === "failed").length}
                </p>
                <p className="text-xs text-red-600">Echecs</p>
              </div>
            </div>

            {/* Sync Option */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
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
                      <TableHead className="w-[100px]">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">
                          {row.trackingNumber || row.orderNumber || "-"}
                        </TableCell>
                        <TableCell className="text-sm">{row.customerName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.customerPhone || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {row.price ? `${row.price.toFixed(2)} DT` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusLabels[row.status]?.color || ""}>
                            {statusLabels[row.status]?.label || row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {parsedRows.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs text-muted-foreground">
                          ... et {parsedRows.length - 10} autres lignes
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
        </div>
        
        <DialogFooter className="flex-shrink-0">
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
