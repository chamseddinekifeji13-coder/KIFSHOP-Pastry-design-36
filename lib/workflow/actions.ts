import { createClient } from "@/lib/supabase/client"

// ─── TYPES ────────────────────────────────────────────────

export interface StockAlert {
  id: string
  tenantId: string
  itemType: 'raw_material' | 'packaging' | 'consumable'
  itemName: string
  itemUnit: string
  currentStock: number
  minStock: number
  suggestedQuantity: number
  severity: 'critical' | 'warning' | 'info'
  status: 'pending' | 'converted' | 'ignored' | 'resolved'
  preferredSupplier?: string
  convertedToAppro?: string
  convertedAt?: string
}

export interface BonApprovisionnement {
  id: string
  tenantId: string
  reference: string
  status: 'draft' | 'validated' | 'sent_to_suppliers' | 'partially_ordered' | 'fully_ordered' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  notes?: string
  totalItems: number
  estimatedTotal: number
  createdAt: string
  validatedAt?: string
  items: BonApprovItem[]
}

export interface BonApprovItem {
  id: string
  bonApprovId: string
  stockAlertId?: string
  itemType: 'raw_material' | 'packaging' | 'consumable'
  itemName: string
  itemUnit: string
  requestedQuantity: number
  validatedQuantity?: number
  estimatedUnitPrice?: number
  estimatedTotal?: number
  assignedSupplier?: string
  status: 'pending' | 'validated' | 'ordered' | 'received' | 'cancelled'
}

export interface WorkflowAudit {
  id: string
  tenantId: string
  entityType: 'stock_alert' | 'bon_approvisionnement' | 'purchase_order'
  entityId: string
  action: 'created' | 'updated' | 'validated' | 'cancelled' | 'converted' | 'sent_to_supplier' | 'ordered' | 'received'
  oldStatus?: string
  newStatus?: string
  details?: Record<string, any>
  performedAt: string
  performedBy?: string
}

// ─── 1. STOCK ALERT TO BON APPROVISIONNEMENT ────────────────

/**
 * Crée un bon d'approvisionnement à partir d'une alerte stock
 */
export async function convertAlertToApprovisionnement(
  alertId: string,
  tenantId: string,
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
): Promise<BonApprovisionnement | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree")

  // Récupérer l'alerte stock
  const { data: alert, error: alertError } = await supabase
    .from("stock_alerts")
    .select("*")
    .eq("id", alertId)
    .single()

  if (alertError || !alert) {
    console.error("Alert not found:", alertError?.message)
    return null
  }

  // Générer une référence unique
  const reference = `BA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`

  // Créer le bon d'approvisionnement
  const { data: bonAppro, error: bonError } = await supabase
    .from("bon_approvisionnement")
    .insert({
      tenant_id: tenantId,
      reference,
      status: "draft",
      priority,
      total_items: 1,
      estimated_total: (alert.suggested_quantity * (alert.estimated_unit_price || 0)),
      created_by: user.id,
      notes: `Créé à partir de l'alerte stock: ${alert.item_name}`,
    })
    .select()
    .single()

  if (bonError || !bonAppro) {
    console.error("Error creating bon approvisionnement:", bonError?.message)
    return null
  }

  // Créer l'item du bon
  const { error: itemError } = await supabase
    .from("bon_approvisionnement_items")
    .insert({
      bon_appro_id: bonAppro.id,
      stock_alert_id: alertId,
      item_type: alert.item_type,
      raw_material_id: alert.raw_material_id,
      item_name: alert.item_name,
      item_unit: alert.item_unit,
      requested_quantity: alert.suggested_quantity,
      estimated_unit_price: alert.estimated_unit_price,
      estimated_total: alert.suggested_quantity * (alert.estimated_unit_price || 0),
      assigned_supplier_name: alert.preferred_supplier_name,
      status: "pending",
    })

  if (itemError) {
    console.error("Error creating bon item:", itemError.message)
    // Supprimer le bon créé en cas d'erreur
    await supabase.from("bon_approvisionnement").delete().eq("id", bonAppro.id)
    return null
  }

  // Mettre à jour l'alerte stock
  await supabase
    .from("stock_alerts")
    .update({
      status: "converted",
      converted_to_appro_id: bonAppro.id,
      converted_at: new Date().toISOString(),
      converted_by: user.id,
    })
    .eq("id", alertId)

  // Enregistrer dans l'audit
  await logWorkflowAction("stock_alert", alertId, "converted", "pending", "converted", {
    bon_approvId: bonAppro.id,
    reference: reference,
  }, tenantId, user.id)

  return {
    id: bonAppro.id,
    tenantId: bonAppro.tenant_id,
    reference: bonAppro.reference,
    status: bonAppro.status as any,
    priority: bonAppro.priority as any,
    notes: bonAppro.notes,
    totalItems: bonAppro.total_items,
    estimatedTotal: bonAppro.estimated_total,
    createdAt: bonAppro.created_at,
    items: [{
      id: "",
      bonApprovId: bonAppro.id,
      stockAlertId: alertId,
      itemType: alert.item_type as any,
      itemName: alert.item_name,
      itemUnit: alert.item_unit,
      requestedQuantity: alert.suggested_quantity,
      estimatedUnitPrice: alert.estimated_unit_price,
      status: "pending" as any,
    }],
  }
}

