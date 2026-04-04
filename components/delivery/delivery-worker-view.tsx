"use client"

import { useState } from "react"
import useSWR from "swr"
import { Phone, MapPin, Package, CheckCircle2, XCircle, Truck, Loader2 } from "lucide-react"
import { useTenant } from "@/lib/tenant-context"
import { fetchDeliveryOrders, takeDelivery, markDelivered, markFailed } from "@/lib/delivery/worker-actions"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

const FAILURE_REASONS = [
  "Client absent",
  "Mauvaise adresse",
  "Client refuse",
  "Autre",
]

export function DeliveryWorkerView() {
  const { currentTenant, currentUser, isLoading: tenantLoading } = useTenant()
  const tenantId = currentTenant.id
  const isFallback = tenantId === "__fallback__"

  const { data: rawOrders, mutate, isLoading } = useSWR(
    !tenantLoading && !isFallback ? `delivery-worker-${tenantId}` : null,
    () => fetchDeliveryOrders(tenantId),
    {
      refreshInterval: 10000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      keepPreviousData: true,
    }
  )

  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [failDialogOrderId, setFailDialogOrderId] = useState<string | null>(null)
  const [failReason, setFailReason] = useState<string>("")

  const orders = rawOrders || []
  const livreurName = currentUser.name

  // Filter orders by tab
  const today = new Date().toISOString().slice(0, 10)

  const readyOrders = orders.filter(
    (o: any) => o.status === "pret"
  )
  const inProgressOrders = orders.filter(
    (o: any) => o.status === "en-livraison" && o.courier === livreurName
  )
  const historyOrders = orders.filter(
    (o: any) =>
      o.status === "livre" &&
      o.delivered_at?.slice(0, 10) === today
  )

  async function handleTake(orderId: string) {
    setLoadingAction(orderId)
    await takeDelivery(orderId, tenantId, livreurName)
    await mutate()
    setLoadingAction(null)
  }

  async function handleDeliver(orderId: string) {
    setLoadingAction(orderId)
    await markDelivered(orderId, tenantId, livreurName)
    await mutate()
    setLoadingAction(null)
  }

  async function handleFailSubmit() {
    if (!failDialogOrderId || !failReason) return
    setLoadingAction(failDialogOrderId)
    await markFailed(failDialogOrderId, tenantId, livreurName, failReason)
    setFailDialogOrderId(null)
    setFailReason("")
    await mutate()
    setLoadingAction(null)
  }

  function formatAmount(amount: number) {
    return `${Number(amount).toFixed(3)} TND`
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
          <Truck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold">Mes Livraisons</h1>
            <p className="text-sm text-muted-foreground">{livreurName}</p>
          </div>
        </div>
        <Badge variant="secondary">Livreur</Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ready" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="ready">
            A livrer ({readyOrders.length})
          </TabsTrigger>
          <TabsTrigger value="progress">
            En cours ({inProgressOrders.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Historique ({historyOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: À livrer */}
        <TabsContent value="ready" className="mt-4">
          {readyOrders.length === 0 ? (
            <EmptyState text="Aucune commande prete a livrer" />
          ) : (
            <div className="flex flex-col gap-3">
              {readyOrders.map((order: any) => (
                <OrderCard key={order.id} order={order} formatAmount={formatAmount}>
                  <Button
                    className="w-full min-h-[48px] text-base font-semibold"
                    onClick={() => handleTake(order.id)}
                    disabled={loadingAction === order.id}
                  >
                    {loadingAction === order.id ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <Truck className="h-5 w-5 mr-2" />
                    )}
                    Prendre en charge
                  </Button>
                </OrderCard>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: En cours */}
        <TabsContent value="progress" className="mt-4">
          {inProgressOrders.length === 0 ? (
            <EmptyState text="Aucune livraison en cours" />
          ) : (
            <div className="flex flex-col gap-3">
              {inProgressOrders.map((order: any) => (
                <OrderCard key={order.id} order={order} formatAmount={formatAmount}>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="default"
                      className="min-h-[48px] text-base font-semibold bg-green-600 hover:bg-green-700"
                      onClick={() => handleDeliver(order.id)}
                      disabled={loadingAction === order.id}
                    >
                      {loadingAction === order.id ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                      )}
                      Livre
                    </Button>
                    <Button
                      variant="destructive"
                      className="min-h-[48px] text-base font-semibold"
                      onClick={() => {
                        setFailDialogOrderId(order.id)
                        setFailReason("")
                      }}
                      disabled={loadingAction === order.id}
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      Echec
                    </Button>
                  </div>
                </OrderCard>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Historique */}
        <TabsContent value="history" className="mt-4">
          {historyOrders.length === 0 ? (
            <EmptyState text="Aucune livraison terminee aujourd'hui" />
          ) : (
            <div className="flex flex-col gap-3">
              {historyOrders.map((order: any) => (
                <OrderCard key={order.id} order={order} formatAmount={formatAmount}>
                  <Badge variant="secondary" className="w-fit">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Livre
                  </Badge>
                </OrderCard>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Failure reason dialog */}
      <Dialog
        open={!!failDialogOrderId}
        onOpenChange={(open) => {
          if (!open) {
            setFailDialogOrderId(null)
            setFailReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raison de l&apos;echec</DialogTitle>
          </DialogHeader>
          <Select value={failReason} onValueChange={setFailReason}>
            <SelectTrigger className="w-full min-h-[48px]">
              <SelectValue placeholder="Choisir une raison..." />
            </SelectTrigger>
            <SelectContent>
              {FAILURE_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason} className="min-h-[44px]">
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="destructive"
              className="w-full min-h-[48px] text-base font-semibold"
              onClick={handleFailSubmit}
              disabled={!failReason || loadingAction === failDialogOrderId}
            >
              {loadingAction === failDialogOrderId ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : null}
              Confirmer l&apos;echec
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function OrderCard({
  order,
  formatAmount,
  children,
}: {
  order: any
  formatAmount: (n: number) => string
  children: React.ReactNode
}) {
  return (
    <Card className="py-4 gap-3">
      <CardContent className="flex flex-col gap-3 px-4">
        {/* Order ID + Amount */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">
              #{order.id?.substring(0, 8)}
            </span>
          </div>
          <span className="font-bold text-sm">
            {formatAmount(order.total)}
          </span>
        </div>

        {/* Customer info */}
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{order.customer_name}</span>

          {order.customer_phone && (
            <a
              href={`tel:${order.customer_phone}`}
              className="flex items-center gap-2 text-primary hover:underline min-h-[44px] py-1"
            >
              <Phone className="h-4 w-4" />
              {order.customer_phone}
            </a>
          )}

          {order.customer_address && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{order.customer_address}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {order.notes && (
          <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-1.5">
            {order.notes}
          </p>
        )}

        {/* Actions */}
        {children}
      </CardContent>
    </Card>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Package className="h-10 w-10 mb-3 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  )
}
