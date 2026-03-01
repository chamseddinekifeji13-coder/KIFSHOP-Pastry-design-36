"use client"

import { useState } from "react"
import { Truck, Users, FileText, Phone, Mail, Plus, Loader2, Trophy, History, Receipt } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSuppliers, usePurchaseOrders, useSupplierPrices, usePurchaseInvoices, useRawMaterials, usePackaging, useConsumables } from "@/hooks/use-tenant-data"
import { NewPurchaseOrderDrawer } from "./new-purchase-order-drawer"
import { NewSupplierDrawer } from "./new-supplier-drawer"
import { BestPricesView } from "./best-prices-view"
import { PriceHistoryTable } from "./price-history-table"
import { NewInvoiceDrawer } from "./new-invoice-drawer"
import { PurchaseInvoicesList } from "./purchase-invoices-list"
import { useCallback } from "react"
import { useI18n } from "@/lib/i18n/context"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  "en-attente": { label: "En attente", variant: "outline" },
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
  const { t } = useI18n()
  const [selectedTab, setSelectedTab] = useState("orders")
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [newSupplierOpen, setNewSupplierOpen] = useState(false)
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false)

  const { data: suppliers, isLoading: supLoading, mutate: mutateSuppliers } = useSuppliers()
  const { data: purchaseOrders, isLoading: poLoading, mutate: mutateOrders } = usePurchaseOrders()
  const { data: priceData, isLoading: priceLoading } = useSupplierPrices()
  const { data: invoices, isLoading: invLoading, mutate: mutateInvoices } = usePurchaseInvoices()
  const { data: rawMaterials } = useRawMaterials()
  const { data: packaging } = usePackaging()
  const { data: consumablesList } = useConsumables()

  const getHistoryForProduct = useCallback((rawMaterialName: string) => {
    return (priceData?.entries || []).filter(e => e.rawMaterialName === rawMaterialName)
  }, [priceData])

  const isLoading = supLoading || poLoading
  const allSuppliers = suppliers || []
  const allOrders = purchaseOrders || []

  const allInvoices = invoices || []
  const activeSuppliers = allSuppliers.filter((s) => s.status === "active").length
  const pendingOrders = allOrders.filter((o) => o.status !== "livree" && o.status !== "annulee").length
  const pendingInvoices = allInvoices.filter((i) => i.status === "en-attente").length
  const totalPending = allOrders
    .filter((o) => o.status !== "livree" && o.status !== "annulee")
    .reduce((sum, o) => sum + o.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("supply.title")}</h1>
          <p className="text-muted-foreground">{t("supply.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNewInvoiceOpen(true)}>
            <Receipt className="mr-2 h-4 w-4" />
            Nouvelle facture
          </Button>
          <Button onClick={() => setNewOrderOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("supply.new_order")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("supply.active_suppliers")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
              <><div className="text-2xl font-bold">{activeSuppliers}</div>
              <p className="text-xs text-muted-foreground">sur {allSuppliers.length} au total</p></>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commandes en cours</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
              <><div className="text-2xl font-bold">{pendingOrders}</div>
              <p className="text-xs text-muted-foreground">en attente de livraison</p></>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Montant en cours</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
              <><div className="text-2xl font-bold">{totalPending.toFixed(0)} TND</div>
              <p className="text-xs text-muted-foreground">commandes non livrees</p></>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Factures en attente</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {invLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
              <><div className="text-2xl font-bold">{pendingInvoices}</div>
              <p className="text-xs text-muted-foreground">a valider par le magasin</p></>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="orders"><FileText className="mr-2 h-4 w-4" />Commandes Achat</TabsTrigger>
          <TabsTrigger value="invoices"><Receipt className="mr-2 h-4 w-4" />Factures{pendingInvoices > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{pendingInvoices}</Badge>}</TabsTrigger>
          <TabsTrigger value="suppliers"><Users className="mr-2 h-4 w-4" />Fournisseurs</TabsTrigger>
          <TabsTrigger value="best-prices"><Trophy className="mr-2 h-4 w-4" />Meilleurs Prix</TabsTrigger>
          <TabsTrigger value="price-history"><History className="mr-2 h-4 w-4" />Historique Prix</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          {poLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : allOrders.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Aucune commande d{"'"}achat</p>
              <p className="text-xs text-muted-foreground mt-1">Creez votre premiere commande</p>
              <Button className="mt-4" onClick={() => setNewOrderOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouvelle commande</Button>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Articles</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allOrders.map((order) => {
                    const config = statusConfig[order.status] || { label: order.status, variant: "outline" as const }
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.supplierName}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {order.items.map((item, i) => (
                              <span key={i} className="text-sm">{item.quantity} {item.unit} {item.name}</span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{order.total.toFixed(0)} TND</TableCell>
                        <TableCell><Badge variant={config.variant} className={order.status === "livree" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : ""}>{config.label}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          {invLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <PurchaseInvoicesList
              invoices={allInvoices}
              onRefresh={() => { mutateInvoices(); }}
            />
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setNewSupplierOpen(true)} variant="outline"><Plus className="mr-2 h-4 w-4" />Ajouter un fournisseur</Button>
          </div>
          {supLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : allSuppliers.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Aucun fournisseur</p>
              <p className="text-xs text-muted-foreground mt-1">Ajoutez votre premier fournisseur</p>
              <Button className="mt-4" onClick={() => setNewSupplierOpen(true)}><Plus className="mr-2 h-4 w-4" />Ajouter un fournisseur</Button>
            </CardContent></Card>
          ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {allSuppliers.map((supplier) => (
                <Card key={supplier.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{supplier.name}</CardTitle>
                      <Badge variant={supplier.status === "active" ? "default" : "secondary"}>{supplier.status === "active" ? "Actif" : "Inactif"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {supplier.contactName && (<div className="text-sm"><span className="text-muted-foreground">Contact: </span><span className="font-medium">{supplier.contactName}</span></div>)}
                    {supplier.phone && (<div className="flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span>{supplier.phone}</span></div>)}
                    {supplier.email && (<div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{supplier.email}</span></div>)}
                    {supplier.products.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {supplier.products.map((product) => (<Badge key={product} variant="outline" className="text-[10px]">{product}</Badge>))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="best-prices" className="mt-4">
          {priceLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (priceData?.bestPrices || []).length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-16">
              <Trophy className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Aucune donnee de prix</p>
              <p className="text-xs text-muted-foreground mt-1">Les prix seront disponibles apres vos premieres commandes d{"'"}achat</p>
            </CardContent></Card>
          ) : (
            <BestPricesView
              bestPrices={priceData!.bestPrices}
              getHistoryForProduct={getHistoryForProduct}
            />
          )}
        </TabsContent>

        <TabsContent value="price-history" className="mt-4">
          {priceLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (priceData?.entries || []).length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-16">
              <History className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Aucun historique de prix</p>
              <p className="text-xs text-muted-foreground mt-1">{"L'historique se remplit automatiquement avec vos commandes d'achat"}</p>
            </CardContent></Card>
          ) : (
            <PriceHistoryTable
              entries={priceData!.entries}
              suppliers={allSuppliers.map(s => ({ id: s.id, name: s.name }))}
            />
          )}
        </TabsContent>
      </Tabs>

      <NewPurchaseOrderDrawer open={newOrderOpen} onOpenChange={setNewOrderOpen} suppliers={allSuppliers} onSuccess={() => mutateOrders()} />
      <NewSupplierDrawer open={newSupplierOpen} onOpenChange={setNewSupplierOpen} onSuccess={() => mutateSuppliers()} />
      <NewInvoiceDrawer
        open={newInvoiceOpen}
        onOpenChange={setNewInvoiceOpen}
        suppliers={allSuppliers}
        rawMaterials={rawMaterials || []}
        packaging={packaging || []}
        consumables={consumablesList || []}
        onSuccess={() => mutateInvoices()}
      />
    </div>
  )
}
