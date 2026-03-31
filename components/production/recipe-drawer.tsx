"use client"

import { useState, useEffect, useMemo } from "react"
import { Save, Plus, X, Trash2, ChefHat, FlaskConical, StickyNote, Package, Calculator, Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useTenant } from "@/lib/tenant-context"
import { useRawMaterials, useCategories, usePackaging, useRecipes } from "@/hooks/use-tenant-data"
import { createRecipe, updateRecipe } from "@/lib/production/actions"

import { Toaster, toast } from "sonner"

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
  onSuccess?: () => void
}

interface PackagingItem {
  packagingId: string
  name: string
  quantity: number
  weight: number // poids par unité en grammes
  unit: string
}

export function RecipeDrawer({ open, onOpenChange, recipe, onSuccess }: RecipeDrawerProps) {
  const { currentTenant } = useTenant()
  const { data: rawMaterials = [] } = useRawMaterials()
  const { data: categories = [] } = useCategories()
  const { data: packagingList = [] } = usePackaging()
  const { data: existingRecipes = [] } = useRecipes()
  const isEditing = !!recipe

  const [name, setName] = useState("")
  const [openNameCombobox, setOpenNameCombobox] = useState(false)
  const [customNameInput, setCustomNameInput] = useState("")
  const [category, setCategory] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState("")
  const [ingredientQty, setIngredientQty] = useState("")
  const [saving, setSaving] = useState(false)
  
  // Conditionnement
  const [packagingItems, setPackagingItems] = useState<PackagingItem[]>([])
  const [selectedPackaging, setSelectedPackaging] = useState("")
  const [packagingQty, setPackagingQty] = useState("")
  const [packagingWeight, setPackagingWeight] = useState("")
  const [openMaterialPopover, setOpenMaterialPopover] = useState(false)
  const [openPackagingPopover, setOpenPackagingPopover] = useState(false)

  const allCategories = [...categories.map((c: any) => c.name), ...customCategories]

  // Calcul automatique de la quantité totale théorique (somme des ingrédients en kg/g)
  const theoreticalTotal = useMemo(() => {
    let totalGrams = 0
    ingredients.forEach(ing => {
      const qty = parseFloat(ing.quantity) || 0
      if (ing.unit === "kg") {
        totalGrams += qty * 1000
      } else if (ing.unit === "g") {
        totalGrams += qty
      } else if (ing.unit === "L" || ing.unit === "l") {
        totalGrams += qty * 1000 // approximation 1L = 1kg
      } else if (ing.unit === "ml") {
        totalGrams += qty
      } else {
        // Pour les unités non-masse (pcs, etc.), on ne peut pas calculer
        totalGrams += 0
      }
    })
    return totalGrams
  }, [ingredients])

  // Calcul du total conditionné
  const packagedTotal = useMemo(() => {
    return packagingItems.reduce((sum, item) => sum + (item.quantity * item.weight), 0)
  }, [packagingItems])

  // Calcul des pertes
  const wastage = useMemo(() => {
    if (theoreticalTotal === 0) return { grams: 0, percent: 0 }
    const diff = theoreticalTotal - packagedTotal
    return {
      grams: diff,
      percent: (diff / theoreticalTotal) * 100
    }
  }, [theoreticalTotal, packagedTotal])

  // Rendement final (nombre total d'unités)
  const totalYield = useMemo(() => {
    return packagingItems.reduce((sum, item) => sum + item.quantity, 0)
  }, [packagingItems])

  const handleAddCategory = () => {
    if (!newCategory.trim()) return
    setCustomCategories(prev => [...prev, newCategory.trim()])
    setCategory(newCategory.trim())
    setNewCategory(""); setShowNewCategory(false)
  }

  useEffect(() => {
    if (recipe) {
      setName(recipe.name); setCategory(recipe.category)
      setIngredients((recipe.ingredients || []).map((ing: any) => ({
        materialId: ing.raw_material_id || ing.materialId,
        name: ing.name, quantity: ing.quantity.toString(), unit: ing.unit,
      })))
      setPackagingItems((recipe.packaging || []).map((pkg: any) => ({
        packagingId: pkg.packaging_id || pkg.packagingId,
        name: pkg.name,
        quantity: pkg.quantity,
        weight: pkg.weight_grams || pkg.weight,
        unit: pkg.unit
      })))
    } else { resetForm() }
  }, [recipe, open])

  const resetForm = () => {
    setName(""); setCustomNameInput(""); setCategory(""); setNotes("")
    setIngredients([]); setSelectedMaterial(""); setIngredientQty("")
    setPackagingItems([]); setSelectedPackaging(""); setPackagingQty(""); setPackagingWeight("")
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

  // Fonctions pour le conditionnement
  const addPackaging = () => {
    if (!selectedPackaging || !packagingQty || !packagingWeight) {
      toast.error("Selectionnez un emballage, une quantite et un poids")
      return
    }
    const pkg = packagingList.find((p: any) => p.id === selectedPackaging)
    if (!pkg) return
    
    // Vérifier si déjà ajouté avec le même poids
    const existingIndex = packagingItems.findIndex(
      p => p.packagingId === selectedPackaging && p.weight === parseFloat(packagingWeight)
    )
    if (existingIndex !== -1) {
      // Mettre à jour la quantité
      setPackagingItems(prev => prev.map((item, idx) => 
        idx === existingIndex 
          ? { ...item, quantity: item.quantity + parseInt(packagingQty) }
          : item
      ))
    } else {
      setPackagingItems(prev => [...prev, {
        packagingId: pkg.id,
        name: pkg.name,
        quantity: parseInt(packagingQty),
        weight: parseFloat(packagingWeight),
        unit: pkg.unit || "pcs"
      }])
    }
    setSelectedPackaging(""); setPackagingQty(""); setPackagingWeight("")
  }

  const removePackaging = (index: number) => {
    setPackagingItems(prev => prev.filter((_, i) => i !== index))
  }

  const updatePackagingQty = (index: number, newQty: string) => {
    setPackagingItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: parseInt(newQty) || 0 } : item
    ))
  }

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Veuillez saisir le nom de la recette"); return }
    if (!category) { toast.error("Veuillez selectionner une categorie"); return }
    if (ingredients.length === 0) { toast.error("Ajoutez au moins un ingredient"); return }

    setSaving(true)
    try {
      const recipeData = {
        name: name.trim(), 
        category,
        yieldQuantity: totalYield,
        yieldUnit: "unites",
        instructions: notes.trim() || undefined,
        ingredients: ingredients.map(ing => ({
          rawMaterialId: ing.materialId,
          quantity: parseFloat(ing.quantity), 
          unit: ing.unit,
        })),
        packaging: packagingItems.map(pkg => ({
          packagingId: pkg.packagingId,
          name: pkg.name,
          quantity: pkg.quantity,
          weightGrams: pkg.weight,
          unit: pkg.unit
        })),
      }
      
      let result
      if (isEditing && recipe?.id) {
        result = await updateRecipe(recipe.id, currentTenant.id, recipeData)
      } else {
        result = await createRecipe(currentTenant.id, recipeData)
      }
      
      if (!result) {
        toast.error("Erreur: la recette n'a pas ete sauvegardee")
        return
      }
      
      toast.success(isEditing ? "Recette modifiee" : "Recette creee", {
        description: `"${name}" - ${ingredients.length} ingredients, ${totalYield} unites`,
      })
      
      // Revalidate recipe cache via onSuccess callback
      onSuccess?.()
  resetForm(); onOpenChange(false)
    } catch (error) { 
      console.error("Error saving recipe:", error)
      toast.error("Erreur lors de la sauvegarde") 
    }
    finally { setSaving(false) }
  }

  const availableMaterials = rawMaterials.filter((m: any) => !ingredients.some(i => i.materialId === m.id))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full p-0 flex flex-col gap-0 overflow-y-auto [&>button]:top-5 [&>button]:right-5 [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100 [&>button]:bg-white/20 [&>button]:rounded-full [&>button]:p-1.5">
        {/* Header avec gradient attractif */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 px-6 py-10 text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full" />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-4 shadow-lg">
              <ChefHat className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">{isEditing ? "Modifier la recette" : "Nouvelle fiche technique"}</h2>
            <p className="text-sm opacity-80 mt-1">{isEditing ? `Modification de "${recipe?.name}"` : "Definissez les ingredients et le conditionnement"}</p>
          </div>
        </div>

        <div className="flex-1 px-6 py-6 space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><ChefHat className="h-3.5 w-3.5" /> Informations</div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nom de la recette *</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Saisir le nom de la recette..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 bg-muted/50 border-0"
                  />
                  <Popover open={openNameCombobox} onOpenChange={setOpenNameCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-lg"
                        title="Choisir parmi les recettes existantes"
                      >
                        <ChevronsUpDown className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Chercher une recette..."
                          value={customNameInput}
                          onValueChange={setCustomNameInput}
                        />
                        <CommandList>
                          <CommandEmpty>Aucune recette trouvee.</CommandEmpty>
                          <CommandGroup heading="Recettes existantes">
                            {existingRecipes.map((r: any) => (
                              <CommandItem
                                key={r.id}
                                value={r.name}
                                onSelect={(val) => {
                                  // Auto-fill: copier le nom et pre-remplir les ingredients
                                  setName(val)
                                  setCustomNameInput("")
                                  setOpenNameCombobox(false)
                                  
                                  // Pre-remplir la categorie
                                  if (r.category) {
                                    setCategory(r.category)
                                  }
                                  
                                  // Pre-remplir les ingredients si disponibles
                                  if (r.ingredients && r.ingredients.length > 0) {
                                    const existingIngs = r.ingredients.map((ing: any) => ({
                                      materialId: ing.raw_material_id || ing.materialId,
                                      name: ing.name,
                                      quantity: ing.quantity?.toString() || "0",
                                      unit: ing.unit || "g"
                                    }))
                                    setIngredients(existingIngs)
                                    toast.success("Recette pre-remplie", {
                                      description: `${existingIngs.length} ingredients copies depuis "${val}"`
                                    })
                                  }
                                  
                                  // Pre-remplir le conditionnement si disponible
                                  if (r.packaging && r.packaging.length > 0) {
                                    const existingPkgs = r.packaging.map((pkg: any) => ({
                                      packagingId: pkg.packaging_id || pkg.packagingId,
                                      name: pkg.name,
                                      quantity: pkg.quantity || 0,
                                      weight: pkg.weight_grams || pkg.weight || 0,
                                      unit: pkg.unit || "pcs"
                                    }))
                                    setPackagingItems(existingPkgs)
                                  }
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", name === r.name ? "opacity-100" : "opacity-0")} />
                                <div className="flex-1">
                                  <div className="font-medium">{r.name}</div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {r.category && <span>{r.category}</span>}
                                    {r.ingredients?.length > 0 && (
                                      <Badge variant="secondary" className="h-4 text-[10px]">
                                        {r.ingredients.length} ing.
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-[11px] text-muted-foreground">Saisir directement ou cliquer sur l'icone pour choisir parmi les recettes existantes</p>
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
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><FlaskConical className="h-3.5 w-3.5" /> Ingredients</div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="flex gap-2">
                <Popover open={openMaterialPopover} onOpenChange={setOpenMaterialPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openMaterialPopover}
                      className="flex-1 justify-between bg-muted/50 border-0 font-normal"
                    >
                      {selectedMaterial 
                        ? rawMaterials.find((m: any) => m.id === selectedMaterial)?.name || "Matiere premiere"
                        : "Matiere premiere"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher une matiere..." />
                      <CommandList>
                        <CommandEmpty>Aucune matiere trouvee.</CommandEmpty>
                        <CommandGroup heading="Matieres premieres disponibles">
                          {availableMaterials.map((m: any) => (
                            <CommandItem
                              key={m.id}
                              value={m.name}
                              onSelect={() => {
                                setSelectedMaterial(m.id)
                                setOpenMaterialPopover(false)
                                // Auto-focus sur le champ quantite
                                setTimeout(() => {
                                  document.getElementById("ingredient-qty-input")?.focus()
                                }, 100)
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedMaterial === m.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex-1">
                                <div className="font-medium">{m.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Unite: {m.unit} | Stock: {m.quantity || 0} {m.unit}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input 
                  id="ingredient-qty-input"
                  type="number" 
                  step="0.01" 
                  placeholder="Qte" 
                  value={ingredientQty} 
                  onChange={(e) => setIngredientQty(e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && selectedMaterial && ingredientQty) {
                      addIngredient()
                    }
                  }}
                  className="w-20 bg-muted/50 border-0" 
                />
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
              
              {/* Affichage de la quantité totale théorique */}
              {ingredients.length > 0 && theoreticalTotal > 0 && (
                <div className="rounded-lg bg-primary/10 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Quantite totale theorique</span>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {theoreticalTotal >= 1000 
                      ? `${(theoreticalTotal / 1000).toFixed(2)} kg`
                      : `${theoreticalTotal.toFixed(0)} g`
                    }
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Section Conditionnement */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Package className="h-3.5 w-3.5" /> Conditionnement
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="flex gap-2">
                <Popover open={openPackagingPopover} onOpenChange={setOpenPackagingPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPackagingPopover}
                      className="flex-1 justify-between bg-muted/50 border-0 font-normal"
                    >
                      {selectedPackaging 
                        ? packagingList.find((p: any) => p.id === selectedPackaging)?.name || "Emballage"
                        : "Emballage"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher un emballage..." />
                      <CommandList>
                        <CommandEmpty>Aucun emballage trouve.</CommandEmpty>
                        <CommandGroup heading="Emballages disponibles">
                          {packagingList.map((pkg: any) => (
                            <CommandItem
                              key={pkg.id}
                              value={pkg.name}
                              onSelect={() => {
                                setSelectedPackaging(pkg.id)
                                setOpenPackagingPopover(false)
                                // Auto-focus sur le champ poids
                                setTimeout(() => {
                                  document.getElementById("packaging-weight-input")?.focus()
                                }, 100)
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedPackaging === pkg.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex-1">
                                <div className="font-medium">{pkg.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Type: {pkg.type} | Stock: {pkg.quantity || 0}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input 
                  id="packaging-weight-input"
                  type="number" 
                  placeholder="Poids (g)" 
                  value={packagingWeight} 
                  onChange={(e) => setPackagingWeight(e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      document.getElementById("packaging-qty-input")?.focus()
                    }
                  }}
                  className="w-24 bg-muted/50 border-0" 
                />
                <Input 
                  id="packaging-qty-input"
                  type="number" 
                  placeholder="Qte" 
                  value={packagingQty} 
                  onChange={(e) => setPackagingQty(e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && selectedPackaging && packagingWeight && packagingQty) {
                      addPackaging()
                    }
                  }}
                  className="w-20 bg-muted/50 border-0" 
                />
                <Button size="icon" variant="outline" onClick={addPackaging} className="shrink-0 rounded-lg">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {packagingItems.length > 0 ? (
                <div className="rounded-lg border divide-y">
                  <div className="px-3 py-2 bg-muted/50">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      Conditionnement ({packagingItems.length} type{packagingItems.length > 1 ? "s" : ""})
                    </p>
                  </div>
                  {packagingItems.map((pkg, index) => (
                    <div key={index} className="flex items-center justify-between p-3 group">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-sm font-medium">{pkg.name}</span>
                        <Badge variant="outline" className="text-xs">{pkg.weight}g</Badge>
                        <div className="flex items-center gap-1">
                          <Input 
                            type="number" 
                            value={pkg.quantity} 
                            onChange={(e) => updatePackagingQty(index, e.target.value)} 
                            className="w-16 h-7 text-sm bg-muted/50 border-0 rounded-lg" 
                          />
                          <span className="text-xs text-muted-foreground">unites</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          = {((pkg.quantity * pkg.weight) / 1000).toFixed(2)} kg
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => removePackaging(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Ajoutez les emballages (pots, paquets, bouteilles...)
                </div>
              )}

              {/* Récapitulatif des calculs */}
              {packagingItems.length > 0 && theoreticalTotal > 0 && (
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Quantite theorique</span>
                    <span className="font-medium">{(theoreticalTotal / 1000).toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Quantite conditionnee</span>
                    <span className="font-medium">{(packagedTotal / 1000).toFixed(2)} kg</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm">
                    <span>Pertes estimees</span>
                    <span className={`font-medium ${wastage.grams > 0 ? "text-amber-600" : "text-green-600"}`}>
                      {wastage.grams >= 0 
                        ? `${(wastage.grams / 1000).toFixed(3)} kg (${wastage.percent.toFixed(1)}%)`
                        : `+${(Math.abs(wastage.grams) / 1000).toFixed(3)} kg (surplus)`
                      }
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                    <span>Rendement final</span>
                    <Badge className="bg-primary text-primary-foreground">{totalYield} unites</Badge>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><StickyNote className="h-3.5 w-3.5" /> Notes</div>
            <Textarea placeholder="Instructions, temps de cuisson..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl" />
          </div>
        </div>

        <div className="border-t bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 px-6 py-5 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button className="flex-1 rounded-xl h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-orange-500/25" onClick={handleSubmit} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Sauvegarde..." : isEditing ? "Enregistrer" : "Creer la recette"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
