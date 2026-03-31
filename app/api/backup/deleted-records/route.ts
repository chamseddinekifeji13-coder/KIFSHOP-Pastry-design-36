import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { withSession } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const [session, authError] = await withSession()
  if (authError) return authError

  try {
    const tenantId = session!.tenantId
    const { searchParams } = new URL(request.url)
    const table = searchParams.get("table")
    const limit = parseInt(searchParams.get("limit") || "100")

    const supabase = await createClient()

    let query = supabase
      .from("deletion_audit_log")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("deleted_at", { ascending: false })
      .limit(limit)

    if (table) {
      query = query.eq("table_name", table)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      records: data,
      count: data?.length || 0,
    })
  } catch (error) {
    console.error("Deleted records fetch error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const [, postAuthError] = await withSession()
  if (postAuthError) return postAuthError

  try {
    const { auditId } = await request.json()

    if (!auditId) {
      return NextResponse.json({ error: "auditId requis" }, { status: 400 })
    }

    const supabase = await createClient()

    // Call the restore function
    const { data, error } = await supabase.rpc("restore_deleted_record", {
      p_audit_id: auditId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Record restore error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la restauration" },
      { status: 500 }
    )
  }
}
