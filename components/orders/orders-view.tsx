"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import {
  Plus, MessageCircle, Globe, Store, Phone, CreditCard,
  Clock, Truck, MapPin, Package, Instagram, History, CheckCircle2,
  ArrowRight, AlertCircle, Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { useTenant } from "@/lib/tenant-context"
import {
  fetchOrders, updateOrderStatus, updatePaymentStatus,
  getOrderStatusHistory,
  type Order, type StatusHistoryEntry,
} from "@/lib/orders/actions"
import { toast } from "sonner"
import { NewOrderDrawer } from "./new-order-drawer"

const statusConfig: Record<string, { label: string; color: string }> = {
  nouveau: { label: "Nouveau", color: "bg-blue-500" },
  "en-preparation": { label: "En preparation", color: "bg-warning" },
  pret: { label: "Pret", color: "bg-primary" },
  "en-livraison": { label: "En livraison", color: "bg-orange-500" },
  livre: { label: "Livre / Vendu", color: "bg-muted" },
}

const courierNames: Record<string, string> = {
  aramex: "Aramex",
  rapidpost: "Rapid Poste",
  express: "Tunisia Express",
  stafim: "Stafim",
  autre: "Autre coursier",
}

const sourceIcons: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  phone: Phone,
  web: Globe,
  instagram: Instagram,
  comptoir: Store,
}

const historyLabels: Record<string, string> = {
  nouveau: "Commande creee",
  "en-preparation": "Preparation demarree",
  pret: "Commande prete",
  "en-livraison": "Expediee",
  livre: "Livree / Vendue",
  "paiement-complet": "Paiement complet",
  "paiement-partiel": "Acompte enregistre",
}

