"use client"

import { useState } from "react"
import { Save, X, Plus, Trash2, CakeSlice, FlaskConical, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTenant } from "@/lib/tenant-context"
import { getRawMaterials, getCategories } from "@/lib/mock-data"
import { toast } from "sonner"

interface RecipeIngredient {
  materialId: string
  name: string
  quantity: string
  unit: string
}

interface NewProductDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewProductDrawer({ open, onOpenChange }: NewProductDrawerProps) {
  const { currentTenant } = useTenant()
  const rawMaterials = getRawMaterials(currentTenant.id)
  const tenantCategories = getCategories(currentTenant.id)

  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [unit, setUnit] = useState("")
  const [price, setPrice] = useState("")
  const [initialQty, setInitialQty] = useState("")
  const [description, setDescription] = useState("")

  const [hasRecipe, setHasRecipe] = useState(true)
  const [yieldQty, setYieldQty] = useState("1")
  const [yieldUnit, setYieldUnit] = useState("")
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])

  const [selectedMaterial, setSelectedMaterial] = useState("")
  const [ingredientQty, setIngredientQty] = useState("")

  const allCategories = [
    ...tenantCategories.map(c => c.name),
    ...customCategories,
  ]

  const handleAddCategory = () => {
    if (!newCategory.trim()) return
    if (allCategories.some(c => c.toLowerCase() === newCategory.trim().toLowerCase())) {
      toast.error("Cette categorie existe deja")
      return
    }
    setCustomCategories(prev => [...prev, newCategory.trim()])
    setCategory(newCategory.trim())
    setNewCategory("")
    setShowNewCategory(false)
    toast.success(`Categorie "${newCategory.trim()}" ajoutee`)
  }

  const units = ["plateau", "piece", "pcs", "boite", "coffret", "pot", "kg", "g"]

  const addIngredient = () => {
    if (!selectedMaterial || !ingredientQty) {
      toast.error("Selectionnez une matiere premiere et une quantite")
      return
    }
    const material = rawMaterials.find(m => m.id === selectedMaterial)
    if (!material) return
    if (ingredients.some(i => i.materialId === selectedMaterial)) {
      toast.error("Cette matiere premiere est deja dans la recette")
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

  const resetForm = () => {
    setName(""); setCategory(""); setUnit(""); setPrice(""); setInitialQty(""); setDescription("")
    setHasRecipe(true); setYieldQty("1"); setYieldUnit(""); setIngredients([])
    setSelectedMaterial(""); setIngredientQty("")
  }

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Veuillez saisir le nom du produit"); return }
    if (!category) { toast.error("Veuillez selectionner une categorie"); return }
    if (!unit) { toast.error("Veuillez selectionner l'unite de mesure"); return }
    if (!price) { toast.error("Veuillez saisir le prix de vente"); return }
    if (hasRecipe && ingredients.length === 0) { toast.error("Ajoutez au moins un ingredient a la recette"); return }

    toast.success("Produit fini cree avec succes", {
      description: hasRecipe
        ? `"${name}" avec sa fiche technique (${ingredients.length} ingredients)`
        : `"${name}" sans recette`,
    })
    resetForm()
    onOpenChange(false)
  }

  const availableMaterials = rawMaterials.filter(m => !ingredients.some(i => i.materialId === m.id))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl p-0 flex flex-col gap-0 overflow-y-auto [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-primary-foreground">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <CakeSlice className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Nouveau produit fini</h2>
              <p className="text-sm text-primary-foreground/70">Creez un produit et sa fiche technique</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-5">
          {/* Product Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <CakeSlice className="h-3.5 w-3.5" />
              Informations du produit
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nom du produit *</Label>
                <Input
                  placeholder="Ex: Baklawa aux pistaches"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Categorie *</Label>
                  {showNewCategory ? (
                    <div className="flex gap-1.5">
                      <Input placeholder="Nom" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory() }} className="flex-1 bg-muted/50 border-0" />
                      <Button size="icon" variant="outline" onClick={handleAddCategory} className="shrink-0 rounded-lg"><Plus className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setShowNewCategory(false)} className="shrink-0"><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="flex-1 bg-muted/50 border-0"><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>{allCategories.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                      </Select>
                      <Button size="icon" variant="outline" onClick={() => setShowNewCategory(true)} className="shrink-0 rounded-lg" title="Ajouter une categorie"><Plus className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Unite *</Label>
                  <Select value={unit} onValueChange={(v) => { setUnit(v); if (!yieldUnit) setYieldUnit(v) }}>
                    <SelectTrigger className="bg-muted/50 border-0"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{units.map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Prix de vente (TND) *</Label>
                  <Input type="number" step="0.1" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Stock initial</Label>
                  <Input type="number" placeholder="0" value={initialQty} onChange={(e) => setInitialQty(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Description (optionnel)</Label>
                <Textarea placeholder="Decrivez le produit..." value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={2} className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
              </div>
            </div>
          </div>

          {/* Recipe Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <FlaskConical className="h-3.5 w-3.5" />
                Fiche technique (Recette)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{hasRecipe ? "Active" : "Desactivee"}</span>
                <Switch checked={hasRecipe} onCheckedChange={setHasRecipe} />
              </div>
            </div>

            {hasRecipe ? (
              <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Rendement</Label>
                    <Input type="number" placeholder="Ex: 20" value={yieldQty} onChange={(e) => setYieldQty(e.target.value)}
                      className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Unite rendement</Label>
                    <Select value={yieldUnit} onValueChange={setYieldUnit}>
                      <SelectTrigger className="bg-muted/50 border-0"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>{units.map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Add ingredient */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Ajouter un ingredient</Label>
                  <div className="flex gap-2">
                    <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                      <SelectTrigger className="flex-1 bg-muted/50 border-0"><SelectValue placeholder="Matiere premiere" /></SelectTrigger>
                      <SelectContent>{availableMaterials.map(m => (<SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>))}</SelectContent>
                    </Select>
                    <Input type="number" step="0.01" placeholder="Qte" value={ingredientQty} onChange={(e) => setIngredientQty(e.target.value)}
                      className="w-20 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
                    <Button size="icon" variant="outline" onClick={addIngredient} className="shrink-0 rounded-lg"><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>

                {/* Ingredients list */}
                {ingredients.length > 0 ? (
                  <div className="rounded-lg border divide-y">
                    <div className="px-3 py-2 bg-muted/50 flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        Ingredients ({ingredients.length})
                      </p>
                    </div>
                    {ingredients.map((ing) => (
                      <div key={ing.materialId} className="flex items-center justify-between p-3 text-sm group">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ing.name}</span>
                          <Badge variant="secondary" className="text-xs rounded-full bg-primary/10 text-primary border-0">
                            {ing.quantity} {ing.unit}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeIngredient(ing.materialId)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Aucun ingredient ajoute
                  </div>
                )}

                {/* Cost estimation */}
                {ingredients.length > 0 && price && (
                  <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Scale className="h-3.5 w-3.5 text-primary" />
                      <p className="text-xs font-semibold text-primary">Estimation</p>
                    </div>
                    <p className="text-sm">
                      <span className="font-semibold">{ingredients.length}</span> matieres premieres pour{" "}
                      <span className="font-semibold">{yieldQty || 1}</span> {yieldUnit || unit || "unites"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prix de vente: {Number(price).toLocaleString("fr-TN")} TND / {unit || "unite"}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Fiche technique desactivee. Vous pourrez en creer une plus tard.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-4 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all" onClick={handleSubmit}>
            <Save className="mr-2 h-4 w-4" />
            Creer le produit
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
