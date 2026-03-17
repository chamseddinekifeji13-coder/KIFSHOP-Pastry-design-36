import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  withSessionAndBody, 
  badRequestResponse, 
  serverErrorResponse 
} from '@/lib/api-helpers'

interface POSSaleBody {
  items: Array<{ name: string; quantity: number; price: number }>
  total: number
  paymentMethod: 'cash' | 'card'
  cashReceived?: number
}

export async function POST(request: Request) {
  // 1. Get session and parse body with centralized error handling
  const [data, error] = await withSessionAndBody<POSSaleBody>(request)
  if (error) return error
  
  const { session, body } = data
  const { items, total, paymentMethod, cashReceived } = body

  // 2. Validate input
  if (!items || !Array.isArray(items) || items.length === 0) {
    return badRequestResponse("Panier vide")
  }
  if (!total || total <= 0) {
    return badRequestResponse("Montant invalide")
  }

  try {
    const supabase = await createClient()

    // 3. Generate transaction ID
    const transactionId = `POS-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // 4. Create items description
    const itemsDescription = items.map((item) => 
      `${item.name} x${item.quantity}`
    ).join(", ")

    const fullDescription = `Vente POS #${transactionId}: ${itemsDescription}${cashReceived ? ` | Recu: ${cashReceived} TND` : ''}`
    
    // 5. Build insert object
    const insertData: Record<string, unknown> = {
      tenant_id: session.tenantId,
      type: "income",
      amount: total,
      category: "pos_sale",
      description: fullDescription,
      payment_method: paymentMethod === "card" ? "card" : "cash",
    }
    
    if (session.activeProfileId) {
      insertData.created_by = session.activeProfileId
    }
    
    // 6. Insert transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        tenant_id: session.tenantId,
        type: "income",  // "sale" -> "income" to match expected DB schema
        amount: total,
        category: "vente_pos",  // Add category for POS sales
        description: fullDescription,
        payment_method: paymentMethod === "card" ? "card" : "cash",
        created_by: session.activeProfileId
        // Note: created_by_name was removed as it's not a DB column
      })
      .select()

    if (transactionError) {
      console.error("[POS Sale] Supabase error:", transactionError)
      
      // Handle RLS policy error
      if (transactionError.code === "PGRST301" || transactionError.message?.includes("policy")) {
        return NextResponse.json({ 
          success: false,
          error: "Erreur de permission (RLS Policy)",
          details: transactionError.message,
          hint: "Verifiez que vous etes un membre actif du tenant"
        }, { status: 403 })
      }
      
      // Handle NOT NULL constraint
      if (transactionError.message?.includes("NOT NULL")) {
        return badRequestResponse("Donnees manquantes: " + transactionError.message)
      }
      
      return NextResponse.json({ 
        success: false,
        error: "Erreur lors de l'enregistrement",
        details: transactionError.message,
        code: transactionError.code
      }, { status: 500 })
    }

    if (!transaction || transaction.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: "Transaction non creee",
        details: "L'insertion a reussi mais aucune donnee n'a ete retournee"
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      transaction: transaction[0],
      transactionId: transaction[0].id
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
