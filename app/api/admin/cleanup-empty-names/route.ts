import { createClient } from "@/lib/supabase/server"
import { getServerSession, requireRole } from "@/lib/active-profile"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // ✅ Verify authentication and admin role
    const session = await requireRole("owner", "gerant")

    const supabase = await createClient()

    // ✅ Clean raw_materials with tenant isolation
    const { data: emptyRaw } = await supabase
      .from("raw_materials")
      .select("id")
      .eq("tenant_id", session.tenantId)
      .or('name.is.null,name.eq."",name.eq."-"')
    
    let deletedRawCount = 0
    if (emptyRaw && emptyRaw.length > 0) {
      const { error: errorRaw } = await supabase
        .from("raw_materials")
        .delete()
        .in("id", emptyRaw.map(r => r.id))
      if (errorRaw) throw errorRaw
      deletedRawCount = emptyRaw.length
    }

    // ✅ Clean finished_products with tenant isolation
    const { data: emptyFinished } = await supabase
      .from("finished_products")
      .select("id")
      .eq("tenant_id", session.tenantId)
      .or('name.is.null,name.eq."",name.eq."-"')
    
    let deletedFinishedCount = 0
    if (emptyFinished && emptyFinished.length > 0) {
      const { error: errorFinished } = await supabase
        .from("finished_products")
        .delete()
        .in("id", emptyFinished.map(f => f.id))
      if (errorFinished) throw errorFinished
      deletedFinishedCount = emptyFinished.length
    }

    // ✅ Clean packaging with tenant isolation
    const { data: emptyPackaging } = await supabase
      .from("packaging")
      .select("id")
      .eq("tenant_id", session.tenantId)
      .or('name.is.null,name.eq."",name.eq."-"')
    
    let deletedPackagingCount = 0
    if (emptyPackaging && emptyPackaging.length > 0) {
      const { error: errorPackaging } = await supabase
        .from("packaging")
        .delete()
        .in("id", emptyPackaging.map(p => p.id))
      if (errorPackaging) throw errorPackaging
      deletedPackagingCount = emptyPackaging.length
    }

    return NextResponse.json({
      success: true,
      message: "Nettoyage complété",
      deleted: {
        raw_materials: deletedRawCount,
        finished_products: deletedFinishedCount,
        packaging: deletedPackagingCount,
        total: deletedRawCount + deletedFinishedCount + deletedPackagingCount
      }
    })
  } catch (error) {
    console.error("Cleanup error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur lors du nettoyage" },
      { status: 500 }
    )
  }
}
