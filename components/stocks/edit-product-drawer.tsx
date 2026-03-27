"use client"

import { useState, useEffect } from "react"
import { Save, X, Image as ImageIcon, Loader2, CakeSlice, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { showError, showWarning, showSuccess } from "@/lib/error-messages"
import { useTenant } from "@/lib/tenant-context"
import { useCategories } from "@/hooks/use-tenant-data"
import type { FinishedProduct, Category } from "@/lib/stocks/actions"
import { updateFinishedProduct } from "@/lib/stocks/actions"
import { useSWRConfig } from "swr"

interface EditProductDrawerProps {
  product: FinishedProduct | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: () => void
}

const UNITS = ["plateau", "pièce", "pcs", "boîte", "coffret", "pot", "kg", "g"]

export function EditProductDrawer({ product, open, onOpenChange, onSave }: EditProductDrawerProps) {
  const { currentTenant } = useTenant()
  const { data: categories = [] } = useCategories()
  const { mutate } = useSWRConfig()

  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [unit, setUnit] = useState("")
  const [sellingPrice, setSellingPrice] = useState("")
  const [currentStock, setCurrentStock] = useState("")
  const [minStock, setMinStock] = useState("")
  const [minOrder, setMinOrder] = useState("")
  const [weight, setWeight] = useState("")
  const [description, setDescription] = useState("")
  const [isPublished, setIsPublished] = useState(true)
  const [imageUrl, setImageUrl] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [soldByWeight, setSoldByWeight] = useState(false)

  // Sync form state when product changes
  useEffect(() => {
    if (product && open) {
      setName(product.name || "")
      setCategoryId(product.categoryId || "")
      setUnit(product.unit || "")
      setSellingPrice(product.sellingPrice?.toString() || "")
      setCurrentStock(product.currentStock?.toString() || "")
      setMinStock(product.minStock?.toString() || "")
      setMinOrder(product.minOrder?.toString() || "")
      setWeight(product.weight || "")
      setDescription(product.description || "")
      setIsPublished(product.isPublished ?? true)
      setImageUrl(product.imageUrl || "")
      setImagePreview(product.imageUrl || "")
      setSoldByWeight(product.soldByWeight ?? false)
      setImageFile(null)
    }
  }, [product, open])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      showWarning("Format invalide", "Veuillez selectionner une image (JPG, PNG, etc.)")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showWarning("Fichier trop volumineux", "L'image ne doit pas depasser 5 Mo.")
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const uploadImage = async () => {
    if (!imageFile) return
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", imageFile)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erreur lors de l'upload")
      }
      const data = await res.json()
      setImageUrl(data.url)
      setImageFile(null)
      showSuccess("Image telechargee", "L'image du produit a ete mise a jour.")
    } catch (err) {
      showError(err, "Telechargement image")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (!product) return
    if (!name.trim()) {
      showWarning("Nom requis", "Veuillez saisir le nom du produit.")
      return
    }
    if (!unit) {
      showWarning("Unite requise", "Veuillez selectionner l'unite de mesure.")
      return
    }

    setSaving(true)
    try {
      const success = await updateFinishedProduct(product.id, {
        name: name.trim(),
        categoryId: categoryId || null,
        unit,
        sellingPrice: parseFloat(sellingPrice) || 0,
        currentStock: parseFloat(currentStock) || 0,
        minStock: parseFloat(minStock) || 0,
        weight: weight.trim() || undefined,
        description: description.trim() || undefined,
        isPublished,
        imageUrl: imageUrl || undefined,
        soldByWeight,
      })

      if (!success) throw new Error("Echec de la modification")

      showSuccess("Produit modifie", "Les modifications ont ete enregistrees.")
      mutate((key: string) => typeof key === "string" && key.includes("finished-products"))
      onOpenChange(false)
      onSave?.()
    } catch (err) {
      showError(err, "Modification produit")
    } finally {
      setSaving(false)
    }
  }

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] p-0 flex flex-col gap-0 overflow-y-auto [&>button[data-slot=dialog-close]]:absolute [&>button[data-slot=dialog-close]]:top-4 [&>button[data-slot=dialog-close]]:right-4 [&>button[data-slot=dialog-close]]:text-white [&>button[data-slot=dialog-close]]:opacity-80 [&>button[data-slot=dialog-close]]:hover:opacity-100 [&>button[data-slot=dialog-close]]:z-50">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-6 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/20 backdrop-blur-sm">
              <CakeSlice className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-primary-foreground">
                Modifier le produit
              </DialogTitle>
              <p className="text-xs text-primary-foreground/70 mt-0.5 text-balance">{product.name}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Image */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Photo du produit</Label>
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="edit-image-upload"
                />
                <label
                  htmlFor="edit-image-upload"
                  className="flex items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition"
                >
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <span className="text-xs text-muted-foreground">
                      {imagePreview ? "Changer l'image" : "Sélectionner une image"}
                    </span>
                  </div>
                </label>
              </div>
              {imagePreview && (
                <div className="relative w-20 h-20 shrink-0">
                  <img
                    src={imagePreview}
                    alt="Aperçu du produit"
                    className="w-full h-full object-cover rounded-xl border"
                  />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(""); setImageUrl("") }}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/80"
                    aria-label="Supprimer l'image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            {imageFile && !imageUrl && (
              <Button
                type="button"
                onClick={uploadImage}
                disabled={uploadingImage}
                size="sm"
                className="w-full"
              >
                {uploadingImage ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Envoi en cours...</>
                ) : (
                  <><ImageIcon className="h-4 w-4 mr-2" />Envoyer l'image</>
                )}
              </Button>
            )}
          </div>

          {/* Informations de base */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CakeSlice className="h-3.5 w-3.5" aria-hidden="true" />
              Informations du produit
            </p>

            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-xs font-medium">Nom du produit *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Baklawa aux pistaches"
                className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-unit" className="text-xs font-medium">Unité *</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger id="edit-unit" className="bg-muted/50 border-0">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between h-full">
                  <Label className="text-xs font-medium">Vendu au poids</Label>
                  <Switch checked={soldByWeight} onCheckedChange={setSoldByWeight} />
                </div>
              </div>
            </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit" className="text-xs font-medium">Unité *</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger id="edit-unit" className="bg-muted/50 border-0">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-price" className="text-xs font-medium">Prix de vente (TND)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.001"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0.000"
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-weight" className="text-xs font-medium">Poids / Volume</Label>
                <Input
                  id="edit-weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Ex: 250g"
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-xs font-medium">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le produit..."
                rows={2}
                className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 resize-none"
              />
            </div>
          </div>

          {/* Stock */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Package className="h-3.5 w-3.5" aria-hidden="true" />
              Gestion du stock
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-stock" className="text-xs font-medium">Stock actuel</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  step="0.001"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  placeholder="0"
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-min-stock" className="text-xs font-medium">Stock minimum</Label>
                <Input
                  id="edit-min-stock"
                  type="number"
                  step="0.001"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  placeholder="0"
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-min-order" className="text-xs font-medium">Commande min.</Label>
                <Input
                  id="edit-min-order"
                  type="number"
                  step="1"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  placeholder="1"
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Publié en boutique</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                    id="edit-published"
                  />
                  <Label htmlFor="edit-published" className="text-xs text-muted-foreground cursor-pointer">
                    {isPublished ? "Visible" : "Masqué"}
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2 pt-1 pb-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enregistrement...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Enregistrer</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
