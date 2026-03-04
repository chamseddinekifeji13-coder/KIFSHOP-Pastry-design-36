import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { name, phone, business } = await request.json()

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "Nom et telephone requis" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Insert into platform_prospects as a new lead from campaign
    const { error } = await supabase.from("platform_prospects").insert({
      business_name: business?.trim() || `Patisserie de ${name.trim()}`,
      owner_name: name.trim(),
      phone: phone.trim(),
      source: "facebook",
      status: "nouveau",
      notes: `Demande de demo via page campagne le ${new Date().toLocaleDateString("fr-TN")}`,
      next_action: "Rappeler pour planifier une demo",
      next_action_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    if (error) {
      console.error("Error saving demo request:", error.message)
      return NextResponse.json({ error: "Erreur d'enregistrement" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Demo request error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
