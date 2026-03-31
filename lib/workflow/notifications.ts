import { createClient } from "@/lib/supabase/client"

export interface Notification {
  id: string
  userId: string
  tenantId: string
  type: 'stock_alert' | 'bon_created' | 'bon_validated' | 'bon_sent' | 'po_ready' | 'delivery_expected'
  title: string
  message: string
  entityType: string
  entityId: string
  relatedEntityId?: string
  status: 'unread' | 'read' | 'archived'
  actionUrl?: string
  createdAt: string
  readAt?: string
}

/**
 * Envoie une notification au responsable magasin quand un stock est critique
 */
export async function notifyStockCritical(
  tenantId: string,
  stockManagerUserId: string,
  itemName: string,
  currentStock: number,
  minStock: number,
  alertId: string
): Promise<void> {
  const supabase = createClient()

  try {
    await supabase
      .from("workflow_notifications")
      .insert({
        user_id: stockManagerUserId,
        tenant_id: tenantId,
        type: "stock_alert",
        title: `Alerte Stock Critique: ${itemName}`,
        message: `Le stock de ${itemName} (${currentStock}) est en dessous du minimum (${minStock})`,
        entity_type: "stock_alert",
        entity_id: alertId,
        action_url: `/stocks?tab=alerts&id=${alertId}`,
        status: "unread",
      })

    // TODO: Envoyer une notification push/email ici
  } catch (err: unknown) {
    console.error("Error creating stock alert notification:", err instanceof Error ? err.message : err)
  }
}

/**
 * Notifie le responsable appro qu'un bon d'approv a été créé
 */
export async function notifyBonApprovCreated(
  tenantId: string,
  approvManagerUserId: string,
  bonReference: string,
  bonId: string,
  itemCount: number,
  totalAmount: number
): Promise<void> {
  const supabase = createClient()

  try {
    await supabase
      .from("workflow_notifications")
      .insert({
        user_id: approvManagerUserId,
        tenant_id: tenantId,
        type: "bon_created",
        title: `Nouveau Bon d'Approvisionnement: ${bonReference}`,
        message: `Un bon avec ${itemCount} article(s) pour ${totalAmount.toLocaleString(
          "fr-TN"
        )} TND attend votre validation`,
        entity_type: "bon_approvisionnement",
        entity_id: bonId,
        action_url: `/approvisionnement?tab=draft&id=${bonId}`,
        status: "unread",
      })
  } catch (err: unknown) {
    console.error("Error creating bon created notification:", err instanceof Error ? err.message : err)
  }
}

/**
 * Notifie les deux responsables quand un bon est validé
 */
export async function notifyBonApprovValidated(
  tenantId: string,
  notifyUserIds: string[],
  bonReference: string,
  bonId: string
): Promise<void> {
  const supabase = createClient()

  try {
    const notifications = notifyUserIds.map((userId) => ({
      user_id: userId,
      tenant_id: tenantId,
      type: "bon_validated",
      title: `Bon Approvisionnement Validé: ${bonReference}`,
      message: `Le bon ${bonReference} a été validé et prêt pour envoi aux fournisseurs`,
      entity_type: "bon_approvisionnement",
      entity_id: bonId,
      action_url: `/approvisionnement?tab=validated&id=${bonId}`,
      status: "unread",
    }))

    await supabase.from("workflow_notifications").insert(notifications)
  } catch (err: unknown) {
    console.error("Error creating bon validated notification:", err instanceof Error ? err.message : err)
  }
}

/**
 * Notifie le responsable appro que les commandes ont été créées
 */
export async function notifyPurchaseOrdersCreated(
  tenantId: string,
  approvManagerUserId: string,
  bonReference: string,
  bonId: string,
  purchaseOrderCount: number,
  supplierCount: number
): Promise<void> {
  const supabase = createClient()

  try {
    await supabase
      .from("workflow_notifications")
      .insert({
        user_id: approvManagerUserId,
        tenant_id: tenantId,
        type: "bon_sent",
        title: `Commandes Fournisseurs Créées: ${bonReference}`,
        message: `${purchaseOrderCount} commande(s) créée(s) auprès de ${supplierCount} fournisseur(s)`,
        entity_type: "bon_approvisionnement",
        entity_id: bonId,
        action_url: `/achats/commandes?bon=${bonId}`,
        status: "unread",
      })
  } catch (err: unknown) {
    console.error("Error creating purchase order notification:", err instanceof Error ? err.message : err)
  }
}

/**
 * Récupère les notifications non lues d'un utilisateur
 */
export async function fetchUnreadNotifications(
  userId: string,
  tenantId: string
): Promise<Notification[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from("workflow_notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .eq("status", "unread")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Error fetching notifications:", error.message)
      return []
    }

    return (data || []).map((n) => {
      const rec = n as Record<string, unknown>
      return {
        id: rec.id as string,
        userId: rec.user_id as string,
        tenantId: rec.tenant_id as string,
        type: rec.type as Notification['type'],
        title: rec.title as string,
        message: rec.message as string,
        entityType: rec.entity_type as string,
        entityId: rec.entity_id as string,
        relatedEntityId: rec.related_entity_id as string | undefined,
        status: rec.status as Notification['status'],
        actionUrl: rec.action_url as string | undefined,
        createdAt: rec.created_at as string,
        readAt: rec.read_at as string | undefined,
      }
    })
  } catch (err: unknown) {
    console.error("Error in fetchUnreadNotifications:", err instanceof Error ? err.message : err)
    return []
  }
}

/**
 * Marque une notification comme lue
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from("workflow_notifications")
      .update({
        status: "read",
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)

    if (error) {
      console.error("Error marking notification as read:", error.message)
      return false
    }

    return true
  } catch (err: unknown) {
    console.error("Error in markNotificationAsRead:", err instanceof Error ? err.message : err)
    return false
  }
}

/**
 * Archive une notification
 */
export async function archiveNotification(notificationId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from("workflow_notifications")
      .update({
        status: "archived",
      })
      .eq("id", notificationId)

    if (error) {
      console.error("Error archiving notification:", error.message)
      return false
    }

    return true
  } catch (err: unknown) {
    console.error("Error in archiveNotification:", err instanceof Error ? err.message : err)
    return false
  }
}
