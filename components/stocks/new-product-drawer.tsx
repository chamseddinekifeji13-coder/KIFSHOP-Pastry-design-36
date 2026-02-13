"use client"

import { useState } from "react"
import { Save, X, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { Separator } from "@/components/ui/separator"
import { useTenant } from "@/lib/tenant-context"
import { getCategories } from "@/lib/mock-data"
import { useStock } from "@/lib/stock-context"
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
  const { rawMaterials } = useStock()
  const tenantCategories = getCategories(currentTenant.id)

  // Product fields
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [unit, setUnit] = useState("")
  const [price, setPrice] = useState("")
  const [initialQty, setInitialQty] = useState("")
  const [description, setDescription] = useState("")

  // Recipe toggle
  const [hasRecipe, setHasRecipe] = useState(true)
  const [yieldQty, setYieldQty] = useState("1")
  const [yieldUnit, setYieldUnit] = useState("")
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])

  // Ingredient add form
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

  const units = [
    "plateau", "piece", "pcs", "boite", "coffret", "pot", "kg", "g"
  ]

  const addIngredient = () => {
    if (!selectedMaterial || !ingredientQty) {
      toast.error("Selectionnez une matiere premiere et une quantite")
      return
    }

    const material = rawMaterials.find(m => m.id === selectedMaterial)
    if (!material) return

    // Check if already added
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
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Veuillez saisir le nom du produit")
      return
    }
    if (!category) {
      toast.error("Veuillez selectionner une categorie")
      return
    }
    if (!unit) {
      toast.error("Veuillez selectionner l'unite de mesure")
      return
    }
    if (!price) {
      toast.error("Veuillez saisir le prix de vente")
      return
    }
    if (hasRecipe && ingredients.length === 0) {
      toast.error("Ajoutez au moins un ingredient a la recette")
      return
    }

    toast.success("Produit fini cree avec succes", {
      description: hasRecipe
        ? `"${name}" avec sa fiche technique (${ingredients.length} ingredients)`
        : `"${name}" sans recette`,
    })

    resetForm()
    onOpenChange(false)
  }

  // Filter out already-added materials
  const availableMaterials = rawMaterials.filter(
    m => !ingredients.some(i => i.materialId === m.id)
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nouveau produit fini</SheetTitle>
          <SheetDescription>
            Creez un produit fini et definissez sa fiche technique (recette)
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Product info */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-primary" />
              Informations du produit
            </h4>

            <div className="space-y-2">
              <Label htmlFor="product-name">Nom du produit *</Label>
              <Input
                id="product-name"
                placeholder="Ex: Baklawa aux pistaches"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categorie *</Label>
                {showNewCategory ? (
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Nom"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory() }}
                      className="flex-1"
                    />
                    <Button size="icon" variant="outline" onClick={handleAddCategory} className="bg-transparent shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setShowNewCategory(false)} className="shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Choisir" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCategories.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setShowNewCategory(true)}
                      className="bg-transparent shrink-0"
                      title="Ajouter une categorie"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Unite de mesure *</Label>
                <Select value={unit} onValueChange={(v) => {
                  setUnit(v)
                  if (!yieldUnit) setYieldUnit(v)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-price">Prix de vente (TND) *</Label>
                <Input
                  id="product-price"
                  type="number"
                  step="0.1"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-qty">Stock initial</Label>
                <Input
                  id="product-qty"
                  type="number"
                  placeholder="0"
                  value={initialQty}
                  onChange={(e) => setInitialQty(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-desc">Description (optionnel)</Label>
              <Textarea
                id="product-desc"
                placeholder="Decrivez le produit pour le catalogue en ligne..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Recipe section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <div className="h-6 w-1 rounded-full bg-secondary" />
                Fiche technique (Recette)
              </h4>
              <div className="flex items-center gap-2">
                <Label htmlFor="has-recipe" className="text-xs text-muted-foreground">
                  {hasRecipe ? "Active" : "Desactive"}
                </Label>
                <Switch
                  id="has-recipe"
                  checked={hasRecipe}
                  onCheckedChange={setHasRecipe}
                />
              </div>
            </div>

            {hasRecipe ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rendement par production</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 20"
                      value={yieldQty}
                      onChange={(e) => setYieldQty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unite du rendement</Label>
                    <Select value={yieldUnit} onValueChange={setYieldUnit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Add ingredient form */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Ajouter un ingredient
                  </Label>
                  <div className="flex gap-2">
                    <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Matiere premiere" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMaterials.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({m.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Qte"
                      value={ingredientQty}
                      onChange={(e) => setIngredientQty(e.target.value)}
                      className="w-24"
                    />
                    <Button size="icon" variant="outline" onClick={addIngredient} className="bg-transparent shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Ingredients list */}
                {ingredients.length > 0 ? (
                  <div className="rounded-lg border divide-y">
                    <div className="p-2 bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground">
                        Ingredients ({ingredients.length})
                      </p>
                    </div>
                    {ingredients.map((ing) => (
                      <div key={ing.materialId} className="flex items-center justify-between p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ing.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {ing.quantity} {ing.unit}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeIngredient(ing.materialId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Aucun ingredient ajoute. Selectionnez une matiere premiere et une quantite ci-dessus.
                  </div>
                )}

                {/* Cost estimation */}
                {ingredients.length > 0 && price && (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Estimation cout de revient</p>
                    <p className="text-sm">
                      <span className="font-semibold">{ingredients.length}</span> matieres premieres pour{" "}
                      <span className="font-semibold">{yieldQty || 1}</span> {yieldUnit || unit || "unites"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prix de vente: {Number(price).toLocaleString("fr-TN")} TND / {unit || "unite"}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                La fiche technique est desactivee. Ce produit sera ajoute sans recette associee.
                Vous pourrez en creer une plus tard depuis la page Production.
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
            <X className="mr-2 h-4 w-4" />
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="mr-2 h-4 w-4" />
            Creer le produit
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
