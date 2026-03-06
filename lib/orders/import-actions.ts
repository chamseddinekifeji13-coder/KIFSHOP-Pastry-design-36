import { createClient } from "@/lib/supabase/client"

// ─── Types ────────────────────────────────────────────────────

export interface OrderCSVImportRow {
  code?: string
  customerName: string
  customerPhone?: string
  status: "livre" | "retour" | "en-cours"
  price?: number
  fees?: number
  date?: string
  exchange?: string
}

export interface OrderImportResult {
  total: number
  imported: number
  updated: number
  failed: number
  errors: Array<{ row: number; error: string }>
  deliveredSynced: number
  returnedSynced: number
}

// ─── Parse CSV Content ────────────────────────────────────────

export async function parseOrderCSVContent(content: string): Promise<{
  rows: OrderCSVImportRow[]
  errors: Array<{ row: number; error: string }>
}> {
  const lines = content.trim().split("\n")
  const rows: OrderCSVImportRow[] = []
  const errors: Array<{ row: number; error: string }> = []

  if (lines.length < 2) {
    errors.push({ row: 0, error: "Le fichier doit contenir au moins une ligne d'en-tete et une ligne de donnees" })
    return { rows, errors }
  }

  // Parse header (first line)
  const headerLine = lines[0].toLowerCase()
  const headers = headerLine.split(/[,;]/).map((h) => h.trim().replace(/"/g, ""))

  // Map headers to our fields
  const headerMap: Record<string, keyof OrderCSVImportRow> = {
    // Code column
    "code": "code",
    "n_commande": "code",
    "numero": "code",
    "ref": "code",
    "reference": "code",
    "tracking": "code",
    // Client column
    "client": "customerName",
    "nom": "customerName",
    "nom_client": "customerName",
    "customer": "customerName",
    "customer_name": "customerName",
    // State column
    "etat": "status",
    "état": "status",
    "statut": "status",
    "status": "status",
    // Price column
    "prix": "price",
    "montant": "price",
    "total": "price",
    "amount": "price",
    // Fees column
    "frais": "fees",
    "frais_livraison": "fees",
    "shipping": "fees",
    "livraison": "fees",
    // Date column
    "date": "date",
    "date_creation": "date",
    "created_at": "date",
    // Exchange column
    "echange": "exchange",
    "échange": "exchange",
    // Phone column
    "tel": "customerPhone",
    "tél": "customerPhone",
    "telephone": "customerPhone",
    "téléphone": "customerPhone",
    "phone": "customerPhone",
  }

  // Find column indices
  const columnIndices: Partial<Record<keyof OrderCSVImportRow, number>> = {}
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9_]/g, "_").trim()
    for (const [key, field] of Object.entries(headerMap)) {
      const normalizedKey = key.replace(/[^a-z0-9_]/g, "_")
      if (normalizedHeader === normalizedKey || normalizedHeader.includes(normalizedKey) || header.toLowerCase() === key) {
        columnIndices[field] = index
        break
      }
    }
  })

  // Map status values
  const statusMap: Record<string, OrderCSVImportRow["status"]> = {
    // Delivered statuses
    "livr": "livre",
    "livre": "livre",
    "livré": "livre",
    "livree": "livre",
    "livrée": "livre",
    "delivered": "livre",
    // Return statuses
    "retour": "retour",
    "returned": "retour",
    "retourne": "retour",
    "retourné": "retour",
    "retournee": "retour",
    "retournée": "retour",
    // In progress statuses
    "en cours": "en-cours",
    "en-cours": "en-cours",
    "en_cours": "en-cours",
    "in_transit": "en-cours",
    "transit": "en-cours",
    "pending": "en-cours",
    "attente": "en-cours",
    "en attente": "en-cours",
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle CSV with quotes
    const values: string[] = []
    let current = ""
    let inQuotes = false
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if ((char === "," || char === ";") && !inQuotes) {
        values.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    values.push(current.trim())

    // Extract fields
    const customerName = columnIndices.customerName !== undefined 
      ? values[columnIndices.customerName]?.replace(/"/g, "").trim() 
      : ""
    
    if (!customerName) {
      errors.push({ row: i + 1, error: "Nom client manquant" })
      continue
    }

    const rawStatus = columnIndices.status !== undefined 
      ? values[columnIndices.status]?.toLowerCase().replace(/"/g, "").trim() 
      : "en-cours"
    
    const status = statusMap[rawStatus] || "en-cours"

    // Extract price
    const priceStr = columnIndices.price !== undefined
      ? values[columnIndices.price]?.replace(/"/g, "").replace(",", ".").trim()
      : undefined
    const price = priceStr ? parseFloat(priceStr) : undefined

    // Extract fees
    const feesStr = columnIndices.fees !== undefined
      ? values[columnIndices.fees]?.replace(/"/g, "").replace(",", ".").trim()
      : undefined
    const fees = feesStr ? parseFloat(feesStr) : undefined

    rows.push({
      code: columnIndices.code !== undefined 
        ? values[columnIndices.code]?.replace(/"/g, "").trim() 
        : undefined,
      customerName,
      customerPhone: columnIndices.customerPhone !== undefined 
        ? values[columnIndices.customerPhone]?.replace(/"/g, "").trim() 
        : undefined,
      status,
      price,
      fees,
      date: columnIndices.date !== undefined 
        ? values[columnIndices.date]?.replace(/"/g, "").trim() 
        : undefined,
      exchange: columnIndices.exchange !== undefined 
        ? values[columnIndices.exchange]?.replace(/"/g, "").trim() 
        : undefined,
    })
  }

  return { rows, errors }
}

// ─── Import Orders from CSV ───────────────────────────────────

export async function importOrdersFromCSV(
  tenantId: string,
  rows: OrderCSVImportRow[],
  syncClients: boolean = true
): Promise<OrderImportResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const result: OrderImportResult = {
    total: rows.length,
    imported: 0,
    updated: 0,
    failed: 0,
    errors: [],
    deliveredSynced: 0,
    returnedSynced: 0,
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    try {
      // Map status to order status
      const orderStatus = row.status === "livre" 
        ? "livre" 
        : row.status === "retour" 
          ? "livre" // Retour is still a delivered state (just returned)
          : "en-livraison"

      // Check if order already exists by code/tracking number
      let existingOrder = null
      
      if (row.code) {
        const { data } = await supabase
          .from("orders")
          .select("id, status, customer_phone")
          .eq("tenant_id", tenantId)
          .eq("tracking_number", row.code)
          .single()
        existingOrder = data
      }

      // Also try to find by phone and name if no code match
      if (!existingOrder && row.customerPhone) {
        const { data } = await supabase
          .from("orders")
          .select("id, status, customer_phone")
          .eq("tenant_id", tenantId)
          .eq("customer_phone", row.customerPhone)
          .ilike("customer_name", `%${row.customerName}%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
        existingOrder = data
      }

      if (existingOrder) {
        // Update existing order
        const updates: Record<string, unknown> = {
          status: orderStatus,
          updated_at: new Date().toISOString(),
        }

        if (row.status === "livre") {
          updates.delivered_at = new Date().toISOString()
        }

        if (row.status === "retour") {
          updates.return_status = "returned"
          updates.returned_by = user?.id || null
          updates.returned_by_name = user?.user_metadata?.display_name || user?.email || "Import CSV"
        }

        const { error } = await supabase
          .from("orders")
          .update(updates)
          .eq("id", existingOrder.id)

        if (error) {
          result.errors.push({ row: i + 2, error: `Erreur mise a jour: ${error.message}` })
          result.failed++
          continue
        }

        // Record status history
        await supabase.from("order_status_history").insert({
          order_id: existingOrder.id,
          tenant_id: tenantId,
          from_status: existingOrder.status,
          to_status: row.status === "retour" ? "retour-import" : orderStatus,
          changed_by: user?.id || null,
          changed_by_name: user?.user_metadata?.display_name || user?.email || "Import CSV",
          note: `Import CSV - ${row.status === "livre" ? "Livree" : row.status === "retour" ? "Retour" : "Mise a jour"}`,
        })

        result.updated++

        // Sync with client if requested
        if (syncClients) {
          const syncResult = await syncClientFromOrder(
            tenantId, 
            row.customerPhone || existingOrder.customer_phone, 
            row.customerName,
            row.status
          )
          if (syncResult) {
            if (row.status === "livre") result.deliveredSynced++
            if (row.status === "retour") result.returnedSynced++
          }
        }
      } else {
        // Create new order
        const total = (row.price || 0) + (row.fees || 0)
        
        const { data: newOrder, error } = await supabase
          .from("orders")
          .insert({
            tenant_id: tenantId,
            customer_name: row.customerName,
            customer_phone: row.customerPhone || null,
            total: total,
            deposit: row.status === "livre" ? total : 0,
            shipping_cost: row.fees || 0,
            status: orderStatus,
            delivery_type: "delivery",
            source: "import",
            payment_status: row.status === "livre" ? "paid" : "unpaid",
            tracking_number: row.code || null,
            delivery_date: row.date || null,
            delivered_at: row.status === "livre" ? new Date().toISOString() : null,
            return_status: row.status === "retour" ? "returned" : null,
          })
          .select("id")
          .single()

        if (error || !newOrder) {
          result.errors.push({ row: i + 2, error: `Erreur creation: ${error?.message}` })
          result.failed++
          continue
        }

        // Create order item (generic)
        await supabase.from("order_items").insert({
          order_id: newOrder.id,
          name: "Article importe",
          quantity: 1,
          unit_price: row.price || 0,
        })

        // Record initial status history
        await supabase.from("order_status_history").insert({
          order_id: newOrder.id,
          tenant_id: tenantId,
          from_status: null,
          to_status: orderStatus,
          changed_by: user?.id || null,
          changed_by_name: user?.user_metadata?.display_name || user?.email || "Import CSV",
          note: `Import CSV - ${row.status === "livre" ? "Livree" : row.status === "retour" ? "Retour" : "Creee"}`,
        })

        result.imported++

        // Sync with client if requested
        if (syncClients && row.customerPhone) {
          const syncResult = await syncClientFromOrder(tenantId, row.customerPhone, row.customerName, row.status)
          if (syncResult) {
            if (row.status === "livre") result.deliveredSynced++
            if (row.status === "retour") result.returnedSynced++
          }
        }
      }
    } catch (err) {
      result.errors.push({ row: i + 2, error: `Erreur inattendue: ${(err as Error).message}` })
      result.failed++
    }
  }

  return result
}

// ─── Sync Client from Order ───────────────────────────────────

async function syncClientFromOrder(
  tenantId: string,
  customerPhone: string | null,
  customerName: string,
  status: OrderCSVImportRow["status"]
): Promise<boolean> {
  if (!customerPhone) return false

  const supabase = createClient()

  // Find or create client
  let { data: client } = await supabase
    .from("clients")
    .select("id, delivered_count, return_count, total_orders, status")
    .eq("tenant_id", tenantId)
    .eq("phone", customerPhone)
    .single()

  if (!client) {
    // Create new client
    const { data: newClient, error } = await supabase
      .from("clients")
      .insert({
        tenant_id: tenantId,
        name: customerName,
        phone: customerPhone,
        source: "import",
        status: "normal",
        delivered_count: status === "livre" ? 1 : 0,
        return_count: status === "retour" ? 1 : 0,
        total_orders: 1,
      })
      .select("id")
      .single()

    if (error || !newClient) return false
    return true
  }

  // Update existing client
  const newDeliveredCount = (client.delivered_count || 0) + (status === "livre" ? 1 : 0)
  const newReturnCount = (client.return_count || 0) + (status === "retour" ? 1 : 0)
  const newTotalOrders = (client.total_orders || 0) + 1

  // Auto-update client status based on return count
  let newStatus = client.status
  if (newReturnCount >= 5 && client.status !== "blacklisted") {
    newStatus = "blacklisted"
  } else if (newReturnCount >= 3 && client.status === "normal") {
    newStatus = "warning"
  } else if (newDeliveredCount >= 10 && client.status === "normal") {
    newStatus = "vip"
  }

  const { error } = await supabase
    .from("clients")
    .update({
      delivered_count: newDeliveredCount,
      return_count: newReturnCount,
      total_orders: newTotalOrders,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", client.id)

  return !error
}
