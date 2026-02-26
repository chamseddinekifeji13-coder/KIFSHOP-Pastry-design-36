"use client"

import { useState } from "react"
import { Pencil, Loader2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { updateRawMaterial, updateFinishedProduct, updatePackaging } from "@/lib/stocks/actions"
import { toast } from "sonner"

interface EditArticleDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  article: {
    id: string
    name: string
    type: "raw" | "finished" | "packaging"
    unit?: string
    currentStock?: number
    minStock?: number
    pricePerUnit?: number
  } | null
  onSuccess?: () => void
}

export function EditArticleDrawer({ open, onOpenChange, article, onSuccess }: EditArticleDrawerProps) {
  const [name, setName] = useState(article?.name || "")
  const [unit, setUnit] = useState(article?.unit || "")
  const [minStock, setMinStock] = useState(article?.minStock?.toString() || "")
  const [price, setPrice] = useState(article?.pricePerUnit?.toString() || "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Le nom de l'article est requis")
      return
    }

    setSaving(true)
    try {
      let success = false

      if (article?.type === "raw") {
        success = await updateRawMaterial(article.id, {
          name: name.trim(),
          unit: unit || article.unit,
          minStock: minStock ? Number(minStock) : undefined,
          pricePerUnit: price ? Number(price) : undefined,
        })
      } else if (article?.type === "finished") {
        success = await updateFinishedProduct(article.id, {
          name: name.trim(),
          minStock: minStock ? Number(minStock) : undefined,
          sellingPrice: price ? Number(price) : undefined,
        })
      } else if (article?.type === "packaging") {
        success = await updatePackaging(article.id, {
          name: name.trim(),
          unit: unit || article.unit,
          minStock: minStock ? Number(minStock) : undefined,
          pricePerUnit: price ? Number(price) : undefined,
        })
      }

      if (success) {
        toast.success("Article modifié avec succès")
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast.error("Erreur lors de la modification")
      }
    } catch (error) {
      console.error("Error updating article:", error)
      toast.error("Erreur lors de la modification")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            <SheetTitle>Modifier l'article</SheetTitle>
          </div>
          <SheetDescription>Mettez à jour les informations de l'article</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="article-name" className="text-sm font-medium">
              Nom de l'article
            </Label>
            <Input
              id="article-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Farine T65"
              className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Unité */}
          <div className="space-y-2">
            <Label htmlFor="article-unit" className="text-sm font-medium">
              Unité
            </Label>
            <Input
              id="article-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Ex: kg, L, pcs"
              className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Stock minimum */}
          <div className="space-y-2">
            <Label htmlFor="article-min-stock" className="text-sm font-medium">
              Stock minimum
            </Label>
            <Input
              id="article-min-stock"
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="Ex: 10"
              className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Prix */}
          <div className="space-y-2">
            <Label htmlFor="article-price" className="text-sm font-medium">
              Prix unitaire (TND)
            </Label>
            <Input
              id="article-price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ex: 2.50"
              className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 bg-transparent rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="mr-2 h-4 w-4" />
            Annuler
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90 rounded-xl"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