// ─── 2. VALIDATE BON APPROVISIONNEMENT ────────────────

/**
 * Valide un bon d'approvisionnement par le magasinier
 */
export async function validateBonApprovisionnement(
  bonApprovId: string,
  tenantId: string,
  itemUpdates: Array<{ itemId: string; validatedQuantity: number; assignedSupplier?: string }>
): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree")

  try {
    // Mettre à jour chaque item
    for (const update of itemUpdates) {
      await supabase
        .from("bon_approvisionnement_items")
        .update({
          validated_quantity: update.validatedQuantity,
          assigned_supplier_name: update.assignedSupplier,
          status: "validated",
          updated_at: new Date().toISOString(),
        })
        .eq("id", update.itemId)
    }

    // Mettre à jour le bon
    const { error } = await supabase
      .from("bon_approvisionnement")
      .update({
        status: "validated",
        validated_by: user.id,
        validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", bonApprovId)

    if (error) {
      console.error("Error validating bon:", error.message)
      return false
    }

    // Enregistrer dans l'audit
    await logWorkflowAction("bon_approvisionnement", bonApprovId, "validated", "draft", "validated", {
      itemsValidated: itemUpdates.length,
    }, tenantId, user.id)

    return true
  } catch (err: any) {
    console.error("Error in validateBonApprovisionnement:", err.message)
    return false
  }
}

// ─── 3. CREATE PURCHASE ORDERS FROM BON APPROVISIONNEMENT ────────────────

/**
 * Crée les commandes fournisseurs à partir du bon d'approvisionnement validé
 * Regroupe les items par fournisseur
 */
export async function createPurchaseOrdersFromBonApprov(
  bonApprovId: string,
  tenantId: string
): Promise<string[] | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree")

  try {
    // Récupérer le bon et ses items
    const { data: items } = await supabase
      .from("bon_approvisionnement_items")
      .select("*")
      .eq("bon_appro_id", bonApprovId)

    if (!items || items.length === 0) {
      console.error("No items found in bon approvisionnement")
      return null
    }

    // Grouper par fournisseur
    const itemsBySupplier: Record<string, any[]> = {}
    for (const item of items) {
      const supplierName = item.assigned_supplier_name || "Non assigné"
      if (!itemsBySupplier[supplierName]) {
        itemsBySupplier[supplierName] = []
      }
      itemsBySupplier[supplierName].push(item)
    }

    // Créer une commande par fournisseur
    const purchaseOrderIds: string[] = []
    for (const [supplierName, supplierItems] of Object.entries(itemsBySupplier)) {
      const totalAmount = supplierItems.reduce((sum, item) => {
        return sum + ((item.validated_quantity || item.requested_quantity) * (item.estimated_unit_price || 0))
      }, 0)

      // Créer l'enregistrement de commande (structure flexible selon votre système)
      const { data: purchaseOrder, error: poError } = await supabase
        .from("purchase_orders") // À adapter selon votre table réelle
        .insert({
          tenant_id: tenantId,
          supplier_name: supplierName,
          bon_approv_id: bonApprovId,
          status: "draft",
          total_amount: totalAmount,
          created_by: user.id,
          notes: `Créé du bon d'approvisionnement: ${bonApprovId}`,
        })
        .select()
        .single()

      if (poError) {
        console.error(`Error creating purchase order for ${supplierName}:`, poError.message)
        continue
      }

      // Lier les items à la commande
      for (const item of supplierItems) {
        await supabase
          .from("bon_approvisionnement_items")
          .update({
            purchase_order_id: purchaseOrder.id,
            ordered_quantity: item.validated_quantity || item.requested_quantity,
            ordered_at: new Date().toISOString(),
            status: "ordered",
          })
          .eq("id", item.id)
      }

      purchaseOrderIds.push(purchaseOrder.id)
    }

    // Mettre à jour le bon
    await supabase
      .from("bon_approvisionnement")
      .update({
        status: "sent_to_suppliers",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bonApprovId)

    // Enregistrer dans l'audit
    await logWorkflowAction("bon_approvisionnement", bonApprovId, "sent_to_supplier", "validated", "sent_to_suppliers", {
      purchaseOrdersCreated: purchaseOrderIds.length,
      suppliersCount: Object.keys(itemsBySupplier).length,
    }, tenantId, user.id)

    return purchaseOrderIds
  } catch (err: any) {
    console.error("Error in createPurchaseOrdersFromBonApprov:", err.message)
    return null
  }
}

// ─── 4. FETCH BON APPROVISIONNEMENT LIST ────────────────

export async function fetchBonsApprovisionnement(
  tenantId: string,
  status?: string
): Promise<BonApprovisionnement[]> {
  const supabase = createClient()

  let query = supabase
    .from("bon_approvisionnement")
    .select(`
      *,
      bon_approvisionnement_items (*)
    `)
    .eq("tenant_id", tenantId)

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching bons approvisionnement:", error.message)
    return []
  }

  return (data || []).map((b) => ({
    id: b.id,
    tenantId: b.tenant_id,
    reference: b.reference,
    status: b.status as any,
    priority: b.priority as any,
    notes: b.notes,
    totalItems: b.total_items,
    estimatedTotal: b.estimated_total,
    createdAt: b.created_at,
    validatedAt: b.validated_at,
    items: (b.bon_approvisionnement_items || []).map((item: any) => ({
      id: item.id,
      bonApprovId: item.bon_appro_id,
      stockAlertId: item.stock_alert_id,
      itemType: item.item_type,
      itemName: item.item_name,
      itemUnit: item.item_unit,
      requestedQuantity: item.requested_quantity,
      validatedQuantity: item.validated_quantity,
      estimatedUnitPrice: item.estimated_unit_price,
      estimatedTotal: item.estimated_total,
      assignedSupplier: item.assigned_supplier_name,
      status: item.status,
    })),
  }))
}

