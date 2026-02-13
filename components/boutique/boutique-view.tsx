"use client"

import { useState } from "react"
import { Eye, EyeOff, Pencil, Plus, Link2, Share2, ShoppingBag, TrendingUp } from "lucide-react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTenant } from "@/lib/tenant-context"
import { useOrders } from "@/lib/order-context"
import { getCatalog, type CatalogProduct } from "@/lib/mock-data"
import { toast } from "sonner"
import { ProductEditDrawer } from "./product-edit-drawer"

export function BoutiqueView() {
  const { currentTenant } = useTenant()
  const { orders } = useOrders()
  const catalog = getCatalog(currentTenant.id)

  const [editProduct, setEditProduct] = useState<CatalogProduct | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const publishedCount = catalog.filter(p => p.isPublished).length
  const onlineOrders = orders.filter(o => o.source === "web" || o.source === "whatsapp" || o.source === "messenger" || o.source === "instagram")
  const onlineRevenue = onlineOrders.reduce((sum, o) => sum + o.total, 0)

  const handleTogglePublish = (product: CatalogProduct) => {
    toast.success(product.isPublished ? "Produit masque" : "Produit publie", {
      description: product.name,
    })
  }

  const handleEdit = (product: CatalogProduct) => {
    setEditProduct(product)
    setEditOpen(true)
  }

  const handleShareCatalog = () => {
    const url = `kifshop.tn/${currentTenant.id}`
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Lien copie dans le presse-papier", { description: url })
    }).catch(() => {
      toast.success("Lien du catalogue", { description: url })
    })
  }

  const categories = Array.from(new Set(catalog.map(p => p.category)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">E-Boutique</h1>
          <p className="text-muted-foreground">
            Gerez votre catalogue produits en ligne
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-transparent" onClick={handleShareCatalog}>
            <Share2 className="mr-2 h-4 w-4" />
            Partager le catalogue
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un produit
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{publishedCount}/{catalog.length}</p>
                <p className="text-xs text-muted-foreground">Produits publies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/30">
                <TrendingUp className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onlineOrders.length}</p>
                <p className="text-xs text-muted-foreground">Commandes en ligne</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10">
                <Link2 className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onlineRevenue.toLocaleString("fr-TN")} TND</p>
                <p className="text-xs text-muted-foreground">CA ventes en ligne</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Catalog URL */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Link2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Lien du catalogue public</p>
                <p className="text-xs text-muted-foreground font-mono">kifshop.tn/{currentTenant.id}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-transparent" onClick={handleShareCatalog}>
                Copier le lien
              </Button>
              <Button variant="outline" size="sm" className="bg-transparent">
                Voir la boutique
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Tous ({catalog.length})</TabsTrigger>
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat}>
              {cat} ({catalog.filter(p => p.category === cat).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {["all", ...categories].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalog
                .filter(p => tab === "all" || p.category === tab)
                .map(product => (
                  <Card key={product.id} className="overflow-hidden">
                    <div className="relative aspect-[4/3] bg-muted">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                        crossOrigin="anonymous"
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        {product.isPublished ? (
                          <Badge className="bg-primary text-primary-foreground">Publie</Badge>
                        ) : (
                          <Badge variant="secondary">Masque</Badge>
                        )}
                      </div>
                      {product.tags.includes("populaire") && (
                        <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground">Populaire</Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-sm">{product.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          <span className="text-lg font-bold">{product.price.toLocaleString("fr-TN")} TND</span>
                          <span className="text-xs text-muted-foreground ml-1">/ {product.unit}</span>
                        </div>
                        {product.weight && (
                          <Badge variant="outline">{product.weight}</Badge>
                        )}
                      </div>
                      {product.minOrder > 1 && (
                        <p className="text-xs text-muted-foreground mt-1">Min. {product.minOrder} {product.unit}s</p>
                      )}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={product.isPublished}
                            onCheckedChange={() => handleTogglePublish(product)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {product.isPublished ? "En ligne" : "Masque"}
                          </span>
                        </div>
                        <Button variant="outline" size="sm" className="bg-transparent" onClick={() => handleEdit(product)}>
                          <Pencil className="mr-1 h-3 w-3" />
                          Modifier
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <ProductEditDrawer
        product={editProduct}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  )
}
