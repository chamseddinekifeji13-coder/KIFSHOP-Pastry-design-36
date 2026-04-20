import { createClient } from "@/lib/supabase/client"
import { createNotification } from "@/lib/notifications/actions"

// ─── Types ─────────────────────────────────────────────────
export type PlanStatus = "draft" | "pending_materials" | "ready" | "in_progress" | "completed" | "cancelled"
export type MaterialStatus = "available" | "transfer_requested" | "purchase_requested" | "resolved" | "pending"

export interface PlanMaterial {
  id: string
  productionPlanId: string
  rawMaterialId: string | null
  rawMaterialName: string
  requiredQuantity: number
  unit: string
  availableInLab: number
  availableTotal: number
  deficitLab: number
  deficitTotal: number
  status: MaterialStatus
}

export interface ProductionPlan {
  id: string
  tenantId: string
  recipeId: string | null
  recipeName: string
  quantityMultiplier: number
  plannedDate: string
  labLocationId: string | null
  labLocationName: string | null
  status: PlanStatus
  notes: string | null
  createdBy: string | null
  createdByName: string | null
  materials: PlanMaterial[]
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: "Brouillon",
  pending_materials: "En attente MP",
  ready: "Pret",
  in_progress: "En cours",
  completed: "Termine",
  cancelled: "Annule",
}

// ─── Fetch all production plans ────────────────────────────
export async function fetchProductionPlans(tenantId: string): Promise<ProductionPlan[]> {
  const supabase = createClient()
  const { data: plans, error } = await supabase
    .from("production_plans")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("planned_date", { ascending: false })

  if (error) { console.error("Error fetching production plans:", error.message); return [] }
  if (!plans || plans.length === 0) return []

  // Fetch all materials for these plans
  const planIds = plans.map((p) => p.id)
  const { data: allMaterials } = await supabase
    .from("production_plan_materials")
    .select("*")
    .in("production_plan_id", planIds)

  const materialsByPlan = new Map<string, PlanMaterial[]>()
  allMaterials?.forEach((m) => {
    const list = materialsByPlan.get(m.production_plan_id) || []
    list.push({
      id: m.id,
      productionPlanId: m.production_plan_id,
      rawMaterialId: m.raw_material_id,
      rawMaterialName: m.raw_material_name,
      requiredQuantity: Number(m.required_quantity),
      unit: m.unit,
      availableInLab: Number(m.available_in_lab || 0),
      availableTotal: Number(m.available_total || 0),
      deficitLab: Number(m.deficit_lab || 0),
      deficitTotal: Number(m.deficit_total || 0),
      status: m.status as MaterialStatus,
    })
    materialsByPlan.set(m.production_plan_id, list)
  })

  return plans.map((p) => ({
    id: p.id,
    tenantId: p.tenant_id,
    recipeId: p.recipe_id,
    recipeName: p.recipe_name,
    quantityMultiplier: Number(p.quantity_multiplier),
    plannedDate: p.planned_date,
    labLocationId: p.lab_location_id,
    labLocationName: p.lab_location_name,
    status: p.status as PlanStatus,
    notes: p.notes,
    createdBy: p.created_by,
    createdByName: p.created_by_name,
    materials: materialsByPlan.get(p.id) || [],
    startedAt: p.started_at || null,
    completedAt: p.completed_at || null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }))
}

