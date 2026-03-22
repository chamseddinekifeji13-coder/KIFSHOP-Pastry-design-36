import { createAdminClient } from "@/lib/supabase/server"
import { withSession, serverErrorResponse } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  // Get session with proper error handling
  const [session, authError] = await withSession()
  if (authError) return authError

  try {
    const supabase = createAdminClient()

    // Delete clients without phone number and return count
    const { data, error, count } = await supabase
      .from("clients")
      .delete({ count: 'exact' })
      .eq("tenant_id", session.tenantId)
      .or("phone.is.null,phone.eq.")
      .select()

    if (error) {
      console.error("Delete error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Clients sans numéro de téléphone supprimés avec succès",
      deleted: count ?? data?.length ?? 0,
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 }
    )
  }
}
