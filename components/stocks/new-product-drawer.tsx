"use client"

import { useState } from "react"
import { Save, Plus, X, Trash2, CakeSlice, FlaskConical, Scale, Package, Image as ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useTenant } from "@/lib/tenant-context"
import { useRawMaterials, useCategories, usePackaging } from "@/hooks/use-tenant-data"
import { addFinishedProduct, addRecipe, setProductPackaging } from "@/lib/stocks/actions"
import type { RawMaterial, Category, Packaging } from "@/lib/stocks/actions"
import { toast } from "sonner"
import { useSWRConfig } from "swr"

interface RecipeIngredient {
  materialId: string
  name: string
  quantity: string
  unit: string
}

interface PackagingLine {
  packagingId: string
  name: string
  quantity: string
  unitPrice: number
  unit: string
}

interface NewProductDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewProductDrawer({ open, onOpenChange }: NewProductDrawerProps) {
  const { currentTenant } = useTenant()
  const { data: rawMaterials = [] } = useRawMaterials()
  const { data: categories = [] } = useCategories()
  const { data: packagingItems = [] } = usePackaging()
  const { mutate } = useSWRConfig()

  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [unit, setUnit] = useState("")
  const [price, setPrice] = useState("")
  const [initialQty, setInitialQty] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)

  const [hasRecipe, setHasRecipe] = useState(true)
  const [yieldQty, setYieldQty] = useState("1")
  const [yieldUnit, setYieldUnit] = useState("")
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState("")
  const [ingredientQty, setIngredientQty] = useState("")

  const [packagingLines, setPackagingLines] = useState<PackagingLine[]>([])
  const [selectedPackaging, setSelectedPackaging] = useState("")
  const [packagingQty, setPackagingQty] = useState("1")
  const [soldByWeight, setSoldByWeight] = useState(false)

  const allCategories = [...categories.map((c: Category) => c.name), ...customCategories]
  const units = ["plateau", "pièce", "pcs", "boîte", "coffret", "pot", "kg", "g"]

  const handleAddCategory = () => {
    if (!newCategory.trim()) return
    if (allCategories.some((c: string) => c.toLowerCase() === newCategory.trim().toLowerCase())) {
      toast.error("Cette catégorie existe déjà")
      return
    }
    setCustomCategories(prev => [...prev, newCategory.trim()])
    setCategory(newCategory.trim())
    setNewCategory("")
    setShowNewCategory(false)
  }

  const addIngredient = () => {
    if (!selectedMaterial || !ingredientQty) {
      toast.error("Sélectionnez une matière première et une quantité")
      return
    }
    const material = rawMaterials.find((m: RawMaterial) => m.id === selectedMaterial)
    if (!material) return
    if (ingredients.some(i => i.materialId === selectedMaterial)) {
      toast.error("Cette matière première est déjà dans la recette")
      return
    }
    setIngredients(prev => [...prev, {
      materialId: material.id,
      name: material.name,
      quantity: ingredientQty,
      unit: material.unit,
    }])
    setSelectedMaterial("")
    setIngredientQty("")
  }

  const removeIngredient = (materialId: string) => {
    setIngredients(prev => prev.filter(i => i.materialId !== materialId))
  }

  const addPackagingLine = () => {
    if (!selectedPackaging || !packagingQty) {
      toast.error("Sélectionnez un emballage et une quantité")
      return
    }
    const pkg = packagingItems.find((p: Packaging) => p.id === selectedPackaging)
    if (!pkg) return
    if (packagingLines.some(l => l.packagingId === selectedPackaging)) {
      toast.error("Cet emballage est déjà ajouté")
      return
    }
    setPackagingLines(prev => [...prev, {
      packagingId: pkg.id,
      name: pkg.name,
      quantity: packagingQty,
      unitPrice: pkg.price,
      unit: pkg.unit,
    }])
    setSelectedPackaging("")
    setPackagingQty("1")
  }

  const removePackagingLine = (packagingId: string) => {
    setPackagingLines(prev => prev.filter(l => l.packagingId !== packagingId))
  }

  const totalPackagingCost = packagingLines.reduce(
    (sum, l) => sum + (Number(l.quantity) * l.unitPrice), 0
  )

  const availablePackaging = packagingItems.filter((p: Packaging) => !packagingLines.some(l => l.packagingId === p.id))

  const resetForm = () => {
    setName("")
    setCategory("")
    setUnit("")
    setPrice("")
    setInitialQty("")
    setDescription("")
    setHasRecipe(true)
    setYieldQty("1")
    setYieldUnit("")
    setIngredients([])
    setSelectedMaterial("")
    setIngredientQty("")
    setPackagingLines([])
    setSelectedPackaging("")
    setPackagingQty("1")
    setSoldByWeight(false)
    setImageFile(null)
    setImagePreview("")
    setImageUrl("")
    setUploadingImage(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Sélectionnez une image valide")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo")
      return
    }

    setImageFile(file)

    // Create preview
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
      toast.success("Image uploadée avec succès")
    } catch (err) {
      console.error("Upload error:", err)
      toast.error("Erreur lors de l'upload de l'image")
    } finally {
      setUploadingImage(false)
    }
  }

  function validateNumber(value: string, defaultValue: number = 0): number {
    const num = Number(value)
    return isNaN(num) || num < 0 ? defaultValue : num
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Veuillez saisir le nom du produit")
      return
    }
    if (!category) {
      toast.error("Veuillez sélectionner une catégorie")
      return
    }
    if (!unit) {
      toast.error("Veuillez sélectionner l'unité de mesure")
      return
    }
    if (!price) {
      toast.error("Veuillez saisir le prix de vente")
      return
    }
    if (hasRecipe && ingredients.length === 0) {
      toast.error("Ajoutez au moins un ingrédient à la recette")
      return
    }

    setSaving(true)
    try {
      // Find categoryId from category name
      const categoryObj = categories.find((c: Category) => c.name === category)
      const product = await addFinishedProduct(currentTenant.id, {
        name: name.trim(),
        categoryId: categoryObj?.id,
        unit,
        sellingPrice: validateNumber(price),
        costPrice: 0,
        currentStock: initialQty ? validateNumber(initialQty) : 0,
        minStock: 0,
        description: description.trim() || undefined,
        imageUrl: imageUrl || undefined,
        soldByWeight,
      })

      if (hasRecipe && product) {
        await addRecipe(currentTenant.id, {
          name: name.trim(),
          finishedProductId: product.id,
          category,
          yieldQuantity: validateNumber(yieldQty, 1),
          yieldUnit: yieldUnit || unit,
          ingredients: ingredients.map(ing => ({
            rawMaterialId: ing.materialId,
            quantity: validateNumber(ing.quantity),
            unit: ing.unit,
          })),
        })
      }

      // Save packaging links + recalculate cost
      if (product && packagingLines.length > 0) {
        await setProductPackaging(product.id, packagingLines.map(l => ({
          packagingId: l.packagingId,
          quantity: Number(l.quantity),
        })))
      }

      toast.success("Produit fini créé avec succès", {
        description: hasRecipe
          ? `"${name}" avec sa fiche technique (${ingredients.length} ingrédients)`
          : `"${name}" sans recette`,
      })
      mutate((key: string) => typeof key === "string" && key.includes("finished-products"))
      mutate((key: string) => typeof key === "string" && key.includes("recipes"))
      
      // Revalidate SWR cache for dashboard
      mutate((key: string) => typeof key === "string" && (
        key.includes("finished_products") || 
        key.includes("critical_stock") ||
        key.includes(currentTenant.id)
      ), undefined, { revalidate: true })
      
      resetForm()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.startsWith("DUPLICATE:")) {
        toast.error("Doublon détecté", { description: msg.replace("DUPLICATE:", "") })
      } else if (msg.startsWith("SIMILAR:")) {
        toast.error("Produit similaire détecté", { 
          description: msg.replace("SIMILAR:", ""),
          action: { label: "Continuer", onClick: () => {} }
        })
      } else {
        toast.error("Erreur", { description: msg || "Erreur lors de la création du produit" })
      }
    } finally {
      setSaving(false)
    }
  }

  const availableMaterials = rawMaterials.filter((m: RawMaterial) => !ingredients.some(i => i.materialId === m.id))

  return (
<Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-y-auto [&>button[data-slot=dialog-close]]:absolute [&>button[data-slot=dialog-close]]:top-4 [&>button[data-slot=dialog-close]]:right-4 [&>button[data-slot=dialog-close]]:text-white [&>button[data-slot=dialog-close]]:opacity-80 [&>button[data-slot=dialog-close]]:hover:opacity-100 [&>button[data-slot=dialog-close]]:z-50">
        <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-primary-foreground">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/20 backdrop-blur-sm">
              <CakeSlice className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Nouveau produit fini</h2>
              <p className="text-sm text-primary-foreground/70">Créez un produit et sa fiche technique</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-6 py-6 space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <CakeSlice className="h-3.5 w-3.5" aria-hidden="true" /> Informations du produit
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="product-name" className="text-xs font-medium">Nom du produit *</Label>
                <Input id="product-name" placeholder="Ex: Baklawa aux pistaches" value={name} onChange={(e) => setName(e.target.value)}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-medium">Catégorie *</Label>
                  {showNewCategory ? (
                    <div className="flex gap-1.5">
                      <Input id="new-category" placeholder="Nom" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory() }} className="flex-1 bg-muted/50 border-0" />
                      <Button size="icon" variant="outline" onClick={handleAddCategory} className="shrink-0 rounded-lg" aria-label="Ajouter une catégorie"><Plus className="h-4 w-4" aria-hidden="true" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setShowNewCategory(false)} className="shrink-0" aria-label="Annuler"><X className="h-4 w-4" aria-hidden="true" /></Button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="category" className="flex-1 bg-muted/50 border-0"><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>{allCategories.map((c: string) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                      </Select>
                      <Button size="icon" variant="outline" onClick={() => setShowNewCategory(true)} className="shrink-0 rounded-lg" aria-label="Ajouter une catégorie"><Plus className="h-4 w-4" aria-hidden="true" /></Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-xs font-medium">Unité *</Label>
                  <Select value={unit} onValueChange={(v: string) => { setUnit(v); if (!yieldUnit) setYieldUnit(v) }}>
                    <SelectTrigger id="unit" className="bg-muted/50 border-0"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{units.map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-xs font-medium">Prix de vente (TND) *</Label>
                  <Input id="price" type="number" step="0.1" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initial-qty" className="text-xs font-medium">Stock initial</Label>
                  <Input id="initial-qty" type="number" placeholder="0" value={initialQty} onChange={(e) => setInitialQty(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <Label className="text-xs font-medium">Vendu au poids (kg)</Label>
                  <p className="text-[10px] text-muted-foreground mt-1">Prix par kg</p>
                </div>
                <div className="flex items-center justify-end">
                  <Switch checked={soldByWeight} onCheckedChange={setSoldByWeight} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-medium">Description (optionnel)</Label>
                <Textarea id="description" placeholder="Décrivez le produit..." value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={2} className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Photo du produit (optionnel)</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="flex items-center justify-center w-full p-3 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition">
                      <div className="flex flex-col items-center gap-1">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{imagePreview ? "Changer l'image" : "Sélectionner une image"}</span>
                      </div>
                    </label>
                  </div>
                  {imagePreview && (
                    <div className="relative w-20 h-20">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                      <button
                        title="Supprimer l'image"
                        aria-label="Supprimer l'image"
                        onClick={() => {
                          setImageFile(null)
                          setImagePreview("")
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                {imagePreview && !imageUrl && (
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
                {imageUrl && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <Plus className="h-3 w-3" />
                    Image uploadée avec succès
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> Fiche technique (Recette)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{hasRecipe ? "Activée" : "Désactivée"}</span>
                <Switch checked={hasRecipe} onCheckedChange={setHasRecipe} />
              </div>
            </div>
            {hasRecipe ? (
              <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-xs font-medium">Unité *</Label>
                  <Select value={unit} onValueChange={(v: string) => { setUnit(v); if (!yieldUnit) setYieldUnit(v) }}>
                    <SelectTrigger id="unit" className="bg-muted/50 border-0"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{units.map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent>
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
                    <Label htmlFor="yield-unit" className="text-xs font-medium">Unité rendement</Label>
                    <Select value={yieldUnit} onValueChange={setYieldUnit}>
                      <SelectTrigger id="yield-unit" className="bg-muted/50 border-0"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>{units.map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="material" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Ajouter un ingrédient</Label>
                  <div className="flex gap-2">
                    <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                      <SelectTrigger id="material" className="flex-1 bg-muted/50 border-0"><SelectValue placeholder="Matière première" /></SelectTrigger>
                      <SelectContent>{availableMaterials.map((m: RawMaterial) => (<SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>))}</SelectContent>
                    </Select>
                    <Input type="number" step="0.01" placeholder="Qte" value={ingredientQty} onChange={(e) => setIngredientQty(e.target.value)}
                      className="w-20 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
                    <Button size="icon" variant="outline" onClick={addIngredient} className="shrink-0 rounded-lg" aria-label="Ajouter un ingrédient"><Plus className="h-4 w-4" aria-hidden="true" /></Button>
                  </div>
                </div>
                {ingredients.length > 0 ? (
                  <div className="rounded-lg border divide-y">
                    <div className="px-3 py-2 bg-muted/50">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Ingrédients ({ingredients.length})</p>
                    </div>
                    {ingredients.map((ing) => (
                      <div key={ing.materialId} className="flex items-center justify-between p-3 text-sm group">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ing.name}</span>
                          <Badge variant="secondary" className="text-xs rounded-full bg-primary/10 text-primary border-0">{ing.quantity} {ing.unit}</Badge>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeIngredient(ing.materialId)} aria-label={`Supprimer ${ing.name}`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Aucun ingrédient ajouté</div>
                )}
                {ingredients.length > 0 && price && (
                  <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 space-y-1">
                    <div className="flex items-center gap-2"><Scale className="h-3.5 w-3.5 text-primary" aria-hidden="true" /><p className="text-xs font-semibold text-primary">Estimation</p></div>
                    <p className="text-sm"><span className="font-semibold">{ingredients.length}</span> matières premières pour <span className="font-semibold">{yieldQty || 1}</span> {yieldUnit || unit || "unités"}</p>
                    <p className="text-xs text-muted-foreground">Prix de vente: {Number(price).toLocaleString("fr-TN")} TND / {unit || "unité"}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Fiche technique désactivée. Vous pourrez en créer une plus tard.</div>
            )}
          </div>

          {/* ── Section Emballage ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Package className="h-3.5 w-3.5" aria-hidden="true" /> Emballage du produit
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Ajouter un emballage</Label>
                <div className="flex gap-2">
                  <Select value={selectedPackaging} onValueChange={setSelectedPackaging}>
                    <SelectTrigger className="flex-1 bg-muted/50 border-0"><SelectValue placeholder="Choisir un emballage" /></SelectTrigger>
                    <SelectContent>
                      {availablePackaging.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.price.toLocaleString("fr-TN")} TND/{p.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" min="1" step="1" placeholder="Qte" value={packagingQty} onChange={(e) => setPackagingQty(e.target.value)}
                    className="w-20 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
                  <Button size="icon" variant="outline" onClick={addPackagingLine} className="shrink-0 rounded-lg" title="Ajouter cet emballage" aria-label="Ajouter cet emballage"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              {packagingLines.length > 0 ? (
                <div className="rounded-lg border divide-y">
                  <div className="px-3 py-2 bg-muted/50 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Emballages ({packagingLines.length})</p>
                    <p className="text-[10px] font-semibold text-primary">{totalPackagingCost.toLocaleString("fr-TN")} TND</p>
                  </div>
                  {packagingLines.map((line) => (
                    <div key={line.packagingId} className="flex items-center justify-between p-3 text-sm group">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{line.name}</span>
                        <Badge variant="secondary" className="text-xs rounded-full bg-primary/10 text-primary border-0">
                          x{line.quantity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {(Number(line.quantity) * line.unitPrice).toLocaleString("fr-TN")} TND
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removePackagingLine(line.packagingId)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Aucun emballage associe. Le cout d&apos;emballage ne sera pas inclus dans le prix de revient.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t bg-muted/30 px-6 py-4 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" onClick={handleSubmit} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Creation..." : "Creer le produit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
