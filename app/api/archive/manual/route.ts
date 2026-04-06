import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

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

    // Appeler l'API cron interne avec le CRON_SECRET
    const cronResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cron/archive-orders?days=${archiveDays}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    })

    if (!cronResponse.ok) {
      const errorData = await cronResponse.json().catch(() => ({}))
      throw new Error(errorData.error || `Erreur HTTP ${cronResponse.status}`)
    }

    const result = await cronResponse.json()

    return NextResponse.json({
      success: true,
      ...result
    })

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