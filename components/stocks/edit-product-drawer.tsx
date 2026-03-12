"use client"

import { useState } from "react"
import { Save, X, Trash2, Image as ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import type { FinishedProduct } from "@/lib/stocks/actions"
import { updateFinishedProduct } from "@/lib/stocks/actions"

interface EditProductDrawerProps {
  product: FinishedProduct | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: () => void
}

export function EditProductDrawer({ product, open, onOpenChange, onSave }: EditProductDrawerProps) {
  const { currentTenant } = useTenant()
  const [name, setName] = useState(product?.name || "")
  const [sellingPrice, setSellingPrice] = useState(product?.sellingPrice?.toString() || "")
  const [description, setDescription] = useState(product?.description || "")
  const [currentStock, setCurrentStock] = useState(product?.currentStock?.toString() || "")
  const [minStock, setMinStock] = useState(product?.minStock?.toString() || "")
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || "")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(product?.imageUrl || "")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Sélectionnez une image valide")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo")
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadImage = async () => {
    if (!imageFile) return

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", imageFile)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Erreur lors de l'upload")
      }

      const data = await res.json()
      setImageUrl(data.url)
      setImageFile(null)
      toast.success("Image uploadée avec succès")
    } catch (err) {
      console.error("Upload error:", err)
      toast.error("Erreur lors de l'upload de l'image")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (!product || !currentTenant) return

    if (!name.trim()) {
      toast.error("Le nom du produit est requis")
      return
    }

    setSaving(true)
    try {
      await updateFinishedProduct(currentTenant.id, product.id, {
        name: name.trim(),
        sellingPrice: parseFloat(sellingPrice) || 0,
        description: description.trim() || undefined,
        currentStock: parseFloat(currentStock) || 0,
        minStock: parseFloat(minStock) || 0,
        imageUrl: imageUrl || undefined,
      })

      toast.success("Produit modifié avec succès")
      onOpenChange(false)
      onSave?.()
    } catch (err) {
      console.error("Save error:", err)
      toast.error("Erreur lors de la modification")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh] overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>Modifier le produit</DrawerTitle>
        </DrawerHeader>

        <div className="space-y-4 p-4">
          {/* Image Section */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Photo du produit</Label>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="edit-image-upload"
                />
                <label htmlFor="edit-image-upload" className="flex items-center justify-center p-3 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition">
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Changer l'image</span>
                  </div>
                </label>
              </div>
              {(imagePreview || imageUrl) && (
                <div className="relative w-20 h-20">
                  <img src={imagePreview || imageUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                  <button
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview("")
                      setImageUrl("")
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
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
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Envoyer l'image
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="edit-name" className="text-xs font-medium">Nom du produit *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Croissant Beurre"
              className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-price" className="text-xs font-medium">Prix de vente (TND)</Label>
            <Input
              id="edit-price"
              type="number"
              step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="0.00"
              className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-stock" className="text-xs font-medium">Stock actuel</Label>
            <Input
              id="edit-stock"
              type="number"
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
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="0"
              className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-xs font-medium">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le produit..."
              rows={3}
              className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
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
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
