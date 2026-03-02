/**
 * Best Delivery Export
 * Export des commandes au format CSV compatible Best Delivery (Tunisie)
 */

import type { Order } from "./actions"
import { exportToCSV, formatDateForCSV } from "@/lib/csv-export"

// Colonnes standard Best Delivery
const BEST_DELIVERY_HEADERS = [
  "Reference",
  "Nom client",
  "Telephone",
  "Telephone 2",
  "Adresse",
  "Ville",
  "Delegation",
  "Code postal",
  "Nb colis",
  "COD (TND)",
  "Designation",
  "Remarque",
  "Date commande",
]

/**
 * Formate une commande pour l'export Best Delivery
 */
function formatOrderForBestDelivery(order: Order): any[] {
  // Construire la designation a partir des items
  const designation = order.items
    .map((item) => `${item.name} x${item.quantity}`)
    .join(" + ")

  // Montant COD = total - acompte
  const codAmount = Math.max(0, order.total - (order.deposit || 0))

  return [
    order.id.slice(0, 8).toUpperCase(),     // Reference (8 premiers chars de l'ID)
    order.customerName || "",                 // Nom client
    order.customerPhone || "",                // Telephone
    "",                                       // Telephone 2
    order.deliveryAddress || order.customerAddress || "", // Adresse
    "",                                       // Ville (a remplir manuellement si besoin)
    "",                                       // Delegation
    "",                                       // Code postal
    "1",                                      // Nb colis
    codAmount.toFixed(2),                     // COD (montant a collecter)
    designation,                              // Designation des produits
    order.notes || "",                        // Remarque
    formatDateForCSV(order.createdAt),        // Date commande
  ]
}

/**
 * Exporte une seule commande vers Best Delivery (CSV)
 */
export function exportOrderToBestDelivery(order: Order) {
  const data = [formatOrderForBestDelivery(order)]
  exportToCSV({
    filename: `best-delivery-${order.id.slice(0, 8)}`,
    headers: BEST_DELIVERY_HEADERS,
    data,
  })
}

/**
 * Exporte plusieurs commandes vers Best Delivery (CSV)
 */
export function exportOrdersToBestDelivery(orders: Order[]) {
  if (orders.length === 0) return

  const data = orders.map(formatOrderForBestDelivery)
  exportToCSV({
    filename: `best-delivery-lot-${orders.length}`,
    headers: BEST_DELIVERY_HEADERS,
    data,
  })
}

/**
 * Filtre les commandes exportables vers Best Delivery
 * (livraison uniquement, statut pret ou en-livraison)
 */
export function getExportableOrders(orders: Order[]): Order[] {
  return orders.filter(
    (o) =>
      o.deliveryType === "delivery" &&
      (o.status === "pret" || o.status === "en-livraison")
  )
}
