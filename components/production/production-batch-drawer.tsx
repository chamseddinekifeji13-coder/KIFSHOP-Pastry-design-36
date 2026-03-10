import { useState, useEffect } from "react"
import { Plus, Package, FlaskConical, Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useTenant } from "@/lib/tenant-context"
import { useRecipes } from "@/hooks/use-tenant-data"
import { createProductionBatch } from "@/lib/production/actions"
import { toast } from "sonner"
import { useSWRConfig } from "swr"

interface ProductionBatchDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedRecipeId?: string
}

export function ProductionBatchDrawer({ open, onOpenChange, preselectedRecipeId }: ProductionBatchDrawerProps) {
  const { currentTenant } = useTenant()
  const { data: recipes = [] } = useRecipes()
  const { mutate } = useSWRConfig()

  const [selectedRecipeId, setSelectedRecipeId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("g")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [openCombobox, setOpenCombobox] = useState(false)

  // Si une recette est pré-sélectionnée, la charger. Réinitialiser à la fermeture.
  useEffect(() => {
    if (open) {
      if (preselectedRecipeId) {
        setSelectedRecipeId(preselectedRecipeId)
      }
    } else {
      // Reset form on close
      setSelectedRecipeId("")
      setQuantity("")
      setUnit("g")
      setNotes("")
    }
  }, [preselectedRecipeId, open])

  const units = ["g", "kg", "ml", "L"]

  const selectedRecipe = recipes.find((r: any) => r.id === selectedRecipeId)
  const recipeName = selectedRecipe?.name || ""

  const handleSubmit = async () => {
    if (!selectedRecipeId) {
      toast.error("Veuillez sélectionner une recette")
      return
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Veuillez saisir une quantité positive")
      return
    }

    setSaving(true)
    try {
      await createProductionBatch(currentTenant.id, {
        recipeId: selectedRecipeId,
        recipeName,
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
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la création du lot"
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setSelectedRecipeId("")
    setQuantity("")
    setUnit("g")
    setNotes("")
  }

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
          {/* Sélection recette avec recherche */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FlaskConical className="h-3.5 w-3.5" /> Recette
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Sélectionner une recette *</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between bg-muted/50 border-0"
                  >
                    {selectedRecipe ? (
                      <div className="flex items-center gap-2">
                        <span>{selectedRecipe.name}</span>
                        {selectedRecipe.category && (
                          <Badge variant="secondary" className="text-xs ml-auto">{selectedRecipe.category}</Badge>
                        )}
                      </div>
                    ) : (
                      "Chercher une recette..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Chercher une recette..." />
                    <CommandEmpty>Aucune recette trouvée.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {recipes.map((recipe: any) => (
                          <CommandItem
                            key={recipe.id}
                            value={recipe.id}
                            onSelect={(currentValue) => {
                              setSelectedRecipeId(currentValue === selectedRecipeId ? "" : currentValue)
                              setOpenCombobox(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedRecipeId === recipe.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{recipe.name}</div>
                              {recipe.category && (
                                <div className="text-xs text-muted-foreground">{recipe.category}</div>
                              )}
                              {recipe.ingredients?.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {recipe.ingredients.length} ingrédient{recipe.ingredients.length > 1 ? "s" : ""}
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Info workflow de production */}
          {selectedRecipe && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 space-y-2 text-xs border border-blue-200 dark:border-blue-800">
              <p className="font-medium text-blue-900 dark:text-blue-100">ℹ Workflow de production</p>
              <ul className="space-y-1 text-blue-800 dark:text-blue-200 ml-2 list-disc">
                <li>Les matières premières seront déduites du stock</li>
                <li>Un lot vrac de {quantity || "?"}{unit} sera créé</li>
                {selectedRecipe.ingredients?.length > 0 && (
                  <li>{selectedRecipe.ingredients.length} ingrédient(s) consommé(s)</li>
                )}
              </ul>
            </div>
          )}

          {/* Nom et quantité */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Package className="h-3.5 w-3.5" /> Production
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Produit vrac</Label>
              <Input
                disabled
                value={recipeName}
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
            disabled={saving || !selectedRecipeId || !quantity}
            className="flex-1"
          >
            {saving ? "Création..." : "Créer le lot"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
