"use client"

import React, { useState } from "react"
import { ChefHat, Plus, Play, CheckCircle, Edit, Loader2, ClipboardList, AlertTriangle, Package } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRecipes, useRawMaterials } from "@/hooks/use-tenant-data"
import { useTenant } from "@/lib/tenant-context"
import { RecipeDrawer } from "./recipe-drawer"
import { ProductionBatchDrawer } from "./production-batch-drawer"
import { RecipeCostPanel } from "./recipe-cost-panel"
import { toast } from "sonner"
import { consumeRecipeIngredients, type Recipe } from "@/lib/production/actions"
import { useI18n } from "@/lib/i18n/context"
import useSWR from "swr"
import { fetchProductionBatches } from "@/lib/production/actions"

// Error boundary to catch planner crashes
class PlannerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: "" }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-8 w-8 text-destructive/60 mb-3" />
            <p className="text-sm font-medium">Erreur lors du chargement du planificateur</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md text-center">{this.state.error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => this.setState({ hasError: false, error: "" })}>Reessayer</Button>
          </CardContent>
        </Card>
      )
    }
    return this.props.children
  }
}

// Lazy load planner
const ProductionPlanner = React.lazy(() =>
  import("./production-planner").then(mod => ({ default: mod.ProductionPlanner }))
)

export function ProductionView() {
  const { t } = useI18n()
  const { authUser, currentTenant } = useTenant()
  const { data: recipes, isLoading: recLoading, mutate: mutateRecipes } = useRecipes()
  const { data: rawMaterials, isLoading: rmLoading, mutate: mutateRawMaterials } = useRawMaterials()
  const { data: batches = [], mutate: mutateBatches } = useSWR(
    currentTenant ? ["production-batches", currentTenant.id] : null,
    ([_, tenantId]) => fetchProductionBatches(tenantId),
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  )

  const [activeTab, setActiveTab] = useState("planner")
  const [producing, setProducing] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<string>("")
  const [quantity, setQuantity] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [recipeDrawerOpen, setRecipeDrawerOpen] = useState(false)
  const [batchDrawerOpen, setBatchDrawerOpen] = useState(false)
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

  const handleStartProduction = async () => {
    if (!canProduce || !selectedRecipeData) { toast.error("Stock insuffisant pour lancer la production"); return }
    setProducing(true)
    try {
      const result = await consumeRecipeIngredients(
        selectedRecipeData.id,
        parseFloat(quantity),
        authUser?.id,
        `Production de ${quantity}x ${selectedRecipeData.name}`
      )
      if (!result.success) {
        toast.error("Erreur de production", { description: result.error })
        return
      }
      // Build summary of consumed ingredients
      const consumed = result.ingredients_consumed || []
      const costLine = result.total_cost
        ? `Cout: ${result.total_cost.toFixed(3)} TND${result.cost_per_unit ? ` (${result.cost_per_unit.toFixed(3)} TND/u)` : ""}`
        : ""
      toast.success("Production terminee", {
        description: `${selectedRecipeData.name} x${quantity}${result.finished_product_units ? ` | +${result.finished_product_units} ${selectedRecipeData.yieldUnit} en stock` : ""}${costLine ? ` | ${costLine}` : ""}`,
        duration: 6000,
      })
      if (consumed.length > 0) {
        const summary = consumed.map(c => `${c.name}: -${c.quantity}${c.unit} (${c.line_cost.toFixed(2)} TND)`).join("\n")
        toast.info("Stock deduit automatiquement", { description: summary, duration: 8000 })
      }
      // Refresh data
      mutateRawMaterials()
      mutateRecipes()
      setDialogOpen(false); setSelectedRecipe(""); setQuantity("")
    } catch (err: unknown) {
      toast.error("Erreur inattendue", { description: err instanceof Error ? err.message : "Veuillez reessayer" })
    } finally {
      setProducing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("production.title")}</h1>
          <p className="text-muted-foreground">{t("production.subtitle")}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="planner" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Planification</TabsTrigger>
          <TabsTrigger value="batches" className="gap-1.5"><Package className="h-3.5 w-3.5" /> Lots de production</TabsTrigger>
          <TabsTrigger value="recipes" className="gap-1.5"><ChefHat className="h-3.5 w-3.5" /> Fiches techniques</TabsTrigger>
        </TabsList>

        <TabsContent value="planner">
          <PlannerErrorBoundary>
            <React.Suspense fallback={
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Chargement du planificateur...</span>
              </div>
            }>
              <ProductionPlanner />
            </React.Suspense>
          </PlannerErrorBoundary>
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setBatchDrawerOpen(true)} className="bg-transparent"><Plus className="mr-2 h-4 w-4" />Nouveau lot</Button>
          </div>
          
          {batches.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium">Aucun lot de production</p>
                <p className="text-sm text-muted-foreground">Creer un lot pour commencer a produire</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {batches.map((batch) => (
                <Card key={batch.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{batch.recipeName}</CardTitle>
                        <CardDescription>{new Date(batch.productionDate).toLocaleDateString("fr-FR")}</CardDescription>
                      </div>
                      <Badge variant={
                        batch.status === "termine" ? "default" :
                        batch.status === "partiellement_conditionne" ? "secondary" :
                        "outline"
                      }>
                        {batch.status === "en_cours" ? "En cours" : 
                         batch.status === "partiellement_conditionne" ? "Partiellement" :
                         "Termine"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Produit</p>
                        <p className="font-semibold">{batch.producedQuantity} {batch.producedUnit}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Restant</p>
                        <p className="font-semibold text-amber-600">{batch.remainingQuantity} {batch.producedUnit}</p>
                      </div>
                    </div>
                    {batch.notes && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm">{batch.notes}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">Ajouter emballage</Button>
                      <Button size="sm" variant="outline" className="flex-1">Details</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
                      <div className="space-y-4">
                        <RecipeCostPanel recipeId={selectedRecipe} defaultQuantity={parseFloat(quantity) || 1} />
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
                <Button onClick={handleStartProduction} disabled={!canProduce || producing}>
                  {producing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Production en cours...</> : <><Play className="mr-2 h-4 w-4" />Lancer la production</>}
                </Button>
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
                      <div className="mb-3 border-t pt-3">
                        <RecipeCostPanel recipeId={recipe.id} compact />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => { setEditingRecipe(recipe); setRecipeDrawerOpen(true) }}><Edit className="mr-1.5 h-3.5 w-3.5" />Modifier</Button>
                        <Button size="sm" className="flex-1" onClick={() => { setSelectedRecipe(recipe.id); setBatchDrawerOpen(true) }}><Play className="mr-1.5 h-3.5 w-3.5" />Produire</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <RecipeDrawer open={recipeDrawerOpen} onOpenChange={setRecipeDrawerOpen} recipe={editingRecipe} onSuccess={() => mutateRecipes()} />
          <ProductionBatchDrawer open={batchDrawerOpen} onOpenChange={setBatchDrawerOpen} preselectedRecipeId={selectedRecipe} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
