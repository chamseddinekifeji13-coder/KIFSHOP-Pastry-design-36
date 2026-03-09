import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Clean raw_materials
    const { data: deletedRaw, error: errorRaw } = await supabase
      .from("raw_materials")
      .delete()
      .or('name.is.null,name.eq.""')

    // Clean finished_products
    const { data: deletedFinished, error: errorFinished } = await supabase
      .from("finished_products")
      .delete()
      .or('name.is.null,name.eq.""')

    // Clean packaging
    const { data: deletedPackaging, error: errorPackaging } = await supabase
      .from("packaging")
      .delete()
      .or('name.is.null,name.eq.""')

    if (errorRaw || errorFinished || errorPackaging) {
      console.error("Cleanup errors:", { errorRaw, errorFinished, errorPackaging })
      return NextResponse.json(
        { error: "Erreur lors du nettoyage" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Nettoyage complété",
      deleted: {
        raw_materials: deletedRaw?.length || 0,
        finished_products: deletedFinished?.length || 0,
        packaging: deletedPackaging?.length || 0
      }
    })
  } catch (error) {
    console.error("Cleanup error:", error)
    return NextResponse.json(
      { error: "Erreur serveur lors du nettoyage" },
      { status: 500 }
    )
  }
}
