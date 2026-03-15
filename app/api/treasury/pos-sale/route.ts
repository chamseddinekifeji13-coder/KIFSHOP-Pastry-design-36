import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/active-profile'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 })
    }
    
    // Validate session has required fields
    if (!session.tenantId) {
      console.error("POS Sale: Missing tenantId in session", session)
      return NextResponse.json({ error: "Session invalide: tenant manquant" }, { status: 401 })
    }
    
    const supabase = await createClient()

    const { items, total, paymentMethod, cashReceived } = await request.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 })
    }

    if (!total || total <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 })
    }

    // Generate transaction ID
    const transactionId = `POS-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Create items description
    const itemsDescription = items.map((item: any) => 
      `${item.name} x${item.quantity}`
    ).join(", ")

    // Insert transaction - description includes all details since 'notes' column doesn't exist
    // Note: 'type' column only accepts 'income' or 'expense', so we use 'income' for POS sales
    const fullDescription = `Vente POS #${transactionId}: ${itemsDescription}${cashReceived ? ` | Recu: ${cashReceived} TND` : ''}`
    
    // Build insert object - only include created_by if it exists
    const insertData: Record<string, any> = {
      tenant_id: session.tenantId,
      type: "income",
      amount: total,
      category: "pos_sale",
      description: fullDescription,
      payment_method: paymentMethod === "card" ? "card" : "cash",
    }
    
    // Only add created_by if it exists and is valid
    if (session.activeProfileId) {
      insertData.created_by = session.activeProfileId
    }
    
    console.log("POS Sale: Inserting transaction", insertData)
    
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert(insertData)
      .select()

    if (transactionError) {
      console.error("Transaction error:", transactionError)
      // Return detailed error information for debugging
      return NextResponse.json({ 
        success: false,
        error: "Erreur lors de l'enregistrement",
        details: transactionError.message,
        code: transactionError.code,
        hint: transactionError.hint || null
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      transactionId,
      transaction: Array.isArray(transaction) ? transaction[0] : transaction
    })

  } catch (error: any) {
    console.error("POS sale error:", error)
    return NextResponse.json({ 
      error: error.message || "Erreur serveur" 
    }, { status: 500 })
  }
}
