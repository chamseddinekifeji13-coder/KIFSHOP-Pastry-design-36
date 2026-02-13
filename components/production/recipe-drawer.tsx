"use client"

import { useState, useEffect } from "react"
import { Save, X, Plus, Trash2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import { getRawMaterials, getCategories, type Recipe } from "@/lib/mock-data"
import { toast } from "sonner"

interface RecipeIngredient {
  materialId: string
  name: string
  quantity: string
  unit: string
}

interface RecipeDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe?: Recipe | null
}

export function RecipeDrawer({ open, onOpenChange, recipe }: RecipeDrawerProps) {
  const { currentTenant } = useTenant()
  const rawMaterials = getRawMaterials(currentTenant.id)
  const tenantCategories = getCategories(currentTenant.id)

  const isEditing = !!recipe

  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [yieldQty, setYieldQty] = useState("")
  const [yieldUnit, setYieldUnit] = useState("")
  const [notes, setNotes] = useState("")
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

  const units = [
    "plateau", "piece", "pcs", "boite", "coffret", "pot", "kg", "g"
  ]

  // Load existing recipe data when editing
  useEffect(() => {
    if (recipe) {
      setName(recipe.name)
      setCategory(recipe.category)
      setYieldQty(recipe.yieldQuantity.toString())
      setYieldUnit(recipe.yieldUnit)
      setIngredients(recipe.ingredients.map(ing => ({
        materialId: ing.materialId,
        name: ing.name,
        quantity: ing.quantity.toString(),
        unit: ing.unit,
      })))
    } else {
      resetForm()
    }
  }, [recipe, open])

  const resetForm = () => {
    setName("")
    setCategory("")
    setYieldQty("")
    setYieldUnit("")
    setNotes("")
    setIngredients([])
    setSelectedMaterial("")
    setIngredientQty("")
  }

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

  const updateIngredientQty = (materialId: string, newQty: string) => {
    setIngredients(prev => prev.map(i =>
      i.materialId === materialId ? { ...i, quantity: newQty } : i
    ))
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Veuillez saisir le nom de la recette")
      return
    }
    if (!category) {
      toast.error("Veuillez selectionner une categorie")
      return
    }
    if (!yieldQty || !yieldUnit) {
      toast.error("Veuillez definir le rendement")
      return
    }
    if (ingredients.length === 0) {
      toast.error("Ajoutez au moins un ingredient")
      return
    }

    toast.success(isEditing ? "Recette modifiee" : "Recette creee", {
      description: `"${name}" - ${ingredients.length} ingredients, rendement ${yieldQty} ${yieldUnit}`,
    })

    resetForm()
    onOpenChange(false)
  }

  const availableMaterials = rawMaterials.filter(
    m => !ingredients.some(i => i.materialId === m.id)
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Modifier la recette" : "Nouvelle fiche technique"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? `Modifiez les ingredients et le rendement de "${recipe?.name}"`
              : "Definissez les ingredients et le rendement de votre recette"
            }
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Recipe info */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-primary" />
              Informations de la recette
            </h4>

            <div className="space-y-2">
              <Label htmlFor="recipe-name">Nom de la recette *</Label>
              <Input
                id="recipe-name"
                placeholder="Ex: Baklawa aux pistaches"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Categorie *</Label>
              {showNewCategory ? (
                <div className="flex gap-1.5">
                  <Input
                    placeholder="Nouvelle categorie"
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
                      <SelectValue placeholder="Choisir une categorie" />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rendement (quantite) *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 20"
                  value={yieldQty}
                  onChange={(e) => setYieldQty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Unite du rendement *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="recipe-notes">Notes de preparation (optionnel)</Label>
              <Textarea
                id="recipe-notes"
                placeholder="Instructions de preparation, temps de cuisson, temperature..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Ingredients section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-secondary" />
              Ingredients
            </h4>

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
                        {m.name} (stock: {m.quantity} {m.unit})
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
                <div className="p-2 bg-muted/50 flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    Liste des ingredients ({ingredients.length})
                  </p>
                  {yieldQty && yieldUnit && (
                    <Badge variant="secondary" className="text-xs">
                      Pour {yieldQty} {yieldUnit}
                    </Badge>
                  )}
                </div>
                {ingredients.map((ing) => (
                  <div key={ing.materialId} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-medium">{ing.name}</span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={ing.quantity}
                          onChange={(e) => updateIngredientQty(ing.materialId, e.target.value)}
                          className="w-20 h-7 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">{ing.unit}</span>
                      </div>
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
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Aucun ingredient ajoute.
                <br />
                Selectionnez une matiere premiere dans la liste ci-dessus.
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
            {isEditing ? "Enregistrer" : "Creer la recette"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
