import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 1. Find all AVOINE transfer movements from 04/03/2026
  const { data: movements, error: fetchError } = await supabase
    .from("stock_movements")
    .select("id, movement_type, quantity, unit, reason, created_at, from_location_id, to_location_id, raw_material_id")
    .eq("movement_type", "transfer")
    .gte("created_at", "2026-03-04T00:00:00")
    .lte("created_at", "2026-03-04T23:59:59")
    .order("created_at", { ascending: false })

  if (fetchError) {
    console.error("Error fetching movements:", fetchError.message)
    process.exit(1)
  }

  // Filter only AVOINE movements by checking the raw_material
  const avoineMovements = []
  for (const m of movements || []) {
    if (m.raw_material_id) {
      const { data: rm } = await supabase
        .from("raw_materials")
        .select("id, name, current_stock")
        .eq("id", m.raw_material_id)
        .single()
      if (rm && rm.name.toLowerCase().includes("avoine")) {
        avoineMovements.push({ ...m, itemName: rm.name, currentStock: rm.current_stock })
      }
    }
  }

  console.log(`Found ${avoineMovements.length} AVOINE transfer movements on 04/03/2026:`)
  for (const m of avoineMovements) {
    console.log(`  - ID: ${m.id}, Qty: -${m.quantity} ${m.unit}, Reason: ${m.reason}, Created: ${m.created_at}`)
  }

  if (avoineMovements.length === 0) {
    console.log("No AVOINE transfer movements found to delete.")
    return
  }

  // 2. Delete the 4 incorrect transfer movements
  const idsToDelete = avoineMovements.map((m) => m.id)
  const { error: deleteError } = await supabase
    .from("stock_movements")
    .delete()
    .in("id", idsToDelete)

  if (deleteError) {
    console.error("Error deleting movements:", deleteError.message)
    process.exit(1)
  }
  console.log(`Deleted ${idsToDelete.length} incorrect AVOINE transfer movements.`)

  // 3. Fix stock_by_location - reverse the incorrect decrements
  // Each transfer decreased from source and increased at destination
  for (const m of avoineMovements) {
    // Reverse the source decrease (add back qty)
    if (m.from_location_id) {
      const { data: srcStock } = await supabase
        .from("stock_by_location")
        .select("id, quantity")
        .eq("storage_location_id", m.from_location_id)
        .eq("raw_material_id", m.raw_material_id)
        .maybeSingle()
      
      if (srcStock) {
        const newQty = Number(srcStock.quantity || 0) + Number(m.quantity)
        await supabase.from("stock_by_location")
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq("id", srcStock.id)
        console.log(`  Restored +${m.quantity} to source depot (location: ${m.from_location_id})`)
      }
    }

    // Reverse the destination increase (subtract qty)
    if (m.to_location_id) {
      const { data: destStock } = await supabase
        .from("stock_by_location")
        .select("id, quantity")
        .eq("storage_location_id", m.to_location_id)
        .eq("raw_material_id", m.raw_material_id)
        .maybeSingle()
      
      if (destStock) {
        const newQty = Math.max(0, Number(destStock.quantity || 0) - Number(m.quantity))
        await supabase.from("stock_by_location")
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq("id", destStock.id)
        console.log(`  Removed -${m.quantity} from destination depot (location: ${m.to_location_id})`)
      }
    }
  }

  // 4. Verify final state
  const rawMaterialId = avoineMovements[0].raw_material_id
  const { data: finalRm } = await supabase
    .from("raw_materials")
    .select("name, current_stock")
    .eq("id", rawMaterialId)
    .single()
  
  const { data: finalLocations } = await supabase
    .from("stock_by_location")
    .select("storage_location_id, quantity")
    .eq("raw_material_id", rawMaterialId)

  console.log(`\nFinal state for ${finalRm?.name}:`)
  console.log(`  Global stock: ${finalRm?.current_stock}`)
  for (const loc of finalLocations || []) {
    console.log(`  Location ${loc.storage_location_id}: ${loc.quantity}`)
  }
  
  console.log("\nDone! AVOINE movements cleaned up successfully.")
}

main().catch(console.error)
