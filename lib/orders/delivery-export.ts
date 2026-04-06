import type { Order } from "./actions"

export type DeliveryExportStatusFilter = "pret" | "en-livraison"

/**
 * Commandes livraison (pas retrait magasin) dans les statuts exportables vers le transporteur.
 */
export function filterOrdersForDeliveryExport(
  orders: Order[],
  statuses: DeliveryExportStatusFilter[],
): Order[] {
  const set = new Set(statuses)
  return orders.filter(
    (o) => o.deliveryType === "delivery" && set.has(o.status as DeliveryExportStatusFilter),
  )
}

/** Libellés alignés sur le parseur d'import Best Delivery (`lib/delivery/actions.ts` statusMap). */
function orderEtatForPartner(status: Order["status"]): string {
  if (status === "pret") return "En attente"
  if (status === "en-livraison") return "En cours"
  // Only "pret" and "en-livraison" should reach this function due to filterOrdersForDeliveryExport.
  // This fallback prevents silent failures with empty "Etat" field in CSV export.
  throw new Error(`Unexpected order status for delivery export: "${status}". Only "pret" and "en-livraison" are supported.`)
}

function formatCod(order: Order): string {
  return Math.max(0, Number(order.total) - Number(order.deposit || 0)).toFixed(3)
}

function formatDateDdMmYyyy(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function pickupCode(order: Order): string {
  const t = order.trackingNumber?.trim()
  if (t) return t
  if (order.orderNumberDisplay?.trim()) return order.orderNumberDisplay.trim()
  return order.id.slice(0, 8)
}

function fullAddressLine(order: Order): string {
  const parts = [order.gouvernorat, order.delegation, order.customerAddress].filter(
    (p): p is string => Boolean(p && String(p).trim()),
  )
  return parts.length ? parts.join(", ") : (order.customerAddress || "").trim()
}

/**
 * Lignes CSV compatibles import Best Delivery (séparateur `;`, voir `delivery-import-dialog` template).
 * - `includeAddress: false` : 7 colonnes comme le modèle officiel.
 * - `includeAddress: true` : colonne Adresse après Téléphone (réimport possible via en-tête « adresse »).
 */
export function buildBestDeliveryExportRows(
  orders: Order[],
  includeAddress: boolean,
): { headers: string[]; data: string[][] } {
  const headers = includeAddress
    ? ["Code", "Client", "Téléphone", "Adresse", "Etat", "Prix", "Frais", "Date"]
    : ["Code", "Client", "Téléphone", "Etat", "Prix", "Frais", "Date"]

  const data: string[][] = orders.map((o) => {
    const cod = formatCod(o)
    const frais = Number(o.shippingCost || 0).toFixed(3)
    const dateStr = formatDateDdMmYyyy(o.deliveryDate || o.createdAt)
    const etat = orderEtatForPartner(o.status)

    if (includeAddress) {
      return [
        pickupCode(o),
        o.customerName,
        o.customerPhone || "",
        fullAddressLine(o),
        etat,
        cod,
        frais,
        dateStr,
      ]
    }

    return [pickupCode(o), o.customerName, o.customerPhone || "", etat, cod, frais, dateStr]
  })

  return { headers, data }
}
