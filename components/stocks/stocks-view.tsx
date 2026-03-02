"use client"

import { useState } from "react"
import { Package, Box, Gift, Warehouse, Plus, Loader2, Download, Printer, Search, X, Wrench, Truck } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RawMaterialsTable } from "./raw-materials-table"
import { FinishedProductsTable } from "./finished-products-table"
import { PackagingTable } from "./packaging-table"
import { ConsumablesTable } from "./consumables-table"
import { NewConsumableDrawer } from "./new-consumable-drawer"
import { StockMovementDrawer } from "./stock-movement-drawer"
import { NewProductDrawer } from "./new-product-drawer"
import { NewPackagingDrawer } from "./new-packaging-drawer"
import { NewRawMaterialDrawer } from "./new-raw-material-drawer"
import { StorageLocationsTable } from "./storage-locations-table"
import { StockHistoryChart } from "./stock-history-chart"
import { useRawMaterials, useFinishedProducts, usePackaging, useConsumables, useStorageLocations, useDeliveryNotes } from "@/hooks/use-tenant-data"
import { DeliveryNotesList } from "@/components/approvisionnement/delivery-notes-list"
import { useI18n } from "@/lib/i18n/context"
import { useTenant } from "@/lib/tenant-context"
import { exportStocksToCSV, getPrintableStocksReport } from "@/lib/stocks/actions"
import { exportToCSV, printReport } from "@/lib/csv-export"
import { toast } from "sonner"

