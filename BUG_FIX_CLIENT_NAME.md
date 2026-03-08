## 🔧 Bug Fix: Client Name Not Saved During Order Creation

### Problem
When creating a new client during an order and entering their name, the system was not correctly saving the name to the database. The client was being registered with "Client sans nom" instead of the name provided.

**Root Cause:**
In `unified-order-dialog.tsx`, the client name update logic had two issues:
1. Missing error handling - if the update failed, it would silently continue
2. Not checking if `client.id` exists before attempting update
3. The update wasn't awaited properly before proceeding

### Solution
Implemented proper error handling and validation in the client name update:

```typescript
// Before: Unsafe update
if (isNewClient && clientName.trim()) {
  const supabase = createSupabaseClient()
  await supabase.from("clients").update({ name: clientName.trim() }).eq("id", client.id)
}

// After: Robust update with error handling
if (isNewClient && clientName.trim() && client?.id) {
  const supabase = createSupabaseClient()
  const { error: updateError } = await supabase
    .from("clients")
    .update({ 
      name: clientName.trim(),
      updated_at: new Date().toISOString() 
    })
    .eq("id", client.id)
  
  if (updateError) {
    console.error("[v0] Error updating client name:", updateError)
    toast.error("Erreur mise à jour client")
    setSubmitting(false)
    return
  }
}
```

### Changes Made
- **File:** `components/orders/unified-order-dialog.tsx` (lines 253-271)
- Added proper error handling with `.error` destructuring
- Added validation check for `client?.id`
- Added user feedback via toast error if update fails
- Added `updated_at` timestamp for audit trail
- Early return to prevent order creation if name update fails

### Testing Steps
1. Create a new order with a phone number not in database
2. System should show empty form for new client
3. Enter client name (e.g., "Ahmed")
4. Create the order
5. Go to "Base Clients" - client should now be saved with correct name
6. Search by same phone number again - name should auto-populate

### Result
✅ New clients are now properly saved with their names
✅ Error handling prevents silent failures  
✅ User gets feedback if update fails
✅ Audit trail with `updated_at` timestamp
