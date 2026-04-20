import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/archive/stats
 * Retourne les statistiques d'archivage des commandes
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Pour l'instant, on retourne des stats simulées
    // En production, on pourrait avoir une table dédiée pour tracker les archivages
    const { data: archivedCount, error } = await supabase
      .from("orders")
      .select("id", { count: "exact" })
      .eq("is_archived", true)

    if (error) {
      console.error("Error fetching archive stats:", error)
      return NextResponse.json(
        { error: "Erreur lors de la récupération des statistiques" },
        { status: 500 }
      )
    }

    // Simuler les autres stats pour l'instant
    const stats = {
      totalArchived: archivedCount?.length || 0,
      lastRun: null, // À implémenter avec une table de logs d'archivage
      nextRun: null, // À calculer basé sur le cron schedule
      success: true
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Archive stats error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur serveur"
      },
      { status: 500 }
    )
  }
}