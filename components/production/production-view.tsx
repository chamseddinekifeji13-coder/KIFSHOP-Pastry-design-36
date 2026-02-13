"use client"

import { useState } from "react"
import { ChefHat, Plus, Play, CheckCircle, Edit, Eye } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useTenant } from "@/lib/tenant-context"
import { getRecipes, getRawMaterials, type Recipe } from "@/lib/mock-data"
import { RecipeDrawer } from "./recipe-drawer"
import { toast } from "sonner"

export function ProductionView() {
  const { currentTenant } = useTenant()
  const recipes = getRecipes(currentTenant.id)
  const rawMaterials = getRawMaterials(currentTenant.id)

  const [selectedRecipe, setSelectedRecipe] = useState<string>("")
  const [quantity, setQuantity] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [recipeDrawerOpen, setRecipeDrawerOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)

  const selectedRecipeData = recipes.find(r => r.id === selectedRecipe)

  const calculateRequiredMaterials = () => {
    if (!selectedRecipeData || !quantity) return []

    const qty = parseFloat(quantity)
    return selectedRecipeData.ingredients.map(ing => {
      const required = ing.quantity * qty
      const available = rawMaterials.find(m => m.id === ing.materialId)?.quantity || 0
      const sufficient = available >= required

      return {
        ...ing,
        required,
        available,
        sufficient,
      }
    })
  }

  const requiredMaterials = calculateRequiredMaterials()
  const canProduce = requiredMaterials.length > 0 && requiredMaterials.every(m => m.sufficient)

  const handleStartProduction = () => {
    if (!canProduce) {
      toast.error("Stock insuffisant pour lancer la production")
      return
    }

    toast.success("Production lancée", {
      description: `${quantity} ${selectedRecipeData?.yieldUnit} de ${selectedRecipeData?.name}`,
    })
    setDialogOpen(false)
    setSelectedRecipe("")
    setQuantity("")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Production</h1>
          <p className="text-muted-foreground">
            Gérez vos recettes et lancez de nouvelles productions
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            setEditingRecipe(null)
            setRecipeDrawerOpen(true)
          }} className="bg-transparent">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle recette
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Play className="mr-2 h-4 w-4" />
                Lancer production
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Lancer une production</DialogTitle>
              <DialogDescription>
                Sélectionnez une recette et la quantité à produire
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Recette</Label>
                <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une recette" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipes.map(recipe => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRecipeData && (
                <>
                  <div className="space-y-2">
                    <Label>Quantité ({selectedRecipeData.yieldUnit})</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 10"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>

                  {quantity && (
                    <div className="space-y-2">
                      <Label>Matières premières requises</Label>
                      <div className="rounded-lg border divide-y">
                        {requiredMaterials.map((material, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-3 text-sm ${
                              material.sufficient ? "" : "bg-destructive/5"
                            }`}
                          >
                            <div>
                              <span className="font-medium">{material.name}</span>
                              <span className="text-muted-foreground ml-2">
                                {material.required.toFixed(2)} {material.unit}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={material.sufficient ? "text-muted-foreground" : "text-destructive"}>
                                Dispo: {material.available} {material.unit}
                              </span>
                              {material.sufficient ? (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              ) : (
                                <Badge variant="destructive" className="text-xs">
                                  Insuffisant
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleStartProduction} disabled={!canProduce}>
                <Play className="mr-2 h-4 w-4" />
                Lancer la production
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Recipe Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Fiches Techniques</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map(recipe => (
            <Card key={recipe.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{recipe.name}</CardTitle>
                    <CardDescription>{recipe.category}</CardDescription>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <ChefHat className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-3">
                  Rendement: {recipe.yieldQuantity} {recipe.yieldUnit}
                </div>
                <div className="space-y-1 mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Ingredients ({recipe.ingredients.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {recipe.ingredients.map((ing, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {ing.name} ({ing.quantity} {ing.unit})
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => {
                      setEditingRecipe(recipe)
                      setRecipeDrawerOpen(true)
                    }}
                  >
                    <Edit className="mr-1.5 h-3.5 w-3.5" />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedRecipe(recipe.id)
                      setDialogOpen(true)
                    }}
                  >
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    Produire
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <RecipeDrawer
        open={recipeDrawerOpen}
        onOpenChange={setRecipeDrawerOpen}
        recipe={editingRecipe}
      />
    </div>
  )
}
