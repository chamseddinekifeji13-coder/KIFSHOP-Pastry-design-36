import type { Order } from "./actions"

export type DeliveryExportStatusFilter = "pret" | "en-livraison"

/**
 * Commandes livraison (pas retrait magasin) dans les statuts exportables vers le transporteur.
 */
export function filterOrdersForDeliveryExport(
  orders: Order[],
  statuses: DeliveryExportStatusFilter[],
  options?: {
    onlyToday?: boolean
    timeZone?: string
  },
): Order[] {
  const set = new Set(statuses)
  const onlyToday = options?.onlyToday ?? true
  const timeZone = options?.timeZone || "Africa/Tunis"
  const todayKey = getDayKey(new Date(), timeZone)

  return orders.filter((o) => {
    if (!(o.deliveryType === "delivery" && set.has(o.status as DeliveryExportStatusFilter))) {
      return false
    }
    if (!onlyToday) return true
    const eventDate = o.readyAt || o.deliveryDate || o.createdAt
    return getDayKey(eventDate, timeZone) === todayKey
  })
}

function getDayKey(value: string | Date, timeZone: string): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
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

function formatPartnerNumber(value: string): string {
  return value.replace(".", ",")
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

function designationLine(order: Order): string {
  const names = (order.items || [])
    .map((item) => String(item.name || "").trim())
    .filter(Boolean)
  if (names.length === 0) return "Commande"
  const joined = names.join(" + ")
  // Keep cell readable in partner UI.
  return joined.length > 120 ? `${joined.slice(0, 117)}...` : joined
}

function totalItemsCount(order: Order): string {
  const qty = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1
  return String(Math.round(safeQty))
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
    const cod = formatPartnerNumber(formatCod(o))
    const frais = formatPartnerNumber(Number(o.shippingCost || 0).toFixed(3))
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
