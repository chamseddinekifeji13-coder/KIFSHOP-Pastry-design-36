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
  } catch (err: any) {
    console.error("Error creating stock alert notification:", err.message)
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
  } catch (err: any) {
    console.error("Error creating bon created notification:", err.message)
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
  } catch (err: any) {
    console.error("Error creating bon validated notification:", err.message)
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
  } catch (err: any) {
    console.error("Error creating purchase order notification:", err.message)
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

    return (data || []).map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      tenantId: n.tenant_id,
      type: n.type,
      title: n.title,
      message: n.message,
      entityType: n.entity_type,
      entityId: n.entity_id,
      relatedEntityId: n.related_entity_id,
      status: n.status,
      actionUrl: n.action_url,
      createdAt: n.created_at,
      readAt: n.read_at,
    }))
  } catch (err: any) {
    console.error("Error in fetchUnreadNotifications:", err.message)
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
  } catch (err: any) {
    console.error("Error in markNotificationAsRead:", err.message)
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
  } catch (err: any) {
    console.error("Error in archiveNotification:", err.message)
    return false
  }
}
