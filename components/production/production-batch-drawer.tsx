import { useState } from "react"
import { Plus, Package, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useTenant } from "@/lib/tenant-context"
import { useRecipes } from "@/hooks/use-tenant-data"
import { createProductionBatch } from "@/lib/production/actions"
import { toast } from "sonner"
import { useSWRConfig } from "swr"

interface ProductionBatchDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductionBatchDrawer({ open, onOpenChange }: ProductionBatchDrawerProps) {
  const { currentTenant } = useTenant()
  const { data: recipes = [] } = useRecipes()
  const { mutate } = useSWRConfig()

  const [recipeName, setRecipeName] = useState("")
  const [selectedRecipeId, setSelectedRecipeId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("g")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const units = ["g", "kg", "ml", "L", "L"]

  const handleSubmit = async () => {
    if (!recipeName.trim()) {
      toast.error("Veuillez saisir le nom de la recette")
      return
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Veuillez saisir une quantité positive")
      return
    }

    setSaving(true)
    try {
      await createProductionBatch(currentTenant.id, {
        recipeId: selectedRecipeId || undefined,
        recipeName: recipeName.trim(),
        producedQuantity: parseFloat(quantity),
        producedUnit: unit,
        notes: notes.trim() || undefined,
      })
      toast.success("Lot de production créé", {
        description: `${quantity}${unit} de ${recipeName}`,
      })
      mutate((key: string) => typeof key === "string" && key.includes("batches"))
      resetForm()
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating batch:", error)
      toast.error("Erreur lors de la création du lot")
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setRecipeName("")
    setSelectedRecipeId("")
    setQuantity("")
    setUnit("g")
    setNotes("")
  }

  const selectedRecipe = recipes.find((r: any) => r.id === selectedRecipeId)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col overflow-hidden">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Nouveau lot de production</h2>
            </div>
            <p className="text-sm text-muted-foreground">Créer un lot vrac à conditionner</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 py-6">
          {/* Sélection recette */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FlaskConical className="h-3.5 w-3.5" /> Recette
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Recette (optionnel)</Label>
              <Select value={selectedRecipeId} onValueChange={(value) => {
                setSelectedRecipeId(value)
                if (value) {
                  const recipe = recipes.find((r: any) => r.id === value)
                  if (recipe && !recipeName) setRecipeName(recipe.name)
                }
              }}>
                <SelectTrigger className="bg-muted/50 border-0">
                  <SelectValue placeholder="Sélectionner une recette..." />
                </SelectTrigger>
                <SelectContent>
                  {recipes.map((recipe: any) => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      {recipe.name}
                      {recipe.category && <span className="text-muted-foreground ml-2 text-xs">({recipe.category})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRecipe && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 space-y-1">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-100">{selectedRecipe.name}</p>
                  {selectedRecipe.ingredients?.length > 0 && (
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      {selectedRecipe.ingredients.length} ingrédient{selectedRecipe.ingredients.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Nom et quantité */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Package className="h-3.5 w-3.5" /> Production
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Nom du produit vrac *</Label>
              <Input
                placeholder="Ex: Confiture fraise, Pâte feuilletée..."
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                className="bg-muted/50 border-0"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-medium">Quantité produite *</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="bg-muted/50 border-0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Unité</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="bg-muted/50 border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea
              placeholder="Observations, conditions de production..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none bg-muted/50 border-0 min-h-20"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              resetForm()
              onOpenChange(false)
            }}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !recipeName.trim() || !quantity}
            className="flex-1"
          >
            {saving ? "Création..." : "Créer le lot"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
