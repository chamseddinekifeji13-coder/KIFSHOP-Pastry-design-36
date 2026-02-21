"use client"

import { useState, useEffect } from "react"
import {
  CalendarDays, ChefHat, Package, AlertTriangle, CheckCircle2, ArrowRight,
  ShoppingCart, Loader2, ClipboardList, Eye, ChevronDown, ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useTenant } from "@/lib/tenant-context"
import { useRecipes, useRawMaterials, useStorageLocations, useProductionPlans } from "@/hooks/use-tenant-data"
import {
  calculateMaterialAvailability, createProductionPlan,
  requestMaterialTransfer, requestMaterialPurchase,
  updatePlanStatus, cancelProductionPlan, resolveMaterial,
  PLAN_STATUS_LABELS,
  type PlanStatus, type MaterialStatus, type ProductionPlan, type PlanMaterial,
} from "@/lib/planning/actions"
import { completeProduction } from "@/lib/production/actions"
import { toast } from "sonner"

// ─── Status badge colors ───────────────────────────────────
function statusColor(s: PlanStatus) {
  switch (s) {
    case "draft": return "bg-muted text-muted-foreground"
    case "pending_materials": return "bg-amber-100 text-amber-800"
    case "ready": return "bg-green-100 text-green-800"
    case "in_progress": return "bg-blue-100 text-blue-800"
    case "completed": return "bg-primary/10 text-primary"
    case "cancelled": return "bg-red-100 text-red-700"
    default: return "bg-muted text-muted-foreground"
  }
}

function matStatusBadge(s: MaterialStatus) {
  switch (s) {
    case "available": return <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5">Disponible</Badge>
    case "transfer_requested": return <Badge className="bg-blue-100 text-blue-800 text-[10px] px-1.5">Transfert demande</Badge>
    case "purchase_requested": return <Badge className="bg-orange-100 text-orange-800 text-[10px] px-1.5">Achat demande</Badge>
    case "resolved": return <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5">Resolu</Badge>
    case "pending": return <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5">En attente</Badge>
    default: return null
  }
}

