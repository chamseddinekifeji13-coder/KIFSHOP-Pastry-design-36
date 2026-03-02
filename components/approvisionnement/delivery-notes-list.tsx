"use client"

import React, { useState } from "react"
import { Truck, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Clock, AlertTriangle, AlertCircle } from "lucide-react"
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
import { validateDeliveryNote, rejectDeliveryNote, type DeliveryNote } from "@/lib/approvisionnement/actions"
import { useTenant } from "@/lib/tenant-context"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  "en-attente": { label: "En attente", variant: "outline", className: "border-amber-300 text-amber-700 bg-amber-50" },
  validee: { label: "Valide", variant: "default", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0" },
  rejetee: { label: "Rejete", variant: "destructive" },
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-TN", { day: "2-digit", month: "2-digit", year: "numeric" })
}

interface DeliveryNotesListProps {
  deliveryNotes: DeliveryNote[]
  canValidate?: boolean
  onRefresh?: () => void
}

export function DeliveryNotesList({ deliveryNotes, canValidate = false, onRefresh }: DeliveryNotesListProps) {
  const { currentRole } = useTenant()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const showValidationButtons = canValidate || currentRole === "magasinier" || currentRole === "gerant" || currentRole === "owner" || currentRole === "achat"

  async function handleValidate(noteId: string) {
    setProcessingId(noteId)
    try {
      const success = await validateDeliveryNote(noteId)
      if (success) {
        toast.success("Bon de livraison valide", { description: "Les stocks ont ete mis a jour" })
        onRefresh?.()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur"
      toast.error("Erreur de validation", { description: msg })
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject() {
    if (!rejectTarget) return
    setProcessingId(rejectTarget)
    try {
      const success = await rejectDeliveryNote(rejectTarget, rejectReason.trim() || undefined)
      if (success) {
        toast.success("Bon de livraison rejete")
        onRefresh?.()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur"
      toast.error("Erreur", { description: msg })
    } finally {
      setProcessingId(null)
      setRejectDialogOpen(false)
      setRejectTarget(null)
      setRejectReason("")
    }
  }

  if (deliveryNotes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Truck className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">Aucun bon de livraison</p>
          <p className="text-xs text-muted-foreground mt-1">Les bons de livraison saisis apparaitront ici</p>
        </CardContent>
      </Card>
    )
  }

  const pendingCount = deliveryNotes.filter((n) => n.status === "en-attente").length

  return (
    <>
      {showValidationButtons && pendingCount > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-800 font-medium">
            {pendingCount} bon{pendingCount > 1 ? "s" : ""} de livraison en attente de validation
          </span>
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>N BL</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Articles</TableHead>
                <TableHead>Statut</TableHead>
                {showValidationButtons && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveryNotes.map((note) => {
                const config = statusConfig[note.status] || { label: note.status, variant: "outline" as const }
                const isExpanded = expandedId === note.id
                const isProcessing = processingId === note.id
                const nonConformItems = note.items.filter((i) => !i.isConform)
                const hasDiscrepancy = note.items.some((i) => i.quantityReceived !== i.quantityOrdered)
                return (
                  <React.Fragment key={note.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : note.id)}
                    >
                      <TableCell>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-medium font-mono">{note.deliveryNumber}</TableCell>
                      <TableCell>{note.supplierName}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(note.deliveryDate)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono">{note.items.length}</span>
                          {nonConformItems.length > 0 && (
                            <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[10px] px-1">
                              <AlertCircle className="mr-0.5 h-2.5 w-2.5" />{nonConformItems.length} NC
                            </Badge>
                          )}
                          {hasDiscrepancy && nonConformItems.length === 0 && (
                            <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-[10px] px-1">
                              Ecart
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className={config.className}>
                          {note.status === "en-attente" && <Clock className="mr-1 h-3 w-3" />}
                          {note.status === "validee" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {config.label}
                        </Badge>
                      </TableCell>
                      {showValidationButtons && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {note.status === "en-attente" && (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleValidate(note.id)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                                Valider
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                                onClick={() => { setRejectTarget(note.id); setRejectDialogOpen(true) }}
                                disabled={isProcessing}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Rejeter
                              </Button>
                            </div>
                          )}
                          {note.status === "validee" && (
                            <span className="text-xs text-emerald-600">
                              {note.validatedAt ? formatDate(note.validatedAt) : "Valide"}
                            </span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={showValidationButtons ? 7 : 6} className="bg-muted/30 p-4">
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold">Detail des articles recus</h4>
                            <div className="rounded-lg border bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Type</TableHead>
                                    <TableHead className="text-xs">Article</TableHead>
                                    <TableHead className="text-xs text-right">Commande</TableHead>
                                    <TableHead className="text-xs text-right">Recu</TableHead>
                                    <TableHead className="text-xs text-center">Conforme</TableHead>
                                    <TableHead className="text-xs">Remarque</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {note.items.map((item) => {
                                    const hasGap = item.quantityReceived !== item.quantityOrdered
                                    return (
                                      <TableRow key={item.id} className={!item.isConform ? "bg-amber-50/50" : ""}>
                                        <TableCell className="text-xs">
                                          <Badge variant="outline" className="text-[10px]">
                                            {item.itemType === "raw_material" ? "MP" : item.itemType === "packaging" ? "Emb." : "Cons."}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">{item.name}</TableCell>
                                        <TableCell className="text-xs text-right font-mono">{item.quantityOrdered} {item.unit}</TableCell>
                                        <TableCell className={`text-xs text-right font-mono ${hasGap ? "text-amber-700 font-bold" : ""}`}>
                                          {item.quantityReceived} {item.unit}
                                        </TableCell>
                                        <TableCell className="text-xs text-center">
                                          {item.isConform ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                                          ) : (
                                            <XCircle className="h-4 w-4 text-amber-500 mx-auto" />
                                          )}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{item.remark || "-"}</TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                            {note.notes && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium">Notes: </span>{note.notes}
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
            <AlertDialogTitle>Rejeter le bon de livraison ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. Le bon sera marque comme rejete.
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
