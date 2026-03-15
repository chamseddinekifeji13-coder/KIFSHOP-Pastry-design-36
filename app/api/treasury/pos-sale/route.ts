import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/active-profile'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    console.log("[POS Sale] Session check:", { 
      hasSession: !!session, 
      tenantId: session?.tenantId,
      activeProfileId: session?.activeProfileId,
      displayName: session?.displayName,
      userId: session?.user?.id
    })
    
    if (!session) {
      return NextResponse.json({ 
        error: "Non authentifie",
        details: "Veuillez vous connecter pour enregistrer une vente"
      }, { status: 401 })
    }
    
    // Validate session has required fields
    if (!session.tenantId) {
      console.error("[POS Sale] Missing tenantId in session", session)
      return NextResponse.json({ 
        error: "Session invalide: tenant manquant",
        debug: "Verifiez que vous etes connecte a un tenant"
      }, { status: 401 })
    }
    
    const supabase = await createClient()

    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ 
        error: "Format JSON invalide",
        details: String(e)
      }, { status: 400 })
    }
    
    console.log("[POS Sale] Request body:", body)
    
    const { items, total, paymentMethod, cashReceived } = body

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
    const fullDescription = `Vente POS #${transactionId}: ${itemsDescription}${cashReceived ? ` | Recu: ${cashReceived} TND` : ''}`
    
    // Build insert object with only valid fields
    const insertData: Record<string, any> = {
      tenant_id: session.tenantId,
      type: "income",
      amount: total,
      category: "pos_sale",
      description: fullDescription,
      payment_method: paymentMethod === "card" ? "card" : "cash",
    }
    
    // Only add optional fields if they exist
    if (session.activeProfileId) {
      insertData.created_by = session.activeProfileId
    }
    
    console.log("[POS Sale] Inserting transaction with data:", insertData)
    
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert(insertData)
      .select()

    if (transactionError) {
      console.error("[POS Sale] Supabase error:", {
        code: transactionError.code,
        message: transactionError.message,
        details: transactionError.details,
        hint: transactionError.hint
      })
      
      // Check if it's an RLS policy issue
      if (transactionError.code === "PGRST301" || transactionError.message?.includes("policy")) {
        return NextResponse.json({ 
          success: false,
          error: "Erreur de permission (RLS Policy)",
          details: transactionError.message,
          code: transactionError.code,
          hint: "Verifiez que vous etes un membre actif du tenant"
        }, { status: 403 })
      }
      
      // Check for other common errors
      if (transactionError.message?.includes("NOT NULL")) {
        return NextResponse.json({ 
          success: false,
          error: "Donnees manquantes",
          details: transactionError.message,
          hint: "Verifiez que tous les champs sont remplis"
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        success: false,
        error: "Erreur lors de l'enregistrement",
        details: transactionError.message,
        code: transactionError.code,
        hint: transactionError.hint || null
      }, { status: 500 })
    }

    if (!transaction || transaction.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: "Transaction non creee",
        details: "L'insertion a reussi mais aucune donnee n'a ete retournee"
      }, { status: 500 })
    }

    console.log("[POS Sale] Transaction created successfully:", transaction[0].id)

    return NextResponse.json({
      success: true,
      transaction: transaction[0],
      transactionId: transaction[0].id
    })
  } catch (error: any) {
    console.error("[POS Sale] Unexpected error:", error)
    return NextResponse.json({
      error: "Erreur serveur",
      details: error.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
