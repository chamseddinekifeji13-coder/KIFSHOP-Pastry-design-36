"use client"

import { useState } from "react"
import { ChefHat, Plus, Play, CheckCircle, Edit, Loader2, ClipboardList } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRecipes, useRawMaterials } from "@/hooks/use-tenant-data"
import { RecipeDrawer } from "./recipe-drawer"
import { ProductionPlanner } from "./production-planner"
import { toast } from "sonner"
import type { Recipe } from "@/lib/production/actions"

export function ProductionView() {
  const { data: recipes, isLoading: recLoading, mutate: mutateRecipes } = useRecipes()
  const { data: rawMaterials, isLoading: rmLoading } = useRawMaterials()

  const [selectedRecipe, setSelectedRecipe] = useState<string>("")
  const [quantity, setQuantity] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [recipeDrawerOpen, setRecipeDrawerOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)

  const isLoading = recLoading || rmLoading
  const allRecipes = recipes || []
  const allMaterials = rawMaterials || []
  const selectedRecipeData = allRecipes.find(r => r.id === selectedRecipe)

  const calculateRequiredMaterials = () => {
    if (!selectedRecipeData || !quantity) return []
    const qty = parseFloat(quantity)
    return selectedRecipeData.ingredients.map(ing => {
      const required = ing.quantity * qty
      const available = allMaterials.find(m => m.id === ing.rawMaterialId)?.currentStock || 0
      return { ...ing, required, available, sufficient: available >= required }
    })
  }

  const requiredMaterials = calculateRequiredMaterials()
  const canProduce = requiredMaterials.length > 0 && requiredMaterials.every(m => m.sufficient)

  const handleStartProduction = () => {
    if (!canProduce) { toast.error("Stock insuffisant pour lancer la production"); return }
    toast.success("Production lancee", { description: `${quantity} ${selectedRecipeData?.yieldUnit} de ${selectedRecipeData?.name}` })
    setDialogOpen(false); setSelectedRecipe(""); setQuantity("")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Production</h1>
          <p className="text-muted-foreground">Gerez vos recettes, planifiez et lancez vos productions</p>
        </div>
      </div>

      <Tabs defaultValue="planner" className="space-y-4">
        <TabsList>
          <TabsTrigger value="planner" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Planification</TabsTrigger>
          <TabsTrigger value="recipes" className="gap-1.5"><ChefHat className="h-3.5 w-3.5" /> Fiches techniques</TabsTrigger>
        </TabsList>

        <TabsContent value="planner">
          <ProductionPlanner />
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setEditingRecipe(null); setRecipeDrawerOpen(true) }} className="bg-transparent"><Plus className="mr-2 h-4 w-4" />Nouvelle recette</Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Play className="mr-2 h-4 w-4" />Lancer production</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Lancer une production</DialogTitle><DialogDescription>Selectionnez une recette et la quantite a produire</DialogDescription></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Recette</Label>
                  <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
                    <SelectTrigger><SelectValue placeholder="Selectionner une recette" /></SelectTrigger>
                    <SelectContent>{allRecipes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {selectedRecipeData && (
                  <>
                    <div className="space-y-2"><Label>Quantite ({selectedRecipeData.yieldUnit})</Label><Input type="number" placeholder="Ex: 10" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
                    {quantity && (
                      <div className="space-y-2">
                        <Label>Matieres premieres requises</Label>
                        <div className="rounded-lg border divide-y">
                          {requiredMaterials.map((m, idx) => (
                            <div key={idx} className={`flex items-center justify-between p-3 text-sm ${m.sufficient ? "" : "bg-destructive/5"}`}>
                              <div><span className="font-medium">{allMaterials.find(rm => rm.id === m.rawMaterialId)?.name || "?"}</span><span className="text-muted-foreground ml-2">{m.required.toFixed(2)} {m.unit}</span></div>
                              <div className="flex items-center gap-2">
                                <span className={m.sufficient ? "text-muted-foreground" : "text-destructive"}>Dispo: {m.available} {m.unit}</span>
                                {m.sufficient ? <CheckCircle className="h-4 w-4 text-primary" /> : <Badge variant="destructive" className="text-xs">Insuffisant</Badge>}
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
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleStartProduction} disabled={!canProduce}><Play className="mr-2 h-4 w-4" />Lancer la production</Button>
              </div>
              </DialogContent>
            </Dialog>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Fiches Techniques</h2>
            {isLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : allRecipes.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-16">
                <ChefHat className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">Aucune recette</p>
                <p className="text-xs text-muted-foreground mt-1">{'Creez votre premiere fiche technique'}</p>
                <Button className="mt-4" onClick={() => { setEditingRecipe(null); setRecipeDrawerOpen(true) }}><Plus className="mr-2 h-4 w-4" />Nouvelle recette</Button>
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allRecipes.map(recipe => (
                  <Card key={recipe.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div><CardTitle className="text-base">{recipe.name}</CardTitle><CardDescription>{recipe.category || 'Sans categorie'}</CardDescription></div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><ChefHat className="h-4 w-4 text-primary" /></div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground mb-3">{'Rendement:'} {recipe.yieldQuantity} {recipe.yieldUnit}</div>
                      <div className="space-y-1 mb-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{'Ingredients'} ({recipe.ingredients.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {recipe.ingredients.map((ing, idx) => {
                            const mat = allMaterials.find(m => m.id === ing.rawMaterialId)
                            return <Badge key={idx} variant="secondary" className="text-xs">{mat?.name || '?'} ({ing.quantity} {ing.unit})</Badge>
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => { setEditingRecipe(recipe); setRecipeDrawerOpen(true) }}><Edit className="mr-1.5 h-3.5 w-3.5" />Modifier</Button>
                        <Button size="sm" className="flex-1" onClick={() => { setSelectedRecipe(recipe.id); setDialogOpen(true) }}><Play className="mr-1.5 h-3.5 w-3.5" />Produire</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <RecipeDrawer open={recipeDrawerOpen} onOpenChange={setRecipeDrawerOpen} recipe={editingRecipe} onSuccess={() => mutateRecipes()} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
