"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  MapPin,
  CalendarDays,
} from "lucide-react"
import { useTenant } from "@/lib/tenant-context"
import {
  fetchPackerOrders,
  startPacking,
  completePacking,
  reportPackingIssue,
} from "@/lib/packer/actions"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ISSUE_REASONS = [
  "Article manquant",
  "Produit endommagé",
  "Erreur de commande",
  "Autre",
]

export function PackerWorkerView() {
  const { currentTenant, currentUser, isLoading: tenantLoading } = useTenant()
  const tenantId = currentTenant.id
  const isFallback = tenantId === "__fallback__"

  const {
    data: rawOrders,
    mutate,
    isLoading,
  } = useSWR(
    !tenantLoading && !isFallback ? `packer-worker-${tenantId}` : null,
    () => fetchPackerOrders(tenantId),
    {
      refreshInterval: 10000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      keepPreviousData: true,
    }
  )

  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [issueDialogOrderId, setIssueDialogOrderId] = useState<string | null>(
    null
  )
  const [issueReason, setIssueReason] = useState<string>("")
  const [checkedMap, setCheckedMap] = useState<Record<string, Set<number>>>({})

  const orders = rawOrders || []
  const emballeurName = currentUser.name
  const today = new Date().toISOString().slice(0, 10)

  // Filter orders into tabs using packed_by (not courier, which is for delivery)
  const toPackOrders = orders.filter(
    (o: any) =>
      (o.status === "nouveau" || o.status === "en-preparation") &&
      (!o.packed_by || o.packed_by === "")
  )
  const inProgressOrders = orders.filter(
    (o: any) =>
      o.status === "en-preparation" && o.packed_by === emballeurName
  )
  const completedOrders = orders.filter(
    (o: any) =>
      o.status === "pret" && o.updated_at?.slice(0, 10) === today
  )

  function toggleItem(orderId: string, idx: number) {
    setCheckedMap((prev) => {
      const current = new Set(prev[orderId] || [])
      if (current.has(idx)) {
        current.delete(idx)
      } else {
        current.add(idx)
      }
      return { ...prev, [orderId]: current }
    })
  }

  async function handleStartPacking(orderId: string) {
    setLoadingAction(orderId)
    await startPacking(orderId, tenantId, emballeurName)
    await mutate()
    setLoadingAction(null)
  }

  async function handleCompletePacking(orderId: string) {
    setLoadingAction(orderId)
    await completePacking(orderId, tenantId, emballeurName)
    setCheckedMap((prev) => {
      const next = { ...prev }
      delete next[orderId]
      return next
    })
    await mutate()
    setLoadingAction(null)
  }

  async function handleIssueSubmit() {
    if (!issueDialogOrderId || !issueReason) return
    setLoadingAction(issueDialogOrderId)
    await reportPackingIssue(
      issueDialogOrderId,
      tenantId,
      emballeurName,
      issueReason
    )
    setIssueDialogOrderId(null)
    setIssueReason("")
    await mutate()
    setLoadingAction(null)
  }

  if (tenantLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold">Préparation</h1>
            <p className="text-sm text-muted-foreground">{emballeurName}</p>
          </div>
        </div>
        <Badge variant="secondary">Emballeur</Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="to-pack" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="to-pack">
            À préparer ({toPackOrders.length})
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            En cours ({inProgressOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Terminées ({completedOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: À préparer */}
        <TabsContent value="to-pack" className="mt-4">
          {toPackOrders.length === 0 ? (
            <EmptyState text="Aucune commande à préparer" />
          ) : (
            <div className="flex flex-col gap-3">
              {toPackOrders.map((order: any) => (
                <PackerOrderCard key={order.id} order={order}>
                  <Button
                    className="w-full min-h-[48px] text-base font-semibold bg-green-600 hover:bg-green-700"
                    onClick={() => handleStartPacking(order.id)}
                    disabled={loadingAction === order.id}
                  >
                    {loadingAction === order.id ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <Package className="h-5 w-5 mr-2" />
                    )}
                    Prendre en charge
                  </Button>
                </PackerOrderCard>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: En cours */}
        <TabsContent value="in-progress" className="mt-4">
          {inProgressOrders.length === 0 ? (
            <EmptyState text="Aucune commande en cours" />
          ) : (
            <div className="flex flex-col gap-3">
              {inProgressOrders.map((order: any) => {
                const items = Array.isArray(order.items) ? order.items : []
                const checkedItems = checkedMap[order.id] || new Set()
                const allChecked =
                  items.length > 0 && checkedItems.size === items.length

                return (
                  <PackerOrderCard
                    key={order.id}
                    order={order}
                    showTimer
                    hideItems
                    className={
                      allChecked
                        ? "border-green-500 dark:border-green-600"
                        : undefined
                    }
                  >
                    {/* Interactive checklist */}
                    {items.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm text-muted-foreground">
                          Articles :
                        </span>
                        {items.map((item: any, idx: number) => {
                          const isChecked = checkedItems.has(idx)
                          return (
                            <label
                              key={idx}
                              className="flex items-center gap-3 min-h-[44px] px-2 rounded-md cursor-pointer hover:bg-muted/50 select-none"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() =>
                                  toggleItem(order.id, idx)
                                }
                                className="size-5"
                              />
                              <span
                                className={
                                  isChecked
                                    ? "line-through text-green-600 dark:text-green-400"
                                    : ""
                                }
                              >
                                {item.quantity}x {item.name}
                              </span>
                            </label>
                          )
                        })}
                        <span className="text-xs text-muted-foreground mt-1">
                          {checkedItems.size}/{items.length} articles vérifiés
                        </span>
                      </div>
                    )}

                    {allChecked && (
                      <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Tous les articles vérifiés ✓
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className="min-h-[48px] text-base font-semibold bg-green-600 hover:bg-green-700"
                        onClick={() => handleCompletePacking(order.id)}
                        disabled={!allChecked || loadingAction === order.id}
                      >
                        {loadingAction === order.id ? (
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                        )}
                        Emballé ✓
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-[48px] text-base font-semibold border-amber-500 text-amber-600 hover:bg-amber-50"
                        onClick={() => {
                          setIssueDialogOrderId(order.id)
                          setIssueReason("")
                        }}
                        disabled={loadingAction === order.id}
                      >
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        Problème
                      </Button>
                    </div>
                  </PackerOrderCard>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab: Terminées */}
        <TabsContent value="completed" className="mt-4">
          {completedOrders.length === 0 ? (
            <EmptyState text="Aucune commande terminée aujourd'hui" />
          ) : (
            <div className="flex flex-col gap-3">
              {completedOrders.map((order: any) => (
                <PackerOrderCard key={order.id} order={order} showVerifiedBadge>
                  <Badge variant="secondary" className="w-fit">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Emballée
                  </Badge>
                </PackerOrderCard>
              ))}
              {/* Stats bar */}
              <div className="mt-2 p-3 rounded-lg bg-muted text-center text-sm font-medium text-muted-foreground">
                Aujourd&apos;hui : {completedOrders.length} commande
                {completedOrders.length > 1 ? "s" : ""} emballée
                {completedOrders.length > 1 ? "s" : ""}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Issue dialog */}
      <Dialog
        open={!!issueDialogOrderId}
        onOpenChange={(open) => {
          if (!open) {
            setIssueDialogOrderId(null)
            setIssueReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler un problème</DialogTitle>
          </DialogHeader>
          <Select value={issueReason} onValueChange={setIssueReason}>
            <SelectTrigger className="w-full min-h-[48px]">
              <SelectValue placeholder="Choisir une raison..." />
            </SelectTrigger>
            <SelectContent>
              {ISSUE_REASONS.map((reason) => (
                <SelectItem
                  key={reason}
                  value={reason}
                  className="min-h-[44px]"
                >
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full min-h-[48px] text-base font-semibold border-amber-500 text-amber-600 hover:bg-amber-50"
              onClick={handleIssueSubmit}
              disabled={!issueReason || loadingAction === issueDialogOrderId}
            >
              {loadingAction === issueDialogOrderId ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <AlertTriangle className="h-5 w-5 mr-2" />
              )}
              Confirmer le problème
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Order Card ─────────────────────────────────────────────────

function PackerOrderCard({
  order,
  showTimer,
  hideItems,
  showVerifiedBadge,
  className,
  children,
}: {
  order: any
  showTimer?: boolean
  hideItems?: boolean
  showVerifiedBadge?: boolean
  className?: string
  children: React.ReactNode
}) {
  const items = Array.isArray(order.items) ? order.items : []

  return (
    <Card className={`py-4 gap-3 ${className || ""}`}>
      <CardContent className="flex flex-col gap-3 px-4">
        {/* Header row: order ID + timer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">
              #{order.id?.substring(0, 8)}
            </span>
          </div>
          {showTimer && <PackingTimer orderId={order.id} />}
          {order.delivery_type && (
            <Badge variant="outline" className="text-xs">
              {order.delivery_type === "delivery" ? "Livraison" : "Retrait"}
            </Badge>
          )}
        </div>

        {/* Customer name */}
        <span className="font-medium text-sm">{order.customer_name}</span>

        {/* Delivery date */}
        {order.delivery_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>
              {new Date(order.delivery_date).toLocaleDateString("fr-FR")}
            </span>
          </div>
        )}

        {/* Items list (hidden when parent renders its own checklist) */}
        {!hideItems && items.length > 0 && (
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-muted-foreground">
              Articles :
            </span>
            {items.map((item: any, idx: number) => (
              <span key={idx} className="ml-2">
                • {item.quantity}x {item.name}
              </span>
            ))}
            {showVerifiedBadge && (
              <span className="text-xs font-medium text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Tous vérifiés ✓
              </span>
            )}
          </div>
        )}

        {/* Delivery address / gouvernorat */}
        {(order.customer_address || order.gouvernorat) && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {order.customer_address || order.gouvernorat}
              {order.delivery_type === "delivery" ? " (livraison)" : ""}
            </span>
          </div>
        )}

        {/* Notes (important for special instructions) */}
        {order.notes && (
          <p className="text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded px-2 py-1.5 font-medium">
            {order.notes}
          </p>
        )}

        {/* Actions */}
        {children}
      </CardContent>
    </Card>
  )
}

// ─── Packing Timer ──────────────────────────────────────────────

function PackingTimer({ orderId }: { orderId: string }) {
  const [elapsed, setElapsed] = useState(0)
  const [startTime] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  return (
    <div className="flex items-center gap-1 text-sm font-mono text-amber-600">
      <Clock className="h-4 w-4" />
      <span>
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  )
}

// ─── Empty State ────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Package className="h-10 w-10 mb-3 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  )
}
