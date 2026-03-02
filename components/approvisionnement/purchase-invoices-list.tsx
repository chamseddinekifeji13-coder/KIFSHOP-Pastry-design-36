"use client"

import React, { useState } from "react"
import { FileText, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Clock, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { validatePurchaseInvoice, rejectPurchaseInvoice, type PurchaseInvoice } from "@/lib/approvisionnement/actions"
import { useTenant } from "@/lib/tenant-context"

const invoiceStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  "en-attente": { label: "En attente", variant: "outline", className: "border-amber-300 text-amber-700 bg-amber-50" },
  validee: { label: "Validee", variant: "default", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0" },
  rejetee: { label: "Rejetee", variant: "destructive" },
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-TN", { day: "2-digit", month: "2-digit", year: "numeric" })
}

interface PurchaseInvoicesListProps {
  invoices: PurchaseInvoice[]
  canValidate?: boolean
  onRefresh?: () => void
}

export function PurchaseInvoicesList({ invoices, canValidate = false, onRefresh }: PurchaseInvoicesListProps) {
  const { currentRole } = useTenant()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  // Seuls le magasinier, le gerant et le proprietaire peuvent valider/rejeter les factures
  // Le role "achat" saisit les factures mais NE les valide PAS
  const canValidateByRole = currentRole === "magasinier" || currentRole === "gerant" || currentRole === "owner"
  const showValidationButtons = canValidate && canValidateByRole

  async function handleValidate(invoiceId: string) {
    setValidatingId(invoiceId)
    try {
      const success = await validatePurchaseInvoice(invoiceId)
      if (success) {
        toast.success("Facture validee", { description: "Les stocks et prix ont ete mis a jour" })
        onRefresh?.()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur"
      toast.error("Erreur de validation", { description: msg })
    } finally {
      setValidatingId(null)
    }
  }

  async function handleReject() {
    if (!rejectTarget) return
    setValidatingId(rejectTarget)
    try {
      const success = await rejectPurchaseInvoice(rejectTarget, rejectReason.trim() || undefined)
      if (success) {
        toast.success("Facture rejetee")
        onRefresh?.()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur"
      toast.error("Erreur", { description: msg })
    } finally {
      setValidatingId(null)
      setRejectDialogOpen(false)
      setRejectTarget(null)
      setRejectReason("")
    }
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">Aucune facture d{"'"}achat</p>
          <p className="text-xs text-muted-foreground mt-1">Les factures saisies par le service appro apparaitront ici</p>
        </CardContent>
      </Card>
    )
  }

  const pendingCount = invoices.filter((i) => i.status === "en-attente").length

  return (
    <>
      {showValidationButtons && pendingCount > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-800 font-medium">
            {pendingCount} facture{pendingCount > 1 ? "s" : ""} en attente de validation
          </span>
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>N Facture</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total HT</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
                <TableHead>Statut</TableHead>
                {showValidationButtons && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const config = invoiceStatusConfig[invoice.status] || { label: invoice.status, variant: "outline" as const }
                const isExpanded = expandedId === invoice.id
                const isProcessing = validatingId === invoice.id
                return (
                  <React.Fragment key={invoice.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : invoice.id)}
                    >
                      <TableCell>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-medium font-mono">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.supplierName}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(invoice.invoiceDate)}</TableCell>
                      <TableCell className="text-right font-mono">{invoice.totalHt.toFixed(3)} TND</TableCell>
                      <TableCell className="text-right font-mono font-medium">{invoice.totalTtc.toFixed(3)} TND</TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className={config.className}>
                          {invoice.status === "en-attente" && <Clock className="mr-1 h-3 w-3" />}
                          {invoice.status === "validee" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {config.label}
                        </Badge>
                      </TableCell>
                      {showValidationButtons && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {invoice.status === "en-attente" && (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleValidate(invoice.id)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                                Valider
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                                onClick={() => { setRejectTarget(invoice.id); setRejectDialogOpen(true) }}
                                disabled={isProcessing}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Rejeter
                              </Button>
                            </div>
                          )}
                          {invoice.status === "validee" && (
                            <span className="text-xs text-emerald-600">
                              {invoice.validatedAt ? formatDate(invoice.validatedAt) : "Valide"}
                            </span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={showValidationButtons ? 8 : 7} className="bg-muted/30 p-4">
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold">Detail des articles</h4>
                            <div className="rounded-lg border bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Type</TableHead>
                                    <TableHead className="text-xs">Article</TableHead>
                                    <TableHead className="text-xs text-right">Quantite</TableHead>
                                    <TableHead className="text-xs text-right">P.U.</TableHead>
                                    <TableHead className="text-xs text-right">TVA</TableHead>
                                    <TableHead className="text-xs text-right">Total HT</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {invoice.items.map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell className="text-xs">
                                        <Badge variant="outline" className="text-[10px]">
                                          {item.itemType === "raw_material" ? "MP" : item.itemType === "packaging" ? "Emb." : "Cons."}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-xs font-medium">{item.name}</TableCell>
                                      <TableCell className="text-xs text-right font-mono">{item.quantity} {item.unit}</TableCell>
                                      <TableCell className="text-xs text-right font-mono">{item.unitPrice.toFixed(3)}</TableCell>
                                      <TableCell className="text-xs text-right">{item.tvaRate}%</TableCell>
                                      <TableCell className="text-xs text-right font-mono">{item.totalHt.toFixed(3)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                            {invoice.notes && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium">Notes: </span>{invoice.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeter la facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. La facture sera marquee comme rejetee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Motif du rejet (optionnel)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmer le rejet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
