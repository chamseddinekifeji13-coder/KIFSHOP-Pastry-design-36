"use client"

import { useState, useEffect, useRef } from "react"
import { Save, ShoppingBag, Tag, Eye, EyeOff, Camera, X, Loader2, ImageIcon } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateFinishedProduct } from "@/lib/stocks/actions"
import { useFinishedProducts } from "@/hooks/use-tenant-data"
import { toast } from "sonner"

interface CatalogProduct {
  id: string; name: string; category: string; price: number
  image?: string; imageUrl?: string; isPublished?: boolean; description?: string
  unit?: string; weight?: string; minOrder?: number; tags?: string[]
}

interface ProductEditDrawerProps {
  product: CatalogProduct | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductEditDrawer({ product, open, onOpenChange }: ProductEditDrawerProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [unit, setUnit] = useState("piece")
  const [minOrder, setMinOrder] = useState("1")
  const [weight, setWeight] = useState("")
  const [category, setCategory] = useState("")
  const [isPublished, setIsPublished] = useState(false)
  const [tags, setTags] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutate } = useFinishedProducts()

  const isAddMode = !product

  useEffect(() => {
    if (product) {
      setName(product.name)
      setDescription(product.description || "")
      setPrice(product.price.toString())
      setUnit(product.unit || "piece")
      setMinOrder((product.minOrder || 1).toString())
      setWeight(product.weight || "")
      setCategory(product.category || "")
      setIsPublished(product.isPublished ?? false)
      setTags(product.tags?.join(", ") || "")
      setImageUrl(product.imageUrl || product.image || "")
    } else {
      setName(""); setDescription(""); setPrice(""); setUnit("piece"); setMinOrder("1")
      setWeight(""); setCategory(""); setIsPublished(false); setTags(""); setImageUrl("")
    }
  }, [product, open])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporte", { description: "Utilisez JPG, PNG ou WebP" })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux", { description: "Maximum 5 Mo" })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'upload")
      }
      setImageUrl(data.url)
      toast.success("Photo ajoutee")
    } catch (err: any) {
      console.error("[v0] Upload error:", err)
      toast.error("Erreur lors de l'upload", { description: err.message || "Veuillez reessayer" })
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRemoveImage = () => {
    setImageUrl("")
  }

  const handleSubmit = async () => {
    if (!name.trim() || !price) {
      toast.error("Nom et prix sont obligatoires")
      return
    }

    if (product) {
      setSaving(true)
      const success = await updateFinishedProduct(product.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        sellingPrice: Number(price),
        unit,
        weight: weight.trim() || undefined,
        isPublished,
        minOrder: Number(minOrder) || 1,
        tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        imageUrl: imageUrl || undefined,
      })
      setSaving(false)
      if (success) {
        toast.success("Produit mis a jour", { description: name })
        mutate()
        onOpenChange(false)
      } else {
        toast.error("Erreur lors de la mise a jour")
      }
    } else {
      toast.success("Produit ajoute", { description: name })
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0 overflow-y-auto [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-secondary to-secondary/80 px-6 py-8 text-secondary-foreground">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{isAddMode ? "Ajouter un produit" : "Modifier le produit"}</h2>
              <p className="text-sm opacity-70">{isAddMode ? "Nouveau produit catalogue" : "Modifier les informations"}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-5">

          {/* Photo Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Camera className="h-3.5 w-3.5" />
              Photo du produit
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={handleImageUpload}
              />

              {imageUrl ? (
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={imageUrl}
                    alt={name || "Photo produit"}
                    fill
                    className="object-cover"
                    crossOrigin="anonymous"
                  />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-full shadow-lg"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Camera className="mr-1 h-3.5 w-3.5" />
                        Changer
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-full shadow-lg"
                        onClick={handleRemoveImage}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer bg-muted/30 hover:bg-muted/50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <span className="text-sm text-muted-foreground">Upload en cours...</span>
                    </>
                  ) : (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">Ajouter une photo</p>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou WebP - Max 5 Mo</p>
                      </div>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ShoppingBag className="h-3.5 w-3.5" />
              Informations
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nom du produit *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Prix (TND) *</Label>
                  <Input type="number" step="0.1" value={price} onChange={(e) => setPrice(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Unite</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="bg-muted/50 border-0"><SelectValue /></SelectTrigger>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Commande minimum</Label>
                  <Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Poids</Label>
                  <Input placeholder="Ex: 500g" value={weight} onChange={(e) => setWeight(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
                </div>
              </div>
            </div>
          </div>

          {/* Tags & Category */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Classification
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Categorie</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tags (separes par des virgules)</Label>
                <Input placeholder="populaire, amandes, ..." value={tags} onChange={(e) => setTags(e.target.value)}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
              </div>
            </div>
          </div>

          {/* Visibility */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isPublished ? "bg-primary/10" : "bg-muted"}`}>
                  {isPublished ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{isPublished ? "Publie en ligne" : "Masque"}</p>
                  <p className="text-xs text-muted-foreground">
                    {isPublished ? "Visible sur la boutique" : "Non visible pour les clients"}
                  </p>
                </div>
              </div>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-4 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
            onClick={handleSubmit}
            disabled={saving || uploading}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
