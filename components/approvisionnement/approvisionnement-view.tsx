"use client"

import { useState } from "react"
import { Truck, Users, FileText, Phone, Mail, Plus, History, Trophy } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTenant } from "@/lib/tenant-context"
import {
  getSuppliers,
  getPurchaseOrders,
  getPriceHistory,
  getBestPricesByProduct,
  getPriceHistoryForProduct,
  type Supplier,
  type PurchaseOrder,
} from "@/lib/mock-data"
import { PriceHistoryTable } from "./price-history-table"
import { BestPricesView } from "./best-prices-view"
import { NewPurchaseOrderDrawer } from "./new-purchase-order-drawer"

const statusConfig: Record<PurchaseOrder["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  brouillon: { label: "Brouillon", variant: "outline" },
  envoyee: { label: "Envoyee", variant: "secondary" },
  confirmee: { label: "Confirmee", variant: "default" },
  livree: { label: "Livree", variant: "default" },
  annulee: { label: "Annulee", variant: "destructive" },
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-TN", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function ApprovisionnementView() {
  const { currentTenant } = useTenant()
  const [selectedTab, setSelectedTab] = useState("orders")
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [localOrders, setLocalOrders] = useState<PurchaseOrder[]>([])

  const suppliers = getSuppliers(currentTenant.id)
  const mockOrders = getPurchaseOrders(currentTenant.id)
  const purchaseOrders = [...mockOrders, ...localOrders]
  const priceHistory = getPriceHistory(currentTenant.id)
  const bestPrices = getBestPricesByProduct(currentTenant.id)

  const activeSuppliers = suppliers.filter((s) => s.status === "actif").length
  const pendingOrders = purchaseOrders.filter((o) => o.status !== "livree" && o.status !== "annulee").length
  const totalPending = purchaseOrders
    .filter((o) => o.status !== "livree" && o.status !== "annulee")
    .reduce((sum, o) => sum + o.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approvisionnement</h1>
          <p className="text-muted-foreground">
            Gerez vos fournisseurs et commandes d{"'"}achat
          </p>
        </div>
        <Button onClick={() => setNewOrderOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle commande
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fournisseurs actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSuppliers}</div>
            <p className="text-xs text-muted-foreground">sur {suppliers.length} au total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commandes en cours</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground">en attente de livraison</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Montant en cours</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPending.toFixed(0)} TND</div>
            <p className="text-xs text-muted-foreground">commandes non livrees</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produits suivis</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bestPrices.length}</div>
            <p className="text-xs text-muted-foreground">{priceHistory.length} prix enregistres</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="orders">
            <FileText className="mr-2 h-4 w-4" />
            Commandes Achat
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <Users className="mr-2 h-4 w-4" />
            Fournisseurs
          </TabsTrigger>
          <TabsTrigger value="bestprices">
            <Trophy className="mr-2 h-4 w-4" />
            Meilleurs Prix
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Historique Prix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Articles</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Livraison prevue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((order) => {
                    const config = statusConfig[order.status]
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id.toUpperCase()}</TableCell>
                        <TableCell>{order.supplierName}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {order.items.map((item, i) => (
                              <span key={i} className="text-sm">
                                {item.quantity} {item.unit} {item.name}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{order.total.toFixed(0)} TND</TableCell>
                        <TableCell>
                          <Badge
                            variant={config.variant}
                            className={order.status === "livree" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : ""}
                          >
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {order.expectedDelivery ? formatDate(order.expectedDelivery) : "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier) => (
              <Card key={supplier.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{supplier.name}</CardTitle>
                    <Badge variant={supplier.status === "actif" ? "default" : "secondary"}>
                      {supplier.status === "actif" ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Contact: </span>
                    <span className="font-medium">{supplier.contact}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {supplier.products.map((product) => (
                      <Badge key={product} variant="outline" className="text-[10px]">
                        {product}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bestprices" className="mt-4">
          <BestPricesView
            bestPrices={bestPrices}
            getHistoryForProduct={(name) => getPriceHistoryForProduct(currentTenant.id, name)}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <PriceHistoryTable
            entries={priceHistory}
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          />
        </TabsContent>
      </Tabs>

      <NewPurchaseOrderDrawer
        open={newOrderOpen}
        onOpenChange={setNewOrderOpen}
        suppliers={suppliers}
        tenantId={currentTenant.id}
        onOrderCreated={(order) => setLocalOrders((prev) => [order, ...prev])}
      />
    </div>
  )
}