export function OrdersView() {
  const { currentTenant } = useTenant()
  const searchParams = useSearchParams()

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const isDemoTenant = currentTenant.id === "demo"

  // SWR fetcher for orders
  const { data: orders = [], mutate, isLoading } = useSWR(
    isDemoTenant ? null : ["orders", currentTenant.id],
    () => fetchOrders(currentTenant.id),
    { revalidateOnFocus: false }
  )

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setNewOrderOpen(true)
    }
  }, [searchParams])

  const ordersByStatus = {
    nouveau: orders.filter((o) => o.status === "nouveau"),
    "en-preparation": orders.filter((o) => o.status === "en-preparation"),
    pret: orders.filter((o) => o.status === "pret"),
    "en-livraison": orders.filter((o) => o.status === "en-livraison"),
    livre: orders.filter((o) => o.status === "livre"),
  }

  const loadHistory = useCallback(async (orderId: string) => {
    setHistoryLoading(true)
    const history = await getOrderStatusHistory(orderId)
    setStatusHistory(history)
    setHistoryLoading(false)
  }, [])

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order)
    setSheetOpen(true)
    loadHistory(order.id)
  }

  const handleStatusChange = async (newStatus: Order["status"], note?: string) => {
    if (!selectedOrder || actionLoading) return
    setActionLoading(true)

    const ok = await updateOrderStatus(
      selectedOrder.id,
      currentTenant.id,
      newStatus,
      note
    )

    if (ok) {
      toast.success("Statut mis a jour", {
        description: `Commande -> ${statusConfig[newStatus].label}`,
      })
      // Optimistic update
      setSelectedOrder({ ...selectedOrder, status: newStatus })
      mutate()
      loadHistory(selectedOrder.id)
    } else {
      toast.error("Erreur lors de la mise a jour")
    }
    setActionLoading(false)
  }

  const handleEncaisser = async () => {
    if (!selectedOrder || actionLoading) return
    setActionLoading(true)

    const ok = await updatePaymentStatus(
      selectedOrder.id,
      currentTenant.id,
      "paid",
      selectedOrder.total
    )

    if (ok) {
      toast.success("Paiement enregistre", {
        description: `${selectedOrder.total.toLocaleString("fr-TN")} TND encaisses`,
      })
      setSelectedOrder({ ...selectedOrder, paymentStatus: "paid", deposit: selectedOrder.total })
      mutate()
      loadHistory(selectedOrder.id)
    } else {
      toast.error("Erreur lors de l'encaissement")
    }
    setActionLoading(false)
  }

  const getPaymentBadge = (status: Order["paymentStatus"]) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-primary">Paye</Badge>
      case "partial":
        return <Badge className="bg-warning text-warning-foreground">Acompte</Badge>
      case "unpaid":
        return <Badge variant="destructive">Non paye</Badge>
    }
  }

  const OrderCard = ({ order }: { order: Order }) => {
    const SourceIcon = sourceIcons[order.source] || Store

    return (
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleOrderClick(order)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <SourceIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{order.customerName}</span>
            </div>
            {getPaymentBadge(order.paymentStatus)}
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.quantity}x {item.name}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{order.total.toLocaleString("fr-TN")} TND</span>
              {order.deliveryType === "delivery" && (
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
            {order.deliveryDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(order.deliveryDate).toLocaleDateString("fr-TN")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isDemoTenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Mode Demo</h2>
        <p className="text-muted-foreground">Connectez-vous avec un compte patisserie pour gerer vos commandes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commandes</h1>
          <p className="text-muted-foreground">
            Gerez vos commandes clients
          </p>
        </div>
        <Button onClick={() => setNewOrderOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle commande
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="kanban">
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">Liste</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {(Object.keys(statusConfig) as Order["status"][]).map((status) => (
                <div key={status} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${statusConfig[status].color}`} />
                    <h3 className="font-medium text-sm">{statusConfig[status].label}</h3>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {ordersByStatus[status].length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {ordersByStatus[status].map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                    {ordersByStatus[status].length === 0 && (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        Aucune commande
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Toutes les commandes ({orders.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune commande pour le moment
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOrderClick(order)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${statusConfig[order.status]?.color}`} />
                        <div>
                          <p className="font-medium text-sm">{order.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.items.length} article(s) - {new Date(order.createdAt).toLocaleDateString("fr-TN")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{order.total.toLocaleString("fr-TN")} TND</p>
                        {getPaymentBadge(order.paymentStatus)}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Order Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  Commande
                  <Badge variant="outline" className={`${statusConfig[selectedOrder.status]?.color} text-white text-[10px]`}>
                    {statusConfig[selectedOrder.status]?.label}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  Creee le {new Date(selectedOrder.createdAt).toLocaleString("fr-TN")}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Customer Info */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Client</h4>
                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="font-medium">{selectedOrder.customerName}</p>
                    {selectedOrder.customerPhone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedOrder.customerPhone}
                      </div>
                    )}
                    {selectedOrder.deliveryType === "delivery" && selectedOrder.customerAddress && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 mt-0.5" />
                        <span>{selectedOrder.customerAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Info */}
                {selectedOrder.deliveryType === "delivery" && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Livraison</h4>
                    <div className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Transporteur</span>
                        <span className="font-medium">{selectedOrder.courier ? courierNames[selectedOrder.courier] || selectedOrder.courier : "-"}</span>
                      </div>
                      {selectedOrder.shippingCost > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Frais de livraison</span>
                          <span>{selectedOrder.shippingCost.toLocaleString("fr-TN")} TND</span>
                        </div>
                      )}
                      {selectedOrder.trackingNumber && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">N suivi</span>
                          <Badge variant="outline">{selectedOrder.trackingNumber}</Badge>
                        </div>
                      )}
                      {selectedOrder.status === "en-livraison" && (
                        <div className="flex items-center gap-2 text-sm text-orange-600 mt-2 pt-2 border-t">
                          <Truck className="h-4 w-4 animate-pulse" />
                          <span className="font-medium">En cours de livraison</span>
                        </div>
                      )}
                      {selectedOrder.deliveredAt && (
                        <div className="flex items-center gap-2 text-sm text-primary mt-2 pt-2 border-t">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-medium">
                            Livree le {new Date(selectedOrder.deliveredAt).toLocaleString("fr-TN")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Articles</h4>
                  <div className="rounded-lg border divide-y">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between p-3 text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-medium">
                          {(item.quantity * item.price).toLocaleString("fr-TN")} TND
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Paiement</h4>
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold">{selectedOrder.total.toLocaleString("fr-TN")} TND</span>
                    </div>
                    {selectedOrder.deposit > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Acompte verse</span>
                        <span>{selectedOrder.deposit.toLocaleString("fr-TN")} TND</span>
                      </div>
                    )}
                    {selectedOrder.paymentStatus !== "paid" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Reste a payer</span>
                        <span className="font-medium text-destructive">
                          {(selectedOrder.total - selectedOrder.deposit).toLocaleString("fr-TN")} TND
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Historique
                  </h4>
                  <div className="rounded-lg border p-3">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : statusHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">Aucun historique</p>
                    ) : (
                      <div className="relative space-y-0">
                        {statusHistory.map((entry, idx) => (
                          <div key={entry.id} className="flex gap-3">
                            {/* Timeline line */}
                            <div className="flex flex-col items-center">
                              <div className={`h-2.5 w-2.5 rounded-full mt-1.5 ${
                                idx === statusHistory.length - 1 ? "bg-primary" : "bg-muted-foreground/40"
                              }`} />
                              {idx < statusHistory.length - 1 && (
                                <div className="w-px flex-1 bg-border min-h-[24px]" />
                              )}
                            </div>
                            {/* Content */}
                            <div className="pb-4 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {historyLabels[entry.toStatus] || entry.toStatus}
                                </span>
                                {entry.fromStatus && (
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {new Date(entry.createdAt).toLocaleString("fr-TN")}
                                {entry.changedByName && ` - ${entry.changedByName}`}
                              </div>
                              {entry.note && (
                                <p className="text-xs text-muted-foreground mt-1 italic">{entry.note}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-2">
                  {selectedOrder.status === "nouveau" && (
                    <Button className="w-full" disabled={actionLoading} onClick={() => handleStatusChange("en-preparation")}>
                      {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
                      Demarrer la preparation
                    </Button>
                  )}
                  {selectedOrder.status === "en-preparation" && (
                    <Button className="w-full" disabled={actionLoading} onClick={() => handleStatusChange("pret")}>
                      {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Marquer comme pret
                    </Button>
                  )}
                  {selectedOrder.status === "pret" && (
                    <>
                      {selectedOrder.paymentStatus !== "paid" && (
                        <Button className="w-full" disabled={actionLoading} onClick={handleEncaisser}>
                          {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                          Encaisser {(selectedOrder.total - selectedOrder.deposit).toLocaleString("fr-TN")} TND
                        </Button>
                      )}
                      {selectedOrder.deliveryType === "delivery" ? (
                        <Button
                          variant={selectedOrder.paymentStatus === "paid" ? "default" : "outline"}
                          className={`w-full ${selectedOrder.paymentStatus !== "paid" ? "bg-transparent" : ""}`}
                          disabled={actionLoading}
                          onClick={() => handleStatusChange("en-livraison", "Commande expediee")}
                        >
                          <Truck className="mr-2 h-4 w-4" />
                          Expedier la commande
                        </Button>
                      ) : (
                        <Button
                          variant={selectedOrder.paymentStatus === "paid" ? "default" : "outline"}
                          className={`w-full ${selectedOrder.paymentStatus !== "paid" ? "bg-transparent" : ""}`}
                          disabled={actionLoading}
                          onClick={() => handleStatusChange("livre", "Retrait client effectue")}
                        >
                          Retrait client effectue
                        </Button>
                      )}
                    </>
                  )}
                  {selectedOrder.status === "en-livraison" && (
                    <>
                      {selectedOrder.paymentStatus !== "paid" && (
                        <Button className="w-full" disabled={actionLoading} onClick={handleEncaisser}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Encaisser {(selectedOrder.total - selectedOrder.deposit).toLocaleString("fr-TN")} TND
                        </Button>
                      )}
                      <Button
                        variant={selectedOrder.paymentStatus === "paid" ? "default" : "outline"}
                        className={`w-full ${selectedOrder.paymentStatus !== "paid" ? "bg-transparent" : ""}`}
                        disabled={actionLoading}
                        onClick={() => handleStatusChange("livre", "Livraison confirmee")}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Confirmer la livraison
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New Order Drawer */}
      <NewOrderDrawer open={newOrderOpen} onOpenChange={setNewOrderOpen} onOrderCreated={() => mutate()} />
    </div>
  )
}
