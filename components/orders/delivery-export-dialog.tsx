"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Truck, FileDown, CloudUpload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useTenant } from "@/lib/tenant-context"
import { exportDeliveryOrdersToBestDeliveryCSV, type Order } from "@/lib/orders/actions"
import { exportSemicolonCSV } from "@/lib/csv-export"
import {
  filterOrdersForDeliveryExport,
  type DeliveryExportStatusFilter,
} from "@/lib/orders/delivery-export"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DeliveryExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: Order[]
  onSuccess?: () => void
}

export function DeliveryExportDialog({
  open,
  onOpenChange,
  orders,
  onSuccess,
}: DeliveryExportDialogProps) {
  const { currentTenant } = useTenant()
  const [includePret, setIncludePret] = useState(true)
  const [includeEnLivraison, setIncludeEnLivraison] = useState(false)
  const [onlyToday, setOnlyToday] = useState(true)
  const [includeAddress, setIncludeAddress] = useState(true)
  const [loadingCsv, setLoadingCsv] = useState(false)
  const [loadingApi, setLoadingApi] = useState(false)
  const [lastApiSummary, setLastApiSummary] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setIncludePret(true)
    setIncludeEnLivraison(false)
    setOnlyToday(true)
    setLastApiSummary(null)
  }, [open])

  const statuses: DeliveryExportStatusFilter[] = useMemo(() => {
    const s: DeliveryExportStatusFilter[] = []
    if (includePret) s.push("pret")
    if (includeEnLivraison) s.push("en-livraison")
    return s
  }, [includePret, includeEnLivraison])

  const matchingCount = useMemo(
    () =>
      filterOrdersForDeliveryExport(orders, statuses, {
        onlyToday,
        timeZone: "Africa/Tunis",
      }).length,
    [orders, statuses, onlyToday],
  )

  const handleDownloadCsv = async () => {
    if (!currentTenant?.id || statuses.length === 0) {
      toast.error("Choisissez au moins un statut")
      return
    }
    if (matchingCount === 0) {
      toast.error("Aucune commande livraison ne correspond")
      return
    }

    setLoadingCsv(true)
    try {
      const { headers, data } = await exportDeliveryOrdersToBestDeliveryCSV(currentTenant.id, {
        statuses,
        includeAddress,
        onlyToday,
      })
      exportSemicolonCSV({
        filename: "livraison-best-delivery",
        headers,
        data,
      })
      toast.success("Fichier CSV téléchargé (format Best Delivery)")
      onSuccess?.()
    } catch (e) {
      console.error(e)
      toast.error("Erreur lors de la génération du CSV")
    } finally {
      setLoadingCsv(false)
    }
  }

  const handleSendApi = async () => {
    if (!currentTenant?.id || statuses.length === 0) {
      toast.error("Choisissez au moins un statut")
      return
    }

    setLoadingApi(true)
    setLastApiSummary(null)
    try {
      const res = await fetch("/api/delivery/export-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statuses, onlyToday }),
      })
      const j = (await res.json().catch(() => ({}))) as {
        success?: boolean
        total?: number
        ok?: number
        failed?: number
        error?: string
      }

      if (!res.ok) {
        throw new Error(j.error || "Erreur export lot")
      }

      const total = j.total ?? 0
      const ok = j.ok ?? 0
      const failed = j.failed ?? 0
      setLastApiSummary(
        total === 0
          ? "Aucune commande à envoyer (vérifiez les statuts et le type livraison)."
          : `Envoyé : ${ok} réussi(s), ${failed} échec(s) sur ${total}.`,
      )

      if (failed === 0 && total > 0) {
        toast.success("Commandes envoyées vers l'API Best Delivery")
        onSuccess?.()
      } else if (total === 0) {
        toast.message("Aucune commande correspondante")
      } else {
        toast.warning("Export partiel — voir le détail ci-dessous")
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur réseau"
      toast.error(msg)
      setLastApiSummary(msg)
    } finally {
      setLoadingApi(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Export livraison (transporteur)
          </DialogTitle>
          <DialogDescription>
            Par défaut, seules les commandes <strong>prêtes du jour</strong> (statut Prêt), en{" "}
            <strong>livraison à domicile</strong>, sont exportées — pas l&apos;ensemble des commandes
            du magasin. Cochez « En livraison » si vous devez aussi renvoyer ce lot vers le
            transporteur.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Commandes concernées : </span>
            <strong>{matchingCount}</strong>
            {statuses.length === 0 && (
              <span className="text-destructive ml-2">(sélectionnez un statut)</span>
            )}
          </div>

          <div className="space-y-3">
            <Label>Statuts à inclure</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={includePret}
                  onCheckedChange={(v) => setIncludePret(v === true)}
                />
                Prêt (prêtes pour enlèvement / expédition)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={includeEnLivraison}
                  onCheckedChange={(v) => setIncludeEnLivraison(v === true)}
                />
                En livraison
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={onlyToday}
              onCheckedChange={(v) => setOnlyToday(v === true)}
            />
            Exporter seulement les commandes du jour (Tunis)
          </label>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={includeAddress}
              onCheckedChange={(v) => setIncludeAddress(v === true)}
            />
            Inclure la colonne Adresse (recommandé pour BL ; 8 colonnes au lieu de 7)
          </label>

          {lastApiSummary && (
            <Alert>
              <AlertDescription className="text-sm">{lastApiSummary}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button
            variant="secondary"
            onClick={handleDownloadCsv}
            disabled={loadingCsv || loadingApi || statuses.length === 0 || matchingCount === 0}
          >
            {loadingCsv ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Télécharger CSV
          </Button>
          <Button onClick={handleSendApi} disabled={loadingCsv || loadingApi || statuses.length === 0}>
            {loadingApi ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="mr-2 h-4 w-4" />
            )}
            Envoyer vers API
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
