"use client"

import { useState, useEffect } from "react"
import {
  Phone, Star, AlertTriangle, Ban, User, Clock,
  ShoppingCart, TrendingUp, RotateCcw, Loader2, Trash2,
  CheckCircle2, XCircle, Package, Truck, MapPin, FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { type Client, type QuickOrderRecord, fetchClientOrders, updateClient } from "@/lib/clients/actions"
import { toast } from "sonner"

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: "Normal", color: "text-muted-foreground", bg: "bg-muted" },
  vip: { label: "VIP", color: "text-emerald-700", bg: "bg-emerald-100" },
  warning: { label: "Attention", color: "text-amber-700", bg: "bg-amber-100" },
  blacklisted: { label: "Blackliste", color: "text-red-700", bg: "bg-red-100" },
}

const orderStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-blue-100 text-blue-700" },
  confirmed: { label: "Confirmee", color: "bg-emerald-100 text-emerald-700" },
  delivered: { label: "Livree", color: "bg-muted text-muted-foreground" },
  cancelled: { label: "Annulee", color: "bg-red-100 text-red-700" },
  returned: { label: "Retournee", color: "bg-amber-100 text-amber-700" },
}

interface ClientDetailDrawerProps {
  client: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (clientId: string, status: string) => void
  onDelete: (clientId: string) => void
  onUpdated: () => void
}

export function ClientDetailDrawer({
  client, open, onOpenChange, onStatusChange, onDelete, onUpdated,
}: ClientDetailDrawerProps) {
  const [orders, setOrders] = useState<QuickOrderRecord[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [notes, setNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  useEffect(() => {
    if (client && open) {
      setNotes(client.notes || "")
      setLoadingOrders(true)
      fetchClientOrders(client.id).then((data) => {
        setOrders(data)
        setLoadingOrders(false)
      })
    }
  }, [client, open])

  if (!client) return null

  const cfg = statusConfig[client.status] || statusConfig.normal

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    const ok = await updateClient(client.id, { notes })
    if (ok) { toast.success("Notes sauvegardees"); onUpdated() }
    else toast.error("Erreur")
    setSavingNotes(false)
  }

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full text-base font-bold ${cfg.bg} ${cfg.color}`}>
                {client.name ? client.name.charAt(0).toUpperCase() : <Phone className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-lg font-bold">{client.name || "Client sans nom"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />{client.phone}
                  </span>
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </Badge>
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6 pb-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border bg-card p-3 text-center">
                <ShoppingCart className="h-4 w-4 mx-auto text-primary mb-1" />
                <p className="text-xl font-bold">{client.totalOrders}</p>
                <p className="text-[10px] text-muted-foreground">Commandes</p>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <TrendingUp className="h-4 w-4 mx-auto text-primary mb-1" />
                <p className="text-xl font-bold">{client.totalSpent.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground">TND depense</p>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <RotateCcw className="h-4 w-4 mx-auto text-red-500 mb-1" />
                <p className={`text-xl font-bold ${client.returnCount > 0 ? "text-red-600" : ""}`}>
                  {client.returnCount}
                </p>
                <p className="text-[10px] text-muted-foreground">Retours</p>
              </div>
            </div>

            {/* Change Status */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Modifier le statut
              </p>
              <Select value={client.status} onValueChange={(v) => onStatusChange(client.id, v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="warning">Attention</SelectItem>
                  <SelectItem value="blacklisted">Blackliste</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Order History */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Historique des commandes ({orders.length})
              </p>

              {loadingOrders ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Aucune commande rapide
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => {
                    const oCfg = orderStatusConfig[order.status] || orderStatusConfig.pending
                    return (
                      <div key={order.id} className="rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={`text-[10px] ${oCfg.color}`}>
                              {oCfg.label}
                            </Badge>
                            {order.truecallerVerified && (
                              <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700">
                                Truecaller
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <p className="font-semibold">{Number(order.amount).toFixed(3)} TND</p>
                            {order.itemsDescription && (
                              <p className="text-xs text-muted-foreground mt-0.5">{order.itemsDescription}</p>
                            )}
                          </div>
                          <div className="text-right text-[10px] text-muted-foreground">
                            {order.deliveryType === "delivery" ? (
                              <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> Livraison</span>
                            ) : (
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Retrait</span>
                            )}
                          </div>
                        </div>

                        {order.confirmedByName && (
                          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Confirme par {order.confirmedByName}
                            {order.returnedByName && (
                              <span className="text-red-500 ml-2">| Retourne par {order.returnedByName}</span>
                            )}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Notes
              </p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajouter des notes sur ce client..."
                rows={3}
              />
              <Button
                size="sm"
                className="mt-2"
                onClick={handleSaveNotes}
                disabled={savingNotes || notes === (client.notes || "")}
              >
                {savingNotes ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Sauvegarder
              </Button>
            </div>

            <Separator />

            {/* Infos */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Client depuis: {formatDate(client.createdAt)}</p>
              <p>Derniere MAJ: {formatDate(client.updatedAt)}</p>
            </div>

            {/* Delete */}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive w-full"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Supprimer ce client
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce client ?</DialogTitle>
            <DialogDescription>
              Cette action est irreversible. Toutes les donnees de {client.name || client.phone} seront supprimees.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(client.id)
                setConfirmDeleteOpen(false)
                onOpenChange(false)
              }}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