export function StocksView() {
  const { t } = useI18n()
  const { currentTenant } = useTenant()
  const [selectedTab, setSelectedTab] = useState("raw")
  const [searchQuery, setSearchQuery] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newProductOpen, setNewProductOpen] = useState(false)
  const [newPackagingOpen, setNewPackagingOpen] = useState(false)
  const [newRawMaterialOpen, setNewRawMaterialOpen] = useState(false)
  const [newConsumableOpen, setNewConsumableOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; type: "raw" | "finished" | "packaging"; unit?: string } | null>(null)
  const [chartMaterial, setChartMaterial] = useState<{ id: string; name: string; unit?: string } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const { data: rawMaterials, isLoading: rmLoading, mutate: mutateRM } = useRawMaterials()
  const { data: finishedProducts, isLoading: fpLoading, mutate: mutateFP } = useFinishedProducts()
  const { data: packaging, isLoading: pkgLoading, mutate: mutatePkg } = usePackaging()
  const { data: consumables, isLoading: consLoading, mutate: mutateCons } = useConsumables()
  const { data: storageLocations } = useStorageLocations()
  const { data: deliveryNotes, isLoading: dnLoading, mutate: mutateDN } = useDeliveryNotes()

  const pendingBLCount = (deliveryNotes || []).filter((n) => n.status === "en-attente").length

  const query = searchQuery.toLowerCase().trim()

  const filteredRawMaterials = (rawMaterials || []).filter((m) =>
    !query || m.name.toLowerCase().includes(query) || (m.unit || "").toLowerCase().includes(query)
  )

  const filteredFinishedProducts = (finishedProducts || []).filter((p) =>
    !query || p.name.toLowerCase().includes(query) || (p.unit || "").toLowerCase().includes(query)
  )

  const filteredPackaging = (packaging || []).filter((p) =>
    !query || p.name.toLowerCase().includes(query) || (p.type || "").toLowerCase().includes(query) || (p.description || "").toLowerCase().includes(query)
  )

  const filteredConsumables = (consumables || []).filter((c) =>
    !query || c.name.toLowerCase().includes(query) || (c.category || "").toLowerCase().includes(query) || (c.description || "").toLowerCase().includes(query)
  )

  const handleItemClick = (id: string, name: string, type: "raw" | "finished" | "packaging", unit?: string) => {
    setSelectedItem({ id, name, type, unit })
    setDrawerOpen(true)
    // Also show chart for raw materials
    if (type === "raw") {
      setChartMaterial({ id, name, unit })
    }
  }

  const handleExportStocks = async () => {
    setIsExporting(true)
    try {
      const { headers, data } = await exportStocksToCSV(currentTenant.id)
      exportToCSV({ filename: "stocks", headers, data })
      toast.success("Stocks exportés avec succès")
    } catch (error) {
      console.error("Error exporting stocks:", error)
      toast.error("Erreur lors de l'export des stocks")
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrintStocks = async () => {
    setIsPrinting(true)
    try {
      console.log("[v0] Starting print report for tenant:", currentTenant.id)
      const report = await getPrintableStocksReport(currentTenant.id)
      console.log("[v0] Report generated:", report)
      printReport(report)
      toast.success("Rapport d'impression généré")
    } catch (error) {
      console.error("[v0] Error printing stocks:", error)
      toast.error(`Erreur lors de la génération du rapport: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("stocks.title")}</h1>
          <p className="text-muted-foreground">{t("stocks.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrintStocks}
            disabled={isPrinting}
            className="bg-transparent"
          >
            {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Imprimer
          </Button>
          <Button
            variant="outline"
            onClick={handleExportStocks}
            disabled={isExporting}
            className="bg-transparent"
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export CSV
          </Button>
          {selectedTab === "raw" && (
            <Button variant="outline" onClick={() => setNewRawMaterialOpen(true)} className="bg-transparent">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle MP
            </Button>
          )}
          {selectedTab === "finished" && (
            <Button variant="outline" onClick={() => setNewProductOpen(true)} className="bg-transparent">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau PF
            </Button>
          )}
          {selectedTab === "packaging" && (
            <Button variant="outline" onClick={() => setNewPackagingOpen(true)} className="bg-transparent">
              <Plus className="mr-2 h-4 w-4" />
              Nouvel emballage
            </Button>
          )}
          {selectedTab === "consumables" && (
            <Button variant="outline" onClick={() => setNewConsumableOpen(true)} className="bg-transparent">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau consommable
            </Button>
          )}
          {selectedTab !== "reserves" && (
            <Button onClick={() => { setSelectedItem(null); setDrawerOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Mouvement stock
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans le stock..."
          className="pl-9 pr-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Effacer la recherche</span>
          </button>
        )}
      </div>

      {query && (
        <p className="text-sm text-muted-foreground">
          {filteredRawMaterials.length + filteredFinishedProducts.length + filteredPackaging.length + filteredConsumables.length} resultat(s) pour &quot;{searchQuery}&quot;
        </p>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
          <TabsList className="w-max">
            <TabsTrigger value="raw" className="!flex-none gap-1.5">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">{t("stocks.raw_materials")}</span><span className="sm:hidden">MP</span>
              {query && <span className="text-xs opacity-70">({filteredRawMaterials.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="finished" className="!flex-none gap-1.5">
              <Box className="h-4 w-4" />
              <span className="hidden sm:inline">{t("stocks.finished_products")}</span><span className="sm:hidden">PF</span>
              {query && <span className="text-xs opacity-70">({filteredFinishedProducts.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="packaging" className="!flex-none gap-1.5">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Emballages</span><span className="sm:hidden">Emb.</span>
              {query && <span className="text-xs opacity-70">({filteredPackaging.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="consumables" className="!flex-none gap-1.5">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Consommables</span><span className="sm:hidden">Cons.</span>
              {query && <span className="text-xs opacity-70">({filteredConsumables.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="reserves" className="!flex-none gap-1.5"><Warehouse className="h-4 w-4" /><span className="hidden sm:inline">Reserves</span><span className="sm:hidden">Res.</span></TabsTrigger>
            <TabsTrigger value="reception-bl" className="!flex-none gap-1.5 relative">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Reception BL</span><span className="sm:hidden">BL</span>
              {pendingBLCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
                  {pendingBLCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="raw" className="mt-6 space-y-6">
          {chartMaterial && (
            <StockHistoryChart
              materialId={chartMaterial.id}
              materialName={chartMaterial.name}
              unit={chartMaterial.unit}
              onClose={() => setChartMaterial(null)}
            />
          )}
          {rmLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <RawMaterialsTable
              materials={filteredRawMaterials}
              storageLocations={storageLocations || []}
              onItemClick={(id, name, unit) => {
                handleItemClick(id, name, "raw", unit)
                setChartMaterial({ id, name, unit })
              }}
              onAdd={() => setNewRawMaterialOpen(true)}
            />
          )}
        </TabsContent>

        <TabsContent value="finished" className="mt-6">
          {fpLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <FinishedProductsTable 
              products={filteredFinishedProducts} 
              onItemClick={(id, name) => handleItemClick(id, name, "finished")}
            />
          )}
        </TabsContent>

        <TabsContent value="packaging" className="mt-6">
          {pkgLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredPackaging.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {query ? (
                <>
                  <Search className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">Aucun resultat</h3>
                  <p className="text-sm text-muted-foreground mt-1">{"Aucun emballage ne correspond a \""}{searchQuery}{"\""}</p>
                  <Button variant="outline" className="mt-4" onClick={() => setSearchQuery("")}>
                    Effacer la recherche
                  </Button>
                </>
              ) : (
                <>
                  <Gift className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">Aucun emballage</h3>
                  <p className="text-sm text-muted-foreground mt-1">Ajoutez vos boites, plateaux et sachets</p>
                  <Button className="mt-4 bg-[#D4A373] hover:bg-[#c4956a] text-white" onClick={() => setNewPackagingOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un emballage
                  </Button>
                </>
              )}
            </div>
          ) : (
            <PackagingTable 
              items={filteredPackaging} 
              onItemClick={(id, name) => handleItemClick(id, name, "packaging")}
            />
          )}
        </TabsContent>

        <TabsContent value="consumables" className="mt-6">
          {consLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredConsumables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {query ? (
                <>
                  <Search className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">Aucun resultat</h3>
                  <p className="text-sm text-muted-foreground mt-1">{"Aucun consommable ne correspond a \""}{searchQuery}{"\""}</p>
                  <Button variant="outline" className="mt-4" onClick={() => setSearchQuery("")}>
                    Effacer la recherche
                  </Button>
                </>
              ) : (
                <>
                  <Wrench className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">Aucun consommable</h3>
                  <p className="text-sm text-muted-foreground mt-1">Ajoutez vos produits de nettoyage, fournitures, etc.</p>
                  <Button className="mt-4 bg-blue-500 hover:bg-blue-600 text-white" onClick={() => setNewConsumableOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un consommable
                  </Button>
                </>
              )}
            </div>
          ) : (
            <ConsumablesTable
              items={filteredConsumables}
              onItemClick={(id, name) => handleItemClick(id, name, "raw")}
            />
          )}
        </TabsContent>

        <TabsContent value="reserves" className="mt-6">
          <StorageLocationsTable />
        </TabsContent>

        <TabsContent value="reception-bl" className="mt-6">
          {dnLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <DeliveryNotesList
              deliveryNotes={deliveryNotes || []}
              canValidate={true}
              onRefresh={() => {
                mutateDN()
                mutateRM()
                mutatePkg()
                mutateCons()
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      <StockMovementDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedItem} />
      <NewProductDrawer open={newProductOpen} onOpenChange={setNewProductOpen} onSuccess={() => { mutateRM(); mutateFP() }} />
      <NewPackagingDrawer open={newPackagingOpen} onOpenChange={setNewPackagingOpen} onSuccess={() => mutatePkg()} />
      <NewRawMaterialDrawer open={newRawMaterialOpen} onOpenChange={setNewRawMaterialOpen} onSuccess={() => mutateRM()} />
      <NewConsumableDrawer open={newConsumableOpen} onOpenChange={setNewConsumableOpen} onSuccess={() => mutateCons()} />
    </div>
  )
}
