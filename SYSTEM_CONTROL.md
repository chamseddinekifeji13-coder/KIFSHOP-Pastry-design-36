# 🔧 SYSTEM CONTROL & TESTING GUIDE

## Database Integrity Checks

### Check 1: Verify transactions table constraints
```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public' 
AND constraint_name LIKE '%transactions%';
```

Expected output:
- `transactions_type_check`: type = 'income' OR 'expense'
- `transactions_payment_method_check`: payment_method IN ('cash', 'card', 'bank_transfer', 'check', 'mobile_payment')

### Check 2: Verify recent transactions
```sql
SELECT id, type, category, amount, description, created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 10;
```

Expected:
- All `type` values should be 'income' or 'expense' ONLY
- POS sales should have `category = 'pos_sale'`
- Collections should have `category = 'collection'`

### Check 3: Verify all columns exist
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'transactions'
ORDER BY ordinal_position;
```

## Code Changes Applied

### File 1: `/app/api/treasury/pos-sale/route.ts`
**What was changed:** 
- Line 39: `type: "income"` (was trying "sale")
- Added: `category: "pos_sale"` for identification
- Removed: `created_by_name` field (redundant, already saved)

**Verification:**
```bash
grep -n 'type.*income\|category.*pos_sale' /app/api/treasury/pos-sale/route.ts
```

### File 2: `/lib/treasury/cash-actions.ts`
**What was changed:**
- Line 122: Changed `type: 'collection'` to `type: 'income'`
- Line 123: Added `category: 'collection'`
- Line 51: Simplified balance calculation to check `t.type === 'income'` only

**Verification:**
```bash
grep -n "type.*income.*category.*collection" /lib/treasury/cash-actions.ts
grep -n "if (t.type === 'income')" /lib/treasury/cash-actions.ts
```

### File 3: `/components/treasury/printer-settings.tsx`
**What was changed:**
- Enhanced `silentQZTrayCheck` function (lines 136-165)
- Now shows toast notifications when QZ Tray connects successfully
- Displays printer count when detected

### File 4: `/components/treasury/treasury-pos-view.tsx`
**What was changed:**
- Added auto-check effect for QZ Tray on component mount (lines 194-218)
- Connects to QZ Tray service automatically
- Logs connection status to console

## Frontend Testing Checklist

### ✅ Test 1: POS Sale Transaction
```
STEP 1: Navigate to Trésorerie → POS
STEP 2: Add some items to cart
STEP 3: Click "Enregistrer la vente" (Save Sale)
STEP 4: Check for error messages
        ✅ Expected: Transaction saved successfully
        ❌ Wrong: "Column 'type' doesn't exist"
STEP 5: Verify in browser console (F12):
        Look for logs like "[v0] QZ Tray auto-connected"
```

### ✅ Test 2: Order Collection Payment
```
STEP 1: Navigate to Trésorerie → Commandes
STEP 2: Find a pending order
STEP 3: Click "Collecter un paiement"
STEP 4: Enter amount and payment method
STEP 5: Click save
        ✅ Expected: Collection saved
        ❌ Wrong: "Column 'type' doesn't exist"
```

### ✅ Test 3: QZ Tray Detection
```
STEP 1: Launch QZ Tray application on your computer
STEP 2: Make sure a thermal printer is configured
STEP 3: Reload the web page (F5)
STEP 4: Look for notification at bottom right
        ✅ Expected: "QZ Tray detecté - [printer name]"
        ❌ Wrong: No notification appears
STEP 5: Open Paramètres → Imprimante
        ✅ Expected: Green "Connecté" status
        ✅ Expected: Printer name shown
```

### ✅ Test 4: Print Receipt
```
STEP 1: Complete a POS sale
STEP 2: Check the "Imprimer le reçu" checkbox
STEP 3: Click print button
STEP 4: Check thermal printer output
        ✅ Expected: Receipt prints
        ❌ Wrong: No output or error message
```

## Debugging Console Logs

### QZ Tray Service Logs
Open browser console (F12) and look for:
```
[QZ Tray] Library loaded successfully from: https://...
[QZ Tray] Connected successfully on attempt 1
[QZ Tray] Found printers: printer1, printer2, etc
```

### POS Sale Logs
Look for:
```
[v0] QZ Tray auto-connected with X printers
POST /api/treasury/pos-sale - Response 200 OK
```

### Error Logs
If something fails:
```
[QZ Tray] Connection failed: (error message)
[QZ Tray] Library not available
Error creating transaction: (error details)
```

## Quick Fix Reference

### Problem: "Column 'type' doesn't exist"
**Solution:** Already fixed in:
- `/app/api/treasury/pos-sale/route.ts` ✅
- `/lib/treasury/cash-actions.ts` ✅

### Problem: "QZ Tray detecté" notification never appears
**Solution:** Already fixed in:
- `/components/treasury/printer-settings.tsx` ✅
- `/components/treasury/treasury-pos-view.tsx` ✅

### Problem: Printer not showing in settings
**Solution:** 
1. Make sure QZ Tray app is running
2. Refresh the page
3. Check browser console for errors
4. Verify printer is actually connected to computer

## Next Steps

1. **Immediate:** Test POS sale and collection operations
2. **Verify:** Check database for correct `type` and `category` values
3. **Confirm:** QZ Tray auto-detection shows notification
4. **Validate:** Print a test receipt if printer is available

---

**All critical fixes have been applied. System is ready for testing!**

Questions? Check the AUDIT_COMPLETE.md file for full details.
