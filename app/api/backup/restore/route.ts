import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { withRole } from "@/lib/api-helpers"
import { rateLimit, getClientIP } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

// Order of restoration (respecting foreign keys)
const RESTORE_ORDER = [
  "categories",
  "storage_locations",
  "finished_products",
  "raw_materials",
  "consumables",
  "clients",
  "orders",
  "order_items",
  "stock_by_location",
  "recipes",
  "recipe_ingredients",
  "production_batches",
  "delivery_notes",
  "delivery_note_items",
]

interface BackupData {
  version: string
  timestamp: string
  tenantId: string
  tables: string[]
  data: Record<string, unknown[]>
}

export async function POST(request: Request) {
  const [session, authError] = await withRole('owner', 'gerant')
  if (authError) return authError

  const ip = getClientIP(request)
  const { limited } = rateLimit(`backup-restore:${ip}`, 3, 60000)
  if (limited) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { backup, options } = body as {
      backup: BackupData
      options?: {
        tables?: string[]
        mode?: "merge" | "replace"
      }
    }

    if (!backup || !backup.data) {
      return NextResponse.json(
        { error: "Fichier de sauvegarde invalide" },
        { status: 400 }
      )
    }

    const tenantId = session!.tenantId
    const supabase = await createClient()
    const tablesToRestore = options?.tables || RESTORE_ORDER.filter(t => backup.tables.includes(t))
    const mode = options?.mode || "merge"

    const results: Record<string, { inserted: number; errors: string[] }> = {}

    for (const table of tablesToRestore) {
      const tableData = backup.data[table]
      if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
        results[table] = { inserted: 0, errors: [] }
        continue
      }

      const errors: string[] = []
      let inserted = 0

      // If replace mode, delete existing data first
      if (mode === "replace") {
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq("tenant_id", tenantId)

        if (deleteError) {
          errors.push(`Erreur suppression: ${deleteError.message}`)
        }
      }

      // Insert in batches of 100
      const batchSize = 100
      for (let i = 0; i < tableData.length; i += batchSize) {
        const batch = tableData.slice(i, i + batchSize)
        
        const { error: insertError, count } = await supabase
          .from(table)
          .upsert(batch, { 
            onConflict: "id",
            ignoreDuplicates: mode === "merge"
          })

        if (insertError) {
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`)
        } else {
          inserted += batch.length
        }
      }

      results[table] = { inserted, errors }
    }

    const totalInserted = Object.values(results).reduce((sum, r) => sum + r.inserted, 0)
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors.length, 0)

    return NextResponse.json({
      success: totalErrors === 0,
      message: `Restauration terminée: ${totalInserted} enregistrements restaurés`,
      results,
      summary: {
        tablesProcessed: tablesToRestore.length,
        totalInserted,
        totalErrors,
      },
    })
  } catch (error) {
    console.error("Backup restore error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la restauration" },
      { status: 500 }
    )
  }
}
