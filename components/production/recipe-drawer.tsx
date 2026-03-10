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
import { createRecipe } from "@/lib/production/actions"
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

interface PackagingItem {
  packagingId: string
  name: string
  quantity: number
  weight: number // poids par unité en grammes
  unit: string
}

export function RecipeDrawer({ open, onOpenChange, recipe }: RecipeDrawerProps) {
  const { currentTenant } = useTenant()
  const { data: rawMaterials = [] } = useRawMaterials()
  const { data: categories = [] } = useCategories()
  const { data: packagingList = [] } = usePackaging()
  const { data: existingRecipes = [] } = useRecipes()
  const { mutate } = useSWRConfig()
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
      await createRecipe(currentTenant.id, {
        name: name.trim(), 
        category,
        yieldQuantity: totalYield,
        yieldUnit: "unites",
        theoreticalQuantity: theoreticalTotal,
        packagedQuantity: packagedTotal,
        wastagePercent: wastage.percent,
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
      })
      toast.success(isEditing ? "Recette modifiee" : "Recette creee", {
        description: `"${name}" - ${ingredients.length} ingredients, ${totalYield} unites`,
      })
      mutate((key: string) => typeof key === "string" && key.includes("recipes"))
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
                <Popover open={openNameCombobox} onOpenChange={setOpenNameCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openNameCombobox}
                      className="w-full justify-between bg-muted/50 border-0 font-normal"
                    >
                      <span className={cn(!name && "text-muted-foreground")}>
                        {name || "Choisir ou saisir un nom..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Chercher ou nouveau nom..."
                        value={customNameInput}
                        onValueChange={setCustomNameInput}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {customNameInput.trim() ? (
                            <button
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-2"
                              onClick={() => {
                                setName(customNameInput.trim())
                                setCustomNameInput("")
                                setOpenNameCombobox(false)
                              }}
                            >
                              <Plus className="h-4 w-4 text-primary" />
                              Creer <span className="font-semibold ml-1">"{customNameInput.trim()}"</span>
                            </button>
                          ) : "Aucune recette trouvee."}
                        </CommandEmpty>
                        <CommandGroup heading="Recettes existantes">
                          {existingRecipes.map((r: any) => (
                            <CommandItem
                              key={r.id}
                              value={r.name}
                              onSelect={(val) => {
                                setName(val)
                                setCustomNameInput("")
                                setOpenNameCombobox(false)
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", name === r.name ? "opacity-100" : "opacity-0")} />
                              <div className="flex-1">
                                <div className="font-medium">{r.name}</div>
                                {r.category && <div className="text-xs text-muted-foreground">{r.category}</div>}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {customNameInput.trim() && (
                          <CommandGroup heading="Nouveau nom">
                            <CommandItem
                              value={customNameInput.trim()}
                              onSelect={() => {
                                setName(customNameInput.trim())
                                setCustomNameInput("")
                                setOpenNameCombobox(false)
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4 text-primary" />
                              Creer "{customNameInput.trim()}"
                            </CommandItem>
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-[11px] text-muted-foreground">Choisir une recette existante ou saisir un nouveau nom</p>
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
                <Select value={selectedPackaging} onValueChange={setSelectedPackaging}>
                  <SelectTrigger className="flex-1 bg-muted/50 border-0">
                    <SelectValue placeholder="Emballage" />
                  </SelectTrigger>
                  <SelectContent>
                    {packagingList.map((pkg: any) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input 
                  type="number" 
                  placeholder="Poids (g)" 
                  value={packagingWeight} 
                  onChange={(e) => setPackagingWeight(e.target.value)} 
                  className="w-24 bg-muted/50 border-0" 
                />
                <Input 
                  type="number" 
                  placeholder="Qte" 
                  value={packagingQty} 
                  onChange={(e) => setPackagingQty(e.target.value)} 
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
