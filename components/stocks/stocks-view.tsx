"use client"

import { useState } from "react"
import { Package, Box, Gift, Plus, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { RawMaterialsTable } from "./raw-materials-table"
import { FinishedProductsTable } from "./finished-products-table"
import { StockMovementDrawer } from "./stock-movement-drawer"
import { NewProductDrawer } from "./new-product-drawer"
import { useRawMaterials, useFinishedProducts } from "@/hooks/use-tenant-data"

export function StocksView() {
  const [selectedTab, setSelectedTab] = useState("raw")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newProductOpen, setNewProductOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; type: "raw" | "finished" } | null>(null)

  const { data: rawMaterials, isLoading: rmLoading, mutate: mutateRM } = useRawMaterials()
  const { data: finishedProducts, isLoading: fpLoading, mutate: mutateFP } = useFinishedProducts()

  const handleItemClick = (id: string, name: string, type: "raw" | "finished") => {
    setSelectedItem({ id, name, type })
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
          <Button variant="outline" onClick={() => setNewProductOpen(true)} className="bg-transparent">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau produit fini
          </Button>
          <Button onClick={() => { setSelectedItem(null); setDrawerOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Mouvement stock
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="raw" className="gap-2"><Package className="h-4 w-4" /><span className="hidden sm:inline">Matieres Premieres</span><span className="sm:hidden">MP</span></TabsTrigger>
          <TabsTrigger value="finished" className="gap-2"><Box className="h-4 w-4" /><span className="hidden sm:inline">Produits Finis</span><span className="sm:hidden">PF</span></TabsTrigger>
          <TabsTrigger value="packaging" className="gap-2"><Gift className="h-4 w-4" /><span className="hidden sm:inline">Emballages</span><span className="sm:hidden">Emb.</span></TabsTrigger>
        </TabsList>

        <TabsContent value="raw" className="mt-6">
          {rmLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <RawMaterialsTable materials={rawMaterials || []} onItemClick={(id, name) => handleItemClick(id, name, "raw")} />
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
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Gift className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Emballages</h3>
            <p className="text-sm text-muted-foreground">Gerez vos boites, plateaux et emballages ici</p>
          </div>
        </TabsContent>
      </Tabs>

      <StockMovementDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedItem} onSuccess={() => { mutateRM(); mutateFP() }} />
      <NewProductDrawer open={newProductOpen} onOpenChange={setNewProductOpen} onSuccess={() => { mutateRM(); mutateFP() }} />
    </div>
  )
}
