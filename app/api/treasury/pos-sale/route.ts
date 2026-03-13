import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/active-profile'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
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

    // Insert transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        tenant_id: session.tenantId,
        type: "income",
        category: "Vente comptoir",
        amount: total,
        description: `Vente POS: ${itemsDescription}`,
        payment_method: paymentMethod === "card" ? "card" : "cash",
        created_by: session.activeProfileId,
        created_by_name: session.displayName,
        is_collection: true,
        notes: `Transaction #${transactionId}${cashReceived ? ` | Recu: ${cashReceived} TND` : ''}`
      })
      .select()

    if (transactionError) {
      console.error("Transaction error:", transactionError)
      return NextResponse.json({ 
        error: "Erreur lors de l'enregistrement",
        details: transactionError.message 
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
