import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/active-profile'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 })
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
    const fullDescription = `Vente POS #${transactionId}: ${itemsDescription}${cashReceived ? ` | Recu: ${cashReceived} TND` : ''}`
    
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        tenant_id: session.tenantId,
        type: "income",
        category: "Vente comptoir",
        amount: total,
        description: fullDescription,
        payment_method: paymentMethod === "card" ? "card" : "cash",
        created_by: session.activeProfileId,
        created_by_name: session.displayName,
        is_collection: true
      })
      .select()

    if (transactionError) {
      console.error("Transaction error:", transactionError)
      // Return detailed error information for debugging
      return NextResponse.json({ 
        success: false,
        error: "Erreur lors de l'enregistrement",
        details: transactionError.message,
        code: transactionError.code
      }, { status: 500 })
    }

    console.log("[v0] Transaction created successfully:", transaction)

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