// ─── Calculate material availability against lab stock ─────
export async function calculateMaterialAvailability(
  tenantId: string,
  ingredients: { rawMaterialId: string; quantity: number; unit: string }[],
  multiplier: number,
  labLocationId?: string
): Promise<{
  materials: {
    rawMaterialId: string
    rawMaterialName: string
    requiredQuantity: number
    unit: string
    availableInLab: number
    availableTotal: number
    deficitLab: number
    deficitTotal: number
    status: MaterialStatus
  }[]
  allAvailableInLab: boolean
  allAvailableTotal: boolean
}> {
  const supabase = createClient()

  // Fetch all raw materials for this tenant
  const { data: rawMaterials } = await supabase
    .from("raw_materials")
    .select("id, name, current_stock, unit")
    .eq("tenant_id", tenantId)

  const rmMap = new Map(rawMaterials?.map((rm) => [rm.id, rm]) || [])

  // If lab location exists, fetch stock_by_location for that lab
  let labStockMap = new Map<string, number>()
  if (labLocationId) {
    const { data: labStock } = await supabase
      .from("stock_by_location")
      .select("raw_material_id, quantity")
      .eq("storage_location_id", labLocationId)
      .eq("item_type", "raw_material")
    labStock?.forEach((s) => {
      if (s.raw_material_id) {
        labStockMap.set(s.raw_material_id, Number(s.quantity || 0))
      }
    })
  }

  const materials = ingredients.map((ing) => {
    const rm = rmMap.get(ing.rawMaterialId)
    const requiredQuantity = ing.quantity * multiplier
    const availableTotal = Number(rm?.current_stock || 0)
    const availableInLab = labLocationId ? (labStockMap.get(ing.rawMaterialId) || 0) : availableTotal
    const deficitLab = Math.max(0, requiredQuantity - availableInLab)
    const deficitTotal = Math.max(0, requiredQuantity - availableTotal)

    let status: MaterialStatus = "available"
    if (deficitTotal > 0) status = "pending"
    else if (deficitLab > 0) status = "pending"

    return {
      rawMaterialId: ing.rawMaterialId,
      rawMaterialName: rm?.name || "Inconnu",
      requiredQuantity,
      unit: ing.unit,
      availableInLab,
      availableTotal,
      deficitLab,
      deficitTotal,
      status,
    }
  })

  return {
    materials,
    allAvailableInLab: materials.every((m) => m.deficitLab === 0),
    allAvailableTotal: materials.every((m) => m.deficitTotal === 0),
  }
}

// ─── Create a production plan ──────────────────────────────
export async function createProductionPlan(tenantId: string, data: {
  recipeId: string
  recipeName: string
  quantityMultiplier: number
  plannedDate: string
  labLocationId?: string
  labLocationName?: string
  notes?: string
  createdBy?: string
  createdByName?: string
  materials: {
    rawMaterialId: string
    rawMaterialName: string
    requiredQuantity: number
    unit: string
    availableInLab: number
    availableTotal: number
    deficitLab: number
    deficitTotal: number
    status: MaterialStatus
  }[]
}): Promise<ProductionPlan | null> {
  const supabase = createClient()

  // Determine initial status
  const allAvailableInLab = data.materials.every((m) => m.deficitLab === 0)
  const status: PlanStatus = allAvailableInLab ? "ready" : "pending_materials"

  const { data: plan, error } = await supabase.from("production_plans").insert({
    tenant_id: tenantId,
    recipe_id: data.recipeId,
    recipe_name: data.recipeName,
    quantity_multiplier: data.quantityMultiplier,
    planned_date: data.plannedDate,
    lab_location_id: data.labLocationId || null,
    lab_location_name: data.labLocationName || null,
    status,
    notes: data.notes || null,
    created_by: data.createdBy || null,
    created_by_name: data.createdByName || null,
  }).select().single()

  if (error) { throw new Error(error.message) }
  if (!plan) throw new Error("Aucun plan retourne")

  // Insert materials
  if (data.materials.length > 0) {
    const { error: matError } = await supabase.from("production_plan_materials").insert(
      data.materials.map((m) => ({
        production_plan_id: plan.id,
        raw_material_id: m.rawMaterialId,
        raw_material_name: m.rawMaterialName,
        required_quantity: m.requiredQuantity,
        unit: m.unit,
        available_in_lab: m.availableInLab,
        available_total: m.availableTotal,
        deficit_lab: m.deficitLab,
        deficit_total: m.deficitTotal,
        status: m.status,
      }))
    )
    if (matError) console.error("Error inserting plan materials:", matError.message)
  }

  return {
    id: plan.id, tenantId: plan.tenant_id, recipeId: plan.recipe_id,
    recipeName: plan.recipe_name, quantityMultiplier: Number(plan.quantity_multiplier),
    plannedDate: plan.planned_date, labLocationId: plan.lab_location_id,
    labLocationName: plan.lab_location_name, status: plan.status as PlanStatus,
    notes: plan.notes, createdBy: plan.created_by, createdByName: plan.created_by_name,
    materials: data.materials.map((m, i) => ({ ...m, id: `new-${i}`, productionPlanId: plan.id })),
    startedAt: plan.started_at || null,
    completedAt: plan.completed_at || null,
    createdAt: plan.created_at, updatedAt: plan.updated_at,
  }
}