// ─── Main component ────────────────────────────────────────
export function ProductionPlanner() {
  const { currentTenant, currentUser, authUser } = useTenant()
  const { data: recipes = [], isLoading: recLoading } = useRecipes()
  const { data: rawMaterials = [] } = useRawMaterials()
  const { data: locations = [] } = useStorageLocations()
  const { data: plans = [], isLoading: plansLoading, mutate: mutatePlans } = useProductionPlans()

  const [createOpen, setCreateOpen] = useState(false)
  const [detailPlan, setDetailPlan] = useState<ProductionPlan | null>(null)

  // Creation form state
  const [selectedRecipe, setSelectedRecipe] = useState("")
  const [multiplier, setMultiplier] = useState("1")
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().slice(0, 10))
  const [labLocationId, setLabLocationId] = useState("")
  const [notes, setNotes] = useState("")
  const [calculatedMaterials, setCalculatedMaterials] = useState<Awaited<ReturnType<typeof calculateMaterialAvailability>> | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)

  const activeLocations = locations.filter((l) => l.isActive)
  const labLocations = activeLocations.filter((l) => l.type === "laboratoire" || l.type === "reserve")
  const recipe = recipes.find((r) => r.id === selectedRecipe)

  // Calculate materials when recipe/multiplier/lab changes
  useEffect(() => {
    if (!recipe || !multiplier || Number(multiplier) <= 0) {
      setCalculatedMaterials(null)
      return
    }

    const doCalc = async () => {
      setCalculating(true)
      try {
        const result = await calculateMaterialAvailability(
          currentTenant.id,
          recipe.ingredients.map((i) => ({ rawMaterialId: i.rawMaterialId, quantity: i.quantity, unit: i.unit })),
          Number(multiplier),
          labLocationId || undefined
        )
        setCalculatedMaterials(result)
      } catch {
        setCalculatedMaterials(null)
      } finally {
        setCalculating(false)
      }
    }

    const t = setTimeout(doCalc, 300)
    return () => clearTimeout(t)
  }, [selectedRecipe, multiplier, labLocationId, currentTenant.id, recipe])

  async function handleCreate() {
    if (!recipe || !calculatedMaterials) return
    setSaving(true)
    try {
      const labLoc = activeLocations.find((l) => l.id === labLocationId)
      await createProductionPlan(currentTenant.id, {
        recipeId: recipe.id,
        recipeName: recipe.name,
        quantityMultiplier: Number(multiplier),
        plannedDate,
        labLocationId: labLocationId || undefined,
        labLocationName: labLoc?.name,
        notes: notes.trim() || undefined,
        createdBy: authUser?.id,
        createdByName: currentUser.name,
        materials: calculatedMaterials.materials,
      })
      toast.success("Plan de production cree", { description: recipe.name })
      mutatePlans()
      resetForm()
      setCreateOpen(false)
    } catch (err: any) {
      toast.error("Erreur", { description: err?.message })
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setSelectedRecipe("")
    setMultiplier("1")
    setPlannedDate(new Date().toISOString().slice(0, 10))
    setLabLocationId("")
    setNotes("")
    setCalculatedMaterials(null)
  }

  // Active/pending plans
  const activePlans = plans.filter((p) => !["completed", "cancelled"].includes(p.status))
  const pastPlans = plans.filter((p) => ["completed", "cancelled"].includes(p.status))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Planification de production</h2>
          <p className="text-sm text-muted-foreground">Planifiez vos productions et gerez les besoins en matieres premieres</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <ClipboardList className="mr-2 h-4 w-4" />
          Nouveau plan
        </Button>
      </div>

      {/* Active plans */}
      {plansLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activePlans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Aucun plan de production actif</p>
            <p className="text-xs text-muted-foreground mt-1">Creez un plan pour planifier votre prochaine production</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <ClipboardList className="mr-2 h-4 w-4" />Nouveau plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activePlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onView={() => setDetailPlan(plan)} />
          ))}
        </div>
      )}

      {/* Past plans */}
      {pastPlans.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Plans termines / annules ({pastPlans.length})</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pastPlans.slice(0, 6).map((plan) => (
              <PlanCard key={plan.id} plan={plan} onView={() => setDetailPlan(plan)} compact />
            ))}
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Nouveau plan de production</DialogTitle>
            <DialogDescription>Selectionnez une recette et le systeme calculera automatiquement les besoins en matieres premieres</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[60vh] pr-4">
            <div className="space-y-5 pb-4">
              {/* Recipe */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Recette *</Label>
                <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
                  <SelectTrigger className="bg-muted/50 border-0"><SelectValue placeholder="Choisir une recette" /></SelectTrigger>
                  <SelectContent>
                    {recipes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({r.yieldQuantity} {r.yieldUnit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Multiplier + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Multiplicateur (x recette) *</Label>
                  <Input type="number" min="0.1" step="0.5" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} className="bg-muted/50 border-0" />
                  {recipe && multiplier && (
                    <p className="text-[11px] text-muted-foreground">
                      Production: {(recipe.yieldQuantity * Number(multiplier)).toFixed(1)} {recipe.yieldUnit}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Date prevue *</Label>
                  <Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} className="bg-muted/50 border-0" />
                </div>
              </div>

              {/* Lab location */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Emplacement laboratoire</Label>
                <Select value={labLocationId} onValueChange={setLabLocationId}>
                  <SelectTrigger className="bg-muted/50 border-0"><SelectValue placeholder="Selectionner le labo" /></SelectTrigger>
                  <SelectContent>
                    {labLocations.length === 0 ? (
                      <SelectItem value="none" disabled>Aucun emplacement</SelectItem>
                    ) : (
                      labLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}{loc.designation ? ` (${loc.designation})` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Le stock sera verifie dans cet emplacement en priorite</p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Notes (optionnel)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Instructions speciales..." className="bg-muted/50 border-0 min-h-16" />
              </div>

              <Separator />

              {/* Material calculation results */}
              {calculating && (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Calcul des besoins en cours...
                </div>
              )}

              {!calculating && calculatedMaterials && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Package className="h-4 w-4" /> Besoins en matieres premieres
                    </h3>
                    {calculatedMaterials.allAvailableInLab ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">Tout disponible</Badge>
                    ) : calculatedMaterials.allAvailableTotal ? (
                      <Badge className="bg-amber-100 text-amber-800 text-xs">Transfert(s) requis</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 text-xs">Achat(s) requis</Badge>
                    )}
                  </div>

                  <div className="rounded-xl border divide-y">
                    {calculatedMaterials.materials.map((mat, idx) => (
                      <div key={idx} className={`p-3 ${mat.deficitTotal > 0 ? "bg-red-50/50" : mat.deficitLab > 0 ? "bg-amber-50/50" : ""}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{mat.rawMaterialName}</span>
                          <span className="text-sm font-semibold">{mat.requiredQuantity.toFixed(2)} {mat.unit}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                          <span>Labo: <span className={mat.deficitLab > 0 ? "text-amber-700 font-medium" : "text-green-700 font-medium"}>{mat.availableInLab.toFixed(1)}</span></span>
                          <span>Total: <span className={mat.deficitTotal > 0 ? "text-red-700 font-medium" : "text-green-700 font-medium"}>{mat.availableTotal.toFixed(1)}</span></span>
                          {mat.deficitLab > 0 && mat.deficitTotal === 0 && (
                            <span className="text-amber-700 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Deficit labo: {mat.deficitLab.toFixed(2)} {mat.unit}
                            </span>
                          )}
                          {mat.deficitTotal > 0 && (
                            <span className="text-red-700 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Deficit total: {mat.deficitTotal.toFixed(2)} {mat.unit}
                            </span>
                          )}
                          {mat.deficitLab === 0 && mat.deficitTotal === 0 && (
                            <span className="text-green-700 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> OK</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!calculatedMaterials.allAvailableInLab && (
                    <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-2">
                      Les demandes de transfert et d{"'"}achat seront envoyees automatiquement apres la creation du plan.
                    </p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving || !recipe || !calculatedMaterials}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}
              Creer le plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan detail dialog */}
      {detailPlan && (
        <PlanDetailDialog
          plan={detailPlan}
          onClose={() => setDetailPlan(null)}
          onRefresh={() => { mutatePlans(); setDetailPlan(null) }}
        />
      )}
    </div>
  )
}

// ─── Plan Card ─────────────────────────────────────────────
function PlanCard({ plan, onView, compact }: { plan: ProductionPlan; onView: () => void; compact?: boolean }) {
  const pendingMats = plan.materials.filter((m) => m.status === "pending" && (m.deficitLab > 0 || m.deficitTotal > 0))
  const transferMats = plan.materials.filter((m) => m.status === "transfer_requested")
  const purchaseMats = plan.materials.filter((m) => m.status === "purchase_requested")

  return (
    <Card className={`hover:shadow-md transition-shadow cursor-pointer ${compact ? "opacity-70" : ""}`} onClick={onView}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm truncate">{plan.recipeName}</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">x{plan.quantityMultiplier} - {new Date(plan.plannedDate).toLocaleDateString("fr-FR")}</p>
          </div>
          <Badge className={`${statusColor(plan.status)} text-[10px] shrink-0`}>
            {PLAN_STATUS_LABELS[plan.status]}
          </Badge>
        </div>
      </CardHeader>
      {!compact && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-3 text-[11px]">
            {pendingMats.length > 0 && (
              <span className="flex items-center gap-1 text-amber-700">
                <AlertTriangle className="h-3 w-3" /> {pendingMats.length} en attente
              </span>
            )}
            {transferMats.length > 0 && (
              <span className="flex items-center gap-1 text-blue-700">
                <Package className="h-3 w-3" /> {transferMats.length} transfert(s)
              </span>
            )}
            {purchaseMats.length > 0 && (
              <span className="flex items-center gap-1 text-orange-700">
                <ShoppingCart className="h-3 w-3" /> {purchaseMats.length} achat(s)
              </span>
            )}
            {pendingMats.length === 0 && transferMats.length === 0 && purchaseMats.length === 0 && plan.status !== "cancelled" && (
              <span className="flex items-center gap-1 text-green-700">
                <CheckCircle2 className="h-3 w-3" /> MP pretes
              </span>
            )}
          </div>
          {plan.labLocationName && (
            <p className="text-[10px] text-muted-foreground mt-1">Labo: {plan.labLocationName}</p>
          )}
          <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs"><Eye className="mr-1.5 h-3 w-3" /> Details</Button>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Plan Detail Dialog ────────────────────────────────────
function PlanDetailDialog({ plan, onClose, onRefresh }: { plan: ProductionPlan; onClose: () => void; onRefresh: () => void }) {
  const { currentTenant, currentUser, authUser, currentRole } = useTenant()
  const [loading, setLoading] = useState<string | null>(null)
  const [expandedMats, setExpandedMats] = useState<Set<string>>(new Set())

  const toggleMat = (id: string) => {
    setExpandedMats((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleTransferRequest(mat: PlanMaterial) {
    setLoading(mat.id)
    try {
      await requestMaterialTransfer(currentTenant.id, plan.id, mat.id, {
        rawMaterialName: mat.rawMaterialName,
        requiredQuantity: mat.requiredQuantity,
        availableInLab: mat.availableInLab,
        deficitLab: mat.deficitLab,
        unit: mat.unit,
        labLocationName: plan.labLocationName || "Laboratoire",
        createdByName: currentUser.name,
        createdByUserId: authUser?.id || "",
      })
      toast.success("Demande de transfert envoyee", { description: `${mat.rawMaterialName} - Notif envoyee au magasinier` })
      onRefresh()
    } catch (err: any) {
      toast.error("Erreur", { description: err?.message })
    } finally {
      setLoading(null)
    }
  }

  async function handlePurchaseRequest(mat: PlanMaterial) {
    setLoading(mat.id)
    try {
      await requestMaterialPurchase(currentTenant.id, plan.id, mat.id, {
        rawMaterialName: mat.rawMaterialName,
        requiredQuantity: mat.requiredQuantity,
        availableTotal: mat.availableTotal,
        deficitTotal: mat.deficitTotal,
        unit: mat.unit,
        createdByName: currentUser.name,
        createdByUserId: authUser?.id || "",
      })
      toast.success("Demande d'achat envoyee", { description: `${mat.rawMaterialName} - Notif envoyee au charge d'appro` })
      onRefresh()
    } catch (err: any) {
      toast.error("Erreur", { description: err?.message })
    } finally {
      setLoading(null)
    }
  }

  async function handleStatusChange(newStatus: PlanStatus) {
    setLoading("status")
    try {
      if (newStatus === "cancelled") {
        await cancelProductionPlan(plan.id)
        toast.success(`Plan ${PLAN_STATUS_LABELS[newStatus].toLowerCase()}`)
      } else if (newStatus === "completed" && plan.recipeId) {
        // Atomic: consume ingredients + stock deduction + production_run + plan update
        const result = await completeProduction(
          plan.recipeId,
          plan.quantityMultiplier,
          authUser?.id,
          `Plan: ${plan.recipeName} x${plan.quantityMultiplier}`,
          plan.id
        )
        if (!result.success) {
          toast.error("Erreur de production", { description: result.error })
          return
        }
        const consumed = result.ingredients_consumed || []
        const costLine = result.total_cost
          ? `Cout total: ${result.total_cost.toFixed(3)} TND${result.cost_per_unit ? ` (${result.cost_per_unit.toFixed(3)} TND/unite)` : ""}`
          : ""
        toast.success("Production terminee", {
          description: `${plan.recipeName} x${plan.quantityMultiplier}${result.finished_product_units ? ` | +${result.finished_product_units} en stock` : ""}${costLine ? ` | ${costLine}` : ""}`,
          duration: 8000,
        })
        if (consumed.length > 0) {
          const summary = consumed.map(c => `${c.name}: -${c.quantity}${c.unit} (${c.line_cost.toFixed(2)} TND)`).join("\n")
          toast.info("Stock deduit automatiquement", { description: summary, duration: 8000 })
        }
      } else {
        await updatePlanStatus(plan.id, newStatus)
        toast.success(`Plan ${PLAN_STATUS_LABELS[newStatus].toLowerCase()}`)
      }
      onRefresh()
    } catch (err: any) {
      toast.error("Erreur", { description: err?.message })
    } finally {
      setLoading(null)
    }
  }

  async function handleResolveMaterial(mat: PlanMaterial) {
    setLoading(mat.id)
    try {
      await resolveMaterial(plan.id, mat.id)
      toast.success("Matiere marquee comme disponible")
      onRefresh()
    } catch (err: any) {
      toast.error("Erreur", { description: err?.message })
    } finally {
      setLoading(null)
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                {plan.recipeName}
              </DialogTitle>
              <DialogDescription>
                x{plan.quantityMultiplier} - {new Date(plan.plannedDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </DialogDescription>
            </div>
            <Badge className={`${statusColor(plan.status)} text-xs shrink-0`}>
              {PLAN_STATUS_LABELS[plan.status]}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[55vh]">
          <div className="space-y-4 pr-4">
            {/* Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {plan.labLocationName && (
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <span className="text-[10px] text-muted-foreground block">Laboratoire</span>
                  <span className="font-medium text-xs">{plan.labLocationName}</span>
                </div>
              )}
              {plan.createdByName && (
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <span className="text-[10px] text-muted-foreground block">Cree par</span>
                  <span className="font-medium text-xs">{plan.createdByName}</span>
                </div>
              )}
            </div>

            {plan.notes && (
              <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Notes:</span> {plan.notes}
              </div>
            )}

            <Separator />

            {/* Materials */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" /> Matieres premieres ({plan.materials.length})
              </h3>
              <div className="rounded-xl border divide-y">
                {plan.materials.map((mat) => {
                  const expanded = expandedMats.has(mat.id)
                  const hasDeficitLab = mat.deficitLab > 0
                  const hasDeficitTotal = mat.deficitTotal > 0
                  const canAction = mat.status === "pending" && (hasDeficitLab || hasDeficitTotal)
                  const isTransferRequested = mat.status === "transfer_requested"
                  const isPurchaseRequested = mat.status === "purchase_requested"

                  return (
                    <div key={mat.id} className={`${hasDeficitTotal ? "bg-red-50/30" : hasDeficitLab ? "bg-amber-50/30" : ""}`}>
                      <button
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                        onClick={() => toggleMat(mat.id)}
                      >
                        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{mat.rawMaterialName}</span>
                            {matStatusBadge(mat.status)}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Besoin: {mat.requiredQuantity.toFixed(2)} {mat.unit} | Labo: {mat.availableInLab.toFixed(1)} | Total: {mat.availableTotal.toFixed(1)}
                          </p>
                        </div>
                        {!hasDeficitLab && !hasDeficitTotal && (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        )}
                        {hasDeficitLab && !hasDeficitTotal && (
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        )}
                        {hasDeficitTotal && (
                          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                        )}
                      </button>

                      {expanded && (
                        <div className="px-3 pb-3 pl-10 space-y-2">
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div className="bg-muted/50 rounded p-2">
                              <span className="text-muted-foreground block">Besoin</span>
                              <span className="font-semibold">{mat.requiredQuantity.toFixed(2)} {mat.unit}</span>
                            </div>
                            <div className="bg-muted/50 rounded p-2">
                              <span className="text-muted-foreground block">Stock labo</span>
                              <span className={`font-semibold ${hasDeficitLab ? "text-amber-700" : "text-green-700"}`}>{mat.availableInLab.toFixed(1)} {mat.unit}</span>
                            </div>
                            <div className="bg-muted/50 rounded p-2">
                              <span className="text-muted-foreground block">Stock total</span>
                              <span className={`font-semibold ${hasDeficitTotal ? "text-red-700" : "text-green-700"}`}>{mat.availableTotal.toFixed(1)} {mat.unit}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          {canAction && hasDeficitLab && !hasDeficitTotal && (
                            <Button
                              size="sm" className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700"
                              disabled={loading === mat.id}
                              onClick={(e) => { e.stopPropagation(); handleTransferRequest(mat) }}
                            >
                              {loading === mat.id ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <ArrowRight className="mr-1.5 h-3 w-3" />}
                              Demander transfert au magasinier ({mat.deficitLab.toFixed(2)} {mat.unit})
                            </Button>
                          )}

                          {canAction && hasDeficitTotal && (
                            <div className="flex gap-2">
                              {hasDeficitLab && (
                                <Button
                                  size="sm" className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                                  disabled={loading === mat.id}
                                  onClick={(e) => { e.stopPropagation(); handleTransferRequest(mat) }}
                                >
                                  {loading === mat.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ArrowRight className="mr-1 h-3 w-3" />}
                                  Transfert
                                </Button>
                              )}
                              <Button
                                size="sm" variant="destructive" className="flex-1 h-8 text-xs"
                                disabled={loading === mat.id}
                                onClick={(e) => { e.stopPropagation(); handlePurchaseRequest(mat) }}
                              >
                                {loading === mat.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ShoppingCart className="mr-1 h-3 w-3" />}
                                Notifier achat ({mat.deficitTotal.toFixed(2)} {mat.unit})
                              </Button>
                            </div>
                          )}

                          {/* Magasinier can mark resolved */}
                          {(isTransferRequested || isPurchaseRequested) && (currentRole === "magasinier" || currentRole === "owner" || currentRole === "gerant") && (
                            <Button
                              size="sm" variant="outline" className="w-full h-8 text-xs bg-transparent"
                              disabled={loading === mat.id}
                              onClick={(e) => { e.stopPropagation(); handleResolveMaterial(mat) }}
                            >
                              {loading === mat.id ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3 w-3" />}
                              Marquer comme approvisionne
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="flex justify-between gap-3 pt-3 border-t">
          <div className="flex gap-2">
            {plan.status === "ready" && (
              <Button size="sm" onClick={() => handleStatusChange("in_progress")} disabled={loading === "status"}>
                {loading === "status" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ChefHat className="mr-1.5 h-3.5 w-3.5" />}
                Lancer production
              </Button>
            )}
            {plan.status === "in_progress" && (
              <Button size="sm" onClick={() => handleStatusChange("completed")} disabled={loading === "status"}>
                {loading === "status" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                Terminer production
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {!["completed", "cancelled"].includes(plan.status) && (
              <Button size="sm" variant="outline" className="bg-transparent text-destructive hover:bg-destructive/10" onClick={() => handleStatusChange("cancelled")} disabled={loading === "status"}>
                Annuler
              </Button>
            )}
            <Button size="sm" variant="outline" className="bg-transparent" onClick={onClose}>Fermer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
