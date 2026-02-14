"use client"

import { useState, useEffect } from "react"
import { Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CatalogProduct } from "@/lib/mock-data"
import { toast } from "sonner"

interface ProductEditDrawerProps {
  product: CatalogProduct | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductEditDrawer({ product, open, onOpenChange }: ProductEditDrawerProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [unit, setUnit] = useState("")
  const [minOrder, setMinOrder] = useState("")
  const [weight, setWeight] = useState("")
  const [category, setCategory] = useState("")
  const [isPublished, setIsPublished] = useState(false)
  const [tags, setTags] = useState("")

  const isAddMode = !product

  useEffect(() => {
    if (product) {
      setName(product.name)
      setDescription(product.description)
      setPrice(product.price.toString())
      setUnit(product.unit)
      setMinOrder(product.minOrder.toString())
      setWeight(product.weight || "")
      setCategory(product.category)
      setIsPublished(product.isPublished)
      setTags(product.tags.join(", "))
    } else {
      setName("")
      setDescription("")
      setPrice("")
      setUnit("piece")
      setMinOrder("1")
      setWeight("")
      setCategory("")
      setIsPublished(false)
      setTags("")
    }
  }, [product])

  const handleSubmit = () => {
    if (!name.trim() || !price) {
      toast.error("Nom et prix sont obligatoires")
      return
    }
    toast.success(isAddMode ? "Produit ajoute" : "Produit mis a jour", { description: name })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isAddMode ? "Ajouter un produit" : "Modifier le produit"}</SheetTitle>
          <SheetDescription>{isAddMode ? "Remplir les informations du nouveau produit" : "Modifier les informations du produit catalogue"}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nom du produit *</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Prix (TND) *</Label>
              <Input id="edit-price" type="number" step="0.1" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Unite</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="plateau">Plateau</SelectItem>
                  <SelectItem value="piece">Piece</SelectItem>
                  <SelectItem value="pot">Pot</SelectItem>
                  <SelectItem value="coffret">Coffret</SelectItem>
                  <SelectItem value="boite">Boite</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-min">Commande minimum</Label>
              <Input id="edit-min" type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-weight">Poids</Label>
              <Input id="edit-weight" placeholder="Ex: 500g" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-category">Categorie</Label>
            <Input id="edit-category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags (separes par des virgules)</Label>
            <Input id="edit-tags" placeholder="populaire, amandes, ..." value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            <div>
              <p className="text-sm font-medium">{isPublished ? "Publie en ligne" : "Masque"}</p>
              <p className="text-xs text-muted-foreground">
                {isPublished ? "Les clients peuvent voir et commander ce produit" : "Ce produit n'est pas visible sur la boutique"}
              </p>
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
            <X className="mr-2 h-4 w-4" />
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
