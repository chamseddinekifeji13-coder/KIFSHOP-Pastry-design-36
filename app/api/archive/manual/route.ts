import { NextRequest, NextResponse } from "next/server"
import { archiveOrders } from "@/lib/archive-utils"

/**
 * POST /api/archive/manual
 * Déclenche un archivage manuel depuis l'interface utilisateur
 * Accessible uniquement aux utilisateurs authentifiés avec les rôles appropriés
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification utilisateur (sera fait par le middleware)
    // Pour l'instant, on suppose que l'utilisateur est authentifié

    const { days = 14 } = await req.json()

    // Validation des paramètres
    const archiveDays = Number(days)
    if (!Number.isFinite(archiveDays) || archiveDays < 1 || archiveDays > 365) {
      return NextResponse.json(
        { success: false, error: "Période invalide (1-365 jours)" },
        { status: 400 }
      )
    }

    // Utiliser la fonction d'archivage directement (pas d'appel HTTP)
    const result = await archiveOrders(archiveDays)

    return NextResponse.json(result)

  } catch (error) {
    console.error("Manual archive error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur serveur"
      },
      { status: 500 }
    )
  }
}