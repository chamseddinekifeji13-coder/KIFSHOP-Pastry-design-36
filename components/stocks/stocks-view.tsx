"use client"

import { useState } from "react"
import { Package, Box, Gift, Warehouse, Plus, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { RawMaterialsTable } from "./raw-materials-table"
import { FinishedProductsTable } from "./finished-products-table"
import { PackagingTable } from "./packaging-table"
import { StockMovementDrawer } from "./stock-movement-drawer"
import { NewProductDrawer } from "./new-product-drawer"
import { NewPackagingDrawer } from "./new-packaging-drawer"
import { NewRawMaterialDrawer } from "./new-raw-material-drawer"
import { StorageLocationsTable } from "./storage-locations-table"
import { useRawMaterials, useFinishedProducts, usePackaging } from "@/hooks/use-tenant-data"

export function StocksView() {
  const [selectedTab, setSelectedTab] = useState("raw")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newProductOpen, setNewProductOpen] = useState(false)
  const [newPackagingOpen, setNewPackagingOpen] = useState(false)
  const [newRawMaterialOpen, setNewRawMaterialOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; type: "raw" | "finished" | "packaging"; unit?: string } | null>(null)

  const { data: rawMaterials, isLoading: rmLoading, mutate: mutateRM } = useRawMaterials()
  const { data: finishedProducts, isLoading: fpLoading, mutate: mutateFP } = useFinishedProducts()
  const { data: packaging, isLoading: pkgLoading, mutate: mutatePkg } = usePackaging()

  const handleItemClick = (id: string, name: string, type: "raw" | "finished" | "packaging", unit?: string) => {
    setSelectedItem({ id, name, type, unit })
    setDrawerOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion des Stocks</h1>
          <p className="text-muted-foreground">Gerez vos matieres premieres, produits finis et emballages</p>
        </div>
        <div className="flex gap-2">
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
          {selectedTab !== "reserves" && (
            <Button onClick={() => { setSelectedItem(null); setDrawerOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Mouvement stock
            </Button>
          )}
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="raw" className="gap-2"><Package className="h-4 w-4" /><span className="hidden sm:inline">Matieres Premieres</span><span className="sm:hidden">MP</span></TabsTrigger>
          <TabsTrigger value="finished" className="gap-2"><Box className="h-4 w-4" /><span className="hidden sm:inline">Produits Finis</span><span className="sm:hidden">PF</span></TabsTrigger>
          <TabsTrigger value="packaging" className="gap-2"><Gift className="h-4 w-4" /><span className="hidden sm:inline">Emballages</span><span className="sm:hidden">Emb.</span></TabsTrigger>
          <TabsTrigger value="reserves" className="gap-2"><Warehouse className="h-4 w-4" /><span className="hidden sm:inline">Reserves</span><span className="sm:hidden">Res.</span></TabsTrigger>
        </TabsList>

        <TabsContent value="raw" className="mt-6">
          {rmLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <RawMaterialsTable materials={rawMaterials || []} onItemClick={(id, name) => handleItemClick(id, name, "raw")} onAdd={() => setNewRawMaterialOpen(true)} />
          )}
        </TabsContent>

        <TabsContent value="finished" className="mt-6">
          {fpLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <FinishedProductsTable products={finishedProducts || []} onItemClick={(id, name) => handleItemClick(id, name, "finished")} />
          )}
        </TabsContent>

        <TabsContent value="packaging" className="mt-6">
          {pkgLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (packaging || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Gift className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Aucun emballage</h3>
              <p className="text-sm text-muted-foreground mt-1">Ajoutez vos boites, plateaux et sachets</p>
              <Button className="mt-4 bg-[#D4A373] hover:bg-[#c4956a] text-white" onClick={() => setNewPackagingOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un emballage
              </Button>
            </div>
          ) : (
            <PackagingTable items={packaging || []} onItemClick={(id, name) => handleItemClick(id, name, "packaging")} />
          )}
        </TabsContent>

        <TabsContent value="reserves" className="mt-6">
          <StorageLocationsTable />
        </TabsContent>
      </Tabs>

      <StockMovementDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedItem} />
      <NewProductDrawer open={newProductOpen} onOpenChange={setNewProductOpen} onSuccess={() => { mutateRM(); mutateFP() }} />
      <NewPackagingDrawer open={newPackagingOpen} onOpenChange={setNewPackagingOpen} onSuccess={() => mutatePkg()} />
      <NewRawMaterialDrawer open={newRawMaterialOpen} onOpenChange={setNewRawMaterialOpen} onSuccess={() => mutateRM()} />
    </div>
  )
}
