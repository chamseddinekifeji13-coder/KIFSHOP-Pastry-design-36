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

function looksLikeOrderRef(value: string): boolean {
  return /^cmd[-\s]?\d+$/i.test(value.trim())
}

function looksLikePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 8
}

function inferPickupCustomerName(order: Order): string {
  const rawName = String(order.customerName || "").trim()
  if (!rawName) return ""
  if (!looksLikeOrderRef(rawName)) return rawName

  const rawAddress = String(order.customerAddress || "").trim()
  if (!rawAddress) return rawName

  const firstSegment = rawAddress.split(",")[0].trim()
  const cleaned = firstSegment.replace(/\d.*$/, "").trim()
  return cleaned || firstSegment || rawName
}

function pickupAddress(order: Order, customerName: string): string {
  const rawAddress = String(order.customerAddress || "").trim()
  const rawPhone = String(order.customerPhone || "").trim()

  // Legacy imports may store street address in customerPhone.
  const source =
    rawPhone && !looksLikePhone(rawPhone)
      ? rawPhone
      : rawAddress

  if (!source) return ""
  if (!customerName) return source

  const escaped = customerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`^${escaped}[\\s,;-]*`, "i")
  return source.replace(re, "").trim() || source
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
 * - `includeAddress: false` : 7 colonnes compactes.
 * - `includeAddress: true` : template BL complet en 12 colonnes (A/B/E/F/J).
 */
export function buildBestDeliveryExportRows(
  orders: Order[],
  includeAddress: boolean,
): { headers: string[]; data: string[][] } {
  const headers = includeAddress
    ? [
        "Code à barre",
        "Nom complet",
        "Gouvernerat",
        "Ville",
        "Adresse complète et disponibilité",
        "Téléphone",
        "Téléphone 2",
        "Désignation",
        "Nombre d'article",
        "Prix",
        "Commentaire",
        "Colis peut etre ouvert",
      ]
    : ["Code", "Client", "Téléphone", "Etat", "Prix", "Frais", "Date"]

  const data: string[][] = orders.map((o) => {
    const cod = formatPartnerNumber(formatCod(o))
    const frais = formatPartnerNumber(Number(o.shippingCost || 0).toFixed(3))
    const dateStr = formatDateDdMmYyyy(o.deliveryDate || o.createdAt)
    const etat = orderEtatForPartner(o.status)
    const pickupName = inferPickupCustomerName(o) || String(o.customerName || "").trim()
    const phoneValue = String(o.customerPhone || "").trim()
    const safePhone = looksLikePhone(phoneValue) ? phoneValue : ""
    const codeValue = pickupCode(o)
    const internalRef = String(o.orderNumberDisplay || "").trim()

    if (includeAddress) {
      const nameWithRef = internalRef ? `${internalRef} ${pickupName}`.trim() : pickupName
      const addressValue = pickupAddress(o, pickupName) || fullAddressLine(o)
      return [
        nameWithRef,
        addressValue,
        String(o.gouvernorat || "").trim(),
        String(o.delegation || "").trim(),
        safePhone,
        "",
        designationLine(o),
        cod,
        totalItemsCount(o),
        cod,
        o.notes || "",
        "Non",
      ]
    }

    return [codeValue, pickupName, safePhone, etat, cod, frais, dateStr]
  })

  return { headers, data }
}
