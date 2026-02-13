"use client"

import { useState } from "react"
import { Save, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTenant } from "@/lib/tenant-context"
import { useStock } from "@/lib/stock-context"
import { toast } from "sonner"

interface NewInventoryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CountItem {
  id: string
  name: string
  type: "mp" | "pf"
  theoreticalQty: number
  physicalQty: string
  unit: string
  note: string
}

interface NewProduct {
  name: string
  type: "mp" | "pf"
  unit: string
  physicalQty: string
}

const defaultNewProduct: NewProduct = {
  name: "",
  type: "mp",
  unit: "kg",
  physicalQty: "",
}

export function NewInventoryDrawer({ open, onOpenChange }: NewInventoryDrawerProps) {
  const { currentTenant } = useTenant()
  const { rawMaterials, finishedProducts } = useStock()
  
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [newProduct, setNewProduct] = useState<NewProduct>(defaultNewProduct)
  const [activeTab, setActiveTab] = useState<"mp" | "pf">("mp")
  
  const [counts, setCounts] = useState<CountItem[]>(() => [
    ...rawMaterials.map(m => ({
      id: m.id,
      name: m.name,
      type: "mp" as const,
      theoreticalQty: m.quantity,
      physicalQty: "",
      unit: m.unit,
      note: ""
    })),
    ...finishedProducts.map(p => ({
      id: p.id,
      name: p.name,
      type: "pf" as const,
      theoreticalQty: p.quantity,
      physicalQty: "",
      unit: p.unit,
      note: ""
    }))
  ])

  const updateCount = (id: string, field: "physicalQty" | "note", value: string) => {
    setCounts(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const getDiscrepancy = (item: CountItem) => {
    if (!item.physicalQty) return null
    const physical = parseFloat(item.physicalQty)
    if (isNaN(physical)) return null
    return physical - item.theoreticalQty
  }

  const handleSubmit = () => {
    const filledCounts = counts.filter(c => c.physicalQty !== "")
    if (filledCounts.length === 0) {
      toast.error("Veuillez saisir au moins un comptage")
      return
    }

    const discrepancies = filledCounts.filter(c => {
      const disc = getDiscrepancy(c)
      return disc !== null && disc !== 0
    }).length

    toast.success(`Inventaire enregistre: ${filledCounts.length} articles, ${discrepancies} ecart(s)`)
    onOpenChange(false)
    
    // Reset counts
    setCounts(prev => prev.map(item => ({ ...item, physicalQty: "", note: "" })))
  }

  const mpItems = counts.filter(c => c.type === "mp")
  const pfItems = counts.filter(c => c.type === "pf")

  const handleOpenAddProduct = () => {
    setNewProduct({ ...defaultNewProduct, type: activeTab })
    setAddProductOpen(true)
  }

  const handleAddProduct = () => {
    if (!newProduct.name.trim()) {
      toast.error("Veuillez saisir un nom de produit")
      return
    }
    if (!newProduct.physicalQty) {
      toast.error("Veuillez saisir la quantite comptee")
      return
    }

    const newItem: CountItem = {
      id: `new-${Date.now()}`,
      name: newProduct.name,
      type: newProduct.type,
      theoreticalQty: 0, // Nouveau produit = pas de stock theorique
      physicalQty: newProduct.physicalQty,
      unit: newProduct.unit,
      note: "Nouveau produit ajoute lors de l'inventaire"
    }

    setCounts(prev => [...prev, newItem])
    setAddProductOpen(false)
    setNewProduct(defaultNewProduct)
    toast.success(`${newProduct.type === "mp" ? "Matiere premiere" : "Produit fini"} "${newProduct.name}" ajoute`)
  }

  const renderTable = (items: CountItem[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Article</TableHead>
          <TableHead className="text-right">Theorique</TableHead>
          <TableHead className="text-right">Physique</TableHead>
          <TableHead className="text-right">Ecart</TableHead>
          <TableHead>Note</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const discrepancy = getDiscrepancy(item)
          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                <div>{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.unit}</div>
              </TableCell>
              <TableCell className="text-right">{item.theoreticalQty}</TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  step="0.01"
                  value={item.physicalQty}
                  onChange={(e) => updateCount(item.id, "physicalQty", e.target.value)}
                  className="w-20 text-right"
                  placeholder="-"
                />
              </TableCell>
              <TableCell className="text-right">
                {discrepancy !== null && (
                  <Badge 
                    variant={discrepancy === 0 ? "secondary" : "destructive"}
                    className={discrepancy === 0 ? "" : discrepancy > 0 ? "bg-success text-success-foreground" : ""}
                  >
                    {discrepancy > 0 ? "+" : ""}{discrepancy.toFixed(2)}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Input
                  value={item.note}
                  onChange={(e) => updateCount(item.id, "note", e.target.value)}
                  className="w-32"
                  placeholder="Note..."
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nouvel inventaire</SheetTitle>
          <SheetDescription>
            Saisissez les quantites physiques comptees pour chaque article
          </SheetDescription>
        </SheetHeader>

        <div className="py-6">
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span>Date: <strong>{new Date().toLocaleDateString("fr-FR")}</strong></span>
              <span>Boutique: <strong>{currentTenant.name}</strong></span>
            </div>
          </div>

          <Tabs defaultValue="mp" value={activeTab} onValueChange={(v) => setActiveTab(v as "mp" | "pf")} className="w-full">
            <div className="flex items-center justify-between mb-2">
              <TabsList className="grid w-auto grid-cols-2">
                <TabsTrigger value="mp">
                  MP ({mpItems.length})
                </TabsTrigger>
                <TabsTrigger value="pf">
                  PF ({pfItems.length})
                </TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" onClick={handleOpenAddProduct} className="bg-transparent">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un produit
              </Button>
            </div>
            <TabsContent value="mp" className="mt-4">
              {renderTable(mpItems)}
            </TabsContent>
            <TabsContent value="pf" className="mt-4">
              {renderTable(pfItems)}
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
            <X className="mr-2 h-4 w-4" />
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="mr-2 h-4 w-4" />
            Enregistrer l'inventaire
          </Button>
        </SheetFooter>
      </SheetContent>

      {/* Dialog pour ajouter un nouveau produit */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau produit</DialogTitle>
            <DialogDescription>
              Ce produit sera ajoute a votre inventaire et au catalogue
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="product-name">Nom du produit</Label>
              <Input
                id="product-name"
                value={newProduct.name}
                onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Pistaches, Gateau au chocolat..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="product-type">Type</Label>
                <Select
                  value={newProduct.type}
                  onValueChange={(v) => setNewProduct(prev => ({ ...prev, type: v as "mp" | "pf" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp">Matiere Premiere</SelectItem>
                    <SelectItem value="pf">Produit Fini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="product-unit">Unite</Label>
                <Select
                  value={newProduct.unit}
                  onValueChange={(v) => setNewProduct(prev => ({ ...prev, unit: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilogramme (kg)</SelectItem>
                    <SelectItem value="g">Gramme (g)</SelectItem>
                    <SelectItem value="L">Litre (L)</SelectItem>
                    <SelectItem value="unites">Unites</SelectItem>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="boites">Boites</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-qty">Quantite comptee</Label>
              <Input
                id="product-qty"
                type="number"
                step="0.01"
                value={newProduct.physicalQty}
                onChange={(e) => setNewProduct(prev => ({ ...prev, physicalQty: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProductOpen(false)} className="bg-transparent">
              Annuler
            </Button>
            <Button onClick={handleAddProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}