// ─── 5. FETCH WORKFLOW AUDIT LOG ────────────────

export async function fetchWorkflowAudit(
  tenantId: string,
  entityType?: string,
  entityId?: string,
  limit: number = 50
): Promise<WorkflowAudit[]> {
  const supabase = createClient()

  let query = supabase
    .from("workflow_audit_log")
    .select("*")
    .eq("tenant_id", tenantId)

  if (entityType) query = query.eq("entity_type", entityType)
  if (entityId) query = query.eq("entity_id", entityId)

  const { data, error } = await query
    .order("performed_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching audit log:", error.message)
    return []
  }

  return (data || []).map((log: any) => ({
    id: log.id,
    tenantId: log.tenant_id,
    entityType: log.entity_type,
    entityId: log.entity_id,
    action: log.action,
    oldStatus: log.old_status,
    newStatus: log.new_status,
    details: log.details,
    performedAt: log.performed_at,
    performedBy: log.performed_by,
  }))
}

// ─── 6. HELPER: LOG WORKFLOW ACTION ────────────────

async function logWorkflowAction(
  entityType: 'stock_alert' | 'bon_approvisionnement' | 'purchase_order',
  entityId: string,
  action: string,
  oldStatus: string | undefined,
  newStatus: string | undefined,
  details: Record<string, any>,
  tenantId: string,
  userId: string
): Promise<void> {
  const supabase = createClient()

  try {
    await supabase
      .from("workflow_audit_log")
      .insert({
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: entityId,
        action,
        old_status: oldStatus,
        new_status: newStatus,
        details,
        performed_by: userId,
      })
  } catch (err: any) {
    console.error("Error logging workflow action:", err.message)
  }
}

// ─── 7. CANCEL BON APPROVISIONNEMENT ────────────────

export async function cancelBonApprovisionnement(
  bonApprovId: string,
  tenantId: string,
  reason: string
): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Session expiree")

  try {
    // Récupérer le bon
    const { data: bon } = await supabase
      .from("bon_approvisionnement")
      .select("status")
      .eq("id", bonApprovId)
      .single()

    if (!bon) return false

    // Mettre à jour le bon
    const { error } = await supabase
      .from("bon_approvisionnement")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bonApprovId)

    if (error) {
      console.error("Error cancelling bon:", error.message)
      return false
    }

    // Annuler les items
    await supabase
      .from("bon_approvisionnement_items")
      .update({ status: "cancelled" })
      .eq("bon_appro_id", bonApprovId)

    // Enregistrer dans l'audit
    await logWorkflowAction("bon_approvisionnement", bonApprovId, "cancelled", bon.status, "cancelled", {
      reason,
    }, tenantId, user.id)

    return true
  } catch (err: any) {
    console.error("Error in cancelBonApprovisionnement:", err.message)
    return false
  }
}
