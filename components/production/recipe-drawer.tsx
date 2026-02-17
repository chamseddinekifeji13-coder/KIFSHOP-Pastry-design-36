"use client"

import { useState, useEffect } from "react"
import { Save, Plus, X, Trash2, ChefHat, FlaskConical, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useTenant } from "@/lib/tenant-context"
import { useRawMaterials, useCategories } from "@/hooks/use-tenant-data"
import { addRecipe } from "@/lib/stocks/actions"
import { toast } from "sonner"
import { useSWRConfig } from "swr"

interface RecipeIngredient {
  materialId: string
  name: string
  quantity: string
  unit: string
}

interface RecipeDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe?: any | null
}

export function RecipeDrawer({ open, onOpenChange, recipe }: RecipeDrawerProps) {
  const { currentTenant } = useTenant()
  const { data: rawMaterials = [] } = useRawMaterials()
  const { data: categories = [] } = useCategories()
  const { mutate } = useSWRConfig()
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
  const [saving, setSaving] = useState(false)

  const allCategories = [...categories.map((c: any) => c.name), ...customCategories]
  const units = ["plateau", "piece", "pcs", "boite", "coffret", "pot", "kg", "g"]

  const handleAddCategory = () => {
    if (!newCategory.trim()) return
    setCustomCategories(prev => [...prev, newCategory.trim()])
    setCategory(newCategory.trim())
    setNewCategory(""); setShowNewCategory(false)
  }

  useEffect(() => {
    if (recipe) {
      setName(recipe.name); setCategory(recipe.category)
      setYieldQty(recipe.yield_quantity?.toString() || "")
      setYieldUnit(recipe.yield_unit || "")
      setIngredients((recipe.ingredients || []).map((ing: any) => ({
        materialId: ing.raw_material_id || ing.materialId,
        name: ing.name, quantity: ing.quantity.toString(), unit: ing.unit,
      })))
    } else { resetForm() }
  }, [recipe, open])

  const resetForm = () => {
    setName(""); setCategory(""); setYieldQty(""); setYieldUnit(""); setNotes("")
    setIngredients([]); setSelectedMaterial(""); setIngredientQty("")
  }

  const addIngredient = () => {
    if (!selectedMaterial || !ingredientQty) { toast.error("Selectionnez une matiere premiere et une quantite"); return }
    const material = rawMaterials.find((m: any) => m.id === selectedMaterial)
    if (!material) return
    if (ingredients.some(i => i.materialId === selectedMaterial)) { toast.error("Deja dans la recette"); return }
    setIngredients(prev => [...prev, { materialId: material.id, name: material.name, quantity: ingredientQty, unit: material.unit }])
    setSelectedMaterial(""); setIngredientQty("")
  }

  const removeIngredient = (materialId: string) => setIngredients(prev => prev.filter(i => i.materialId !== materialId))

  const updateIngredientQty = (materialId: string, newQty: string) => {
    setIngredients(prev => prev.map(i => i.materialId === materialId ? { ...i, quantity: newQty } : i))
  }

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Veuillez saisir le nom de la recette"); return }
    if (!category) { toast.error("Veuillez selectionner une categorie"); return }
    if (!yieldQty || !yieldUnit) { toast.error("Veuillez definir le rendement"); return }
    if (ingredients.length === 0) { toast.error("Ajoutez au moins un ingredient"); return }

    setSaving(true)
    try {
      await addRecipe(currentTenant.id, {
        name: name.trim(), category,
        yield_quantity: parseFloat(yieldQty), yield_unit: yieldUnit,
        ingredients: ingredients.map(ing => ({
          raw_material_id: ing.materialId,
          name: ing.name, quantity: parseFloat(ing.quantity), unit: ing.unit,
        })),
      })
      toast.success(isEditing ? "Recette modifiee" : "Recette creee", {
        description: `"${name}" - ${ingredients.length} ingredients`,
      })
      mutate((key: string) => typeof key === "string" && key.includes("recipes"))
      resetForm(); onOpenChange(false)
    } catch { toast.error("Erreur lors de la sauvegarde") }
    finally { setSaving(false) }
  }

  const availableMaterials = rawMaterials.filter((m: any) => !ingredients.some(i => i.materialId === m.id))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl p-0 flex flex-col gap-0 overflow-y-auto [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
        <div className="bg-gradient-to-br from-secondary to-secondary/80 px-6 py-8 text-secondary-foreground">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm"><ChefHat className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-semibold">{isEditing ? "Modifier la recette" : "Nouvelle fiche technique"}</h2>
              <p className="text-sm opacity-70">{isEditing ? `Modifier "${recipe?.name}"` : "Definissez les ingredients et le rendement"}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-6 py-6 space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><ChefHat className="h-3.5 w-3.5" /> Informations</div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nom de la recette *</Label>
                <Input placeholder="Ex: Baklawa aux pistaches" value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Categorie *</Label>
                {showNewCategory ? (
                  <div className="flex gap-1.5">
                    <Input placeholder="Nouvelle categorie" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory() }} className="flex-1 bg-muted/50 border-0" />
                    <Button size="icon" variant="outline" onClick={handleAddCategory} className="shrink-0 rounded-lg"><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setShowNewCategory(false)} className="shrink-0"><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="flex-1 bg-muted/50 border-0"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>{allCategories.map((c: string) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                    </Select>
                    <Button size="icon" variant="outline" onClick={() => setShowNewCategory(true)} className="shrink-0 rounded-lg"><Plus className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Rendement *</Label>
                  <Input type="number" placeholder="Ex: 20" value={yieldQty} onChange={(e) => setYieldQty(e.target.value)} className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Unite *</Label>
                  <Select value={yieldUnit} onValueChange={setYieldUnit}>
                    <SelectTrigger className="bg-muted/50 border-0"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{units.map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><FlaskConical className="h-3.5 w-3.5" /> Ingredients</div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="flex gap-2">
                <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                  <SelectTrigger className="flex-1 bg-muted/50 border-0"><SelectValue placeholder="Matiere premiere" /></SelectTrigger>
                  <SelectContent>{availableMaterials.map((m: any) => (<SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>))}</SelectContent>
                </Select>
                <Input type="number" step="0.01" placeholder="Qte" value={ingredientQty} onChange={(e) => setIngredientQty(e.target.value)} className="w-20 bg-muted/50 border-0" />
                <Button size="icon" variant="outline" onClick={addIngredient} className="shrink-0 rounded-lg"><Plus className="h-4 w-4" /></Button>
              </div>
              {ingredients.length > 0 ? (
                <div className="rounded-lg border divide-y">
                  <div className="px-3 py-2 bg-muted/50">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Liste ({ingredients.length})</p>
                  </div>
                  {ingredients.map((ing) => (
                    <div key={ing.materialId} className="flex items-center justify-between p-3 group">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-sm font-medium">{ing.name}</span>
                        <div className="flex items-center gap-1">
                          <Input type="number" step="0.01" value={ing.quantity} onChange={(e) => updateIngredientQty(ing.materialId, e.target.value)} className="w-20 h-7 text-sm bg-muted/50 border-0 rounded-lg" />
                          <span className="text-xs text-muted-foreground">{ing.unit}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeIngredient(ing.materialId)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucun ingredient ajoute</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><StickyNote className="h-3.5 w-3.5" /> Notes</div>
            <Textarea placeholder="Instructions, temps de cuisson..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl" />
          </div>
        </div>

        <div className="border-t bg-muted/30 px-6 py-4 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" onClick={handleSubmit} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Sauvegarde..." : isEditing ? "Enregistrer" : "Creer la recette"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