// ─── Request transfer for a material (notify magasinier) ───
export async function requestMaterialTransfer(
  tenantId: string,
  planId: string,
  materialId: string,
  data: {
    rawMaterialName: string
    requiredQuantity: number
    availableInLab: number
    deficitLab: number
    unit: string
    labLocationName: string
    createdByName: string
    createdByUserId: string
  }
): Promise<void> {
  const supabase = createClient()

  // Update material status
  await supabase.from("production_plan_materials")
    .update({ status: "transfer_requested", updated_at: new Date().toISOString() })
    .eq("id", materialId)

  // Notify magasinier
  await createNotification(tenantId, {
    type: "transfer_request",
    title: `Transfert requis: ${data.rawMaterialName}`,
    message: `${data.createdByName} demande un transfert de ${data.deficitLab} ${data.unit} de "${data.rawMaterialName}" vers ${data.labLocationName}. Stock labo: ${data.availableInLab} ${data.unit}, besoin: ${data.requiredQuantity} ${data.unit}.`,
    priority: "high",
    targetRole: "magasinier",
    createdByUserId: data.createdByUserId,
    createdByName: data.createdByName,
    relatedPlanId: planId,
    relatedMaterialId: materialId,
    actionUrl: "/stocks",
  })

  // Check if plan should update status
  await refreshPlanStatus(planId)
}

// ─── Request purchase for a material (notify achat) ────────
export async function requestMaterialPurchase(
  tenantId: string,
  planId: string,
  materialId: string,
  data: {
    rawMaterialName: string
    requiredQuantity: number
    availableTotal: number
    deficitTotal: number
    unit: string
    createdByName: string
    createdByUserId: string
  }
): Promise<void> {
  const supabase = createClient()

  // Update material status
  await supabase.from("production_plan_materials")
    .update({ status: "purchase_requested", updated_at: new Date().toISOString() })
    .eq("id", materialId)

  // Notify responsable achat
  await createNotification(tenantId, {
    type: "purchase_request",
    title: `Achat requis: ${data.rawMaterialName}`,
    message: `${data.createdByName} signale un deficit total de ${data.deficitTotal} ${data.unit} de "${data.rawMaterialName}". Stock total: ${data.availableTotal} ${data.unit}, besoin: ${data.requiredQuantity} ${data.unit}. Veuillez passer commande.`,
    priority: "urgent",
    targetRole: "achat",
    createdByUserId: data.createdByUserId,
    createdByName: data.createdByName,
    relatedPlanId: planId,
    relatedMaterialId: materialId,
    actionUrl: "/approvisionnement",
  })
}

// ─── Refresh plan status based on materials ────────────────
export async function refreshPlanStatus(planId: string): Promise<void> {
  const supabase = createClient()
  const { data: materials } = await supabase
    .from("production_plan_materials")
    .select("status")
    .eq("production_plan_id", planId)

  if (!materials) return

  const allResolved = materials.every((m) => m.status === "available" || m.status === "resolved")
  const newStatus: PlanStatus = allResolved ? "ready" : "pending_materials"

  await supabase.from("production_plans")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", planId)
    .in("status", ["draft", "pending_materials", "ready"])
}

// ─── Update plan status manually ───────────────────────────
export async function updatePlanStatus(planId: string, status: PlanStatus): Promise<void> {
  const supabase = createClient()
  const updateData: Record<string, string> = { status, updated_at: new Date().toISOString() }
  if (status === "in_progress") {
    updateData.started_at = new Date().toISOString()
  } else if (status === "completed") {
    updateData.completed_at = new Date().toISOString()
  }
  await supabase.from("production_plans")
    .update(updateData)
    .eq("id", planId)
}

// ─── Resolve a material (mark as available after transfer) ─
export async function resolveMaterial(planId: string, materialId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("production_plan_materials")
    .update({ status: "resolved", updated_at: new Date().toISOString() })
    .eq("id", materialId)

  await refreshPlanStatus(planId)
}

// ─── Cancel a production plan ──────────────────────────────
export async function cancelProductionPlan(planId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("production_plans")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", planId)
}
