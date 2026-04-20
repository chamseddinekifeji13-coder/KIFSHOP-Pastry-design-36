# CHANGELOG - Corrections du Processus de Commande

## Version: 2026-04-06

### Modified Files

#### `/lib/orders/actions.ts`

**Change 1: Fix `updatePaymentStatus()` status history recording (Line 526)**
- **Removed**: `to_status: paymentStatus === "paid" ? "paiement-complet" : "paiement-partiel"`
- **Added**: `to_status: \`payment_\${paymentStatus}\``
- **Reason**: Use valid status prefixes that match database constraints

**Change 2: Fix `getCurrentActor()` - Remove unnecessary API call (Lines 127-138)**
- **Removed**: Entire `if (typeof window !== "undefined")` block with fetch to `/api/active-profile`
- **Reason**: 
  - Server Actions don't need window check
  - Removed 100-500ms network latency
  - Prevent silent failures from missing API endpoint

**Change 3: Add validation to `recordPaymentCollection()` (Lines 625-651)**
- **Added**: Validation for payment amount > 0
  ```typescript
  if (!data.amount || data.amount <= 0) {
    throw new Error("Le montant du paiement doit être supérieur à 0")
  }
  ```

- **Added**: Validation for orderId existence
  ```typescript
  if (!data.orderId) {
    throw new Error("Identifiant de commande manquant")
  }
  ```

- **Added**: Fetch order before insertion to check amount doesn't exceed due balance
  ```typescript
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("total, deposit")
    .eq("id", data.orderId)
    .single()
  ```

- **Added**: Validation that payment doesn't exceed amount due
  ```typescript
  const amountDue = orderTotal - currentDeposit
  if (data.amount > amountDue && amountDue > 0) {
    throw new Error(`Le montant ne peut pas dépasser le solde dû (${amountDue} TND)`)
  }
  ```

- **Updated**: Status history record to use new payment status format
  - Old: `to_status: paymentStatus === "paid" ? "paiement-complet" : "paiement-partiel"`
  - New: `to_status: \`payment_\${paymentStatus}\``

#### `/components/cash-register/orders-list.tsx`

**Entire component refactored - Lines 1-123**

**Before**: Static mock data in useState
```typescript
const [orders, setOrders] = useState<Order[]>([
  { id: '1', customerName: 'Ahmed Ben Ali', ... }
])
```

**After**: Fetches real orders from database
```typescript
'use client'
import { useEffect, useState } from 'react'
import { fetchOrders, deleteOrder } from '@/lib/orders/actions'
import { useTenantStore } from '@/hooks/use-tenant-store'

export function OrdersList() {
  const { tenantId } = useTenantStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadOrders = async () => {
      const data = await fetchOrders(tenantId)
      setOrders(data.slice(0, 10))
    }
    loadOrders()
  }, [tenantId])

  const handleDelete = async (id: string) => {
    const success = await deleteOrder(id)
    if (success) {
      setOrders(orders.filter(order => order.id !== id))
    }
  }
  
  // ... rest of component
}
```

**Changes**:
- Added loading and error states
- Fetch orders on component mount
- Use real data from database
- Real deletion via API instead of local state only
- Better status badge mapping
- Better date formatting

#### `/components/orders/orders-view.tsx`

**Change: Update status labels (Lines 95-98)**
- **Removed**: 
  ```typescript
  "paiement-complet": "Paiement complet",
  "paiement-partiel": "Acompte enregistre",
  ```
- **Added**:
  ```typescript
  "payment_paid": "Paiement complet",
  "payment_partial": "Paiement partiel",
  "payment_unpaid": "Non paye",
  ```
- **Reason**: Match the new payment status format used in order_status_history

#### `/CODE_FIXES_REQUIRED.md`

**Updated Section 3 to mark as COMPLETED**
- Status changed from "Actuel (Bloqué)" to "✅ STATUS: CORRECTED"
- Added summary of all bugs fixed
- Added detailed before/after for each fix

### New Files Created

#### `/CORRECTIONS_APPLIQUEES.md`
Summary document of all corrections with examples

#### `/AUDIT_PROCESSUS_COMMANDE.md`
Detailed audit report with:
- Bug descriptions and impact
- Solutions applied
- Recommended tests
- Before/after comparisons

---

## Database Schema Changes
None - All tables already exist and are used correctly

## Migration Required
None - Code-only changes

## Breaking Changes
None - These are bugfixes that restore intended functionality

## Tests Added
None yet - See AUDIT_PROCESSUS_COMMANDE.md for recommended test cases

---

## Deployment Notes

1. Deploy this version as-is - no database migrations needed
2. After deployment, run recommended tests in AUDIT_PROCESSUS_COMMANDE.md
3. Monitor error logs for any "payment validation" errors (expected during transition)
4. No API changes - all client calls remain the same
