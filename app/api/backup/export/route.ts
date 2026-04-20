import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { withRole } from "@/lib/api-helpers"
import { rateLimit, getClientIP } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

// Tables to backup with their dependencies order
const BACKUP_TABLES = [
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

export async function GET(request: Request) {
  const [session, authError] = await withRole('owner', 'gerant')
  if (authError) return authError

  const ip = getClientIP(request)
  const { limited } = rateLimit(`backup-export:${ip}`, 5, 60000)
  if (limited) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 })
  }

  try {
    const tenantId = session!.tenantId
    const { searchParams } = new URL(request.url)
    const tables = searchParams.get("tables")?.split(",") || BACKUP_TABLES

    const supabase = await createClient()
    const backupData: Record<string, unknown[]> = {}
    const errors: string[] = []

    // Export each table
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("tenant_id", tenantId)

        if (error) {
          errors.push(`${table}: ${error.message}`)
          continue
        }

        backupData[table] = data || []
      } catch (err) {
        errors.push(`${table}: ${err instanceof Error ? err.message : "Erreur inconnue"}`)
      }
    }

    const backup = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      tenantId,
      tables: Object.keys(backupData),
      rowCounts: Object.fromEntries(
        Object.entries(backupData).map(([table, rows]) => [table, rows.length])
      ),
      data: backupData,
      errors: errors.length > 0 ? errors : undefined,
    }

    // Return as downloadable JSON file
    const filename = `backup_${tenantId.slice(0, 8)}_${new Date().toISOString().split("T")[0]}.json`

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Backup export error:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'export" },
      { status: 500 }
    )
  }
}
