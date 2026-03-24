# QUICK START GUIDE - Workflow System

## 5-Minute Setup

### Step 1: Run SQL Migrations (2 minutes)

1. Open **Supabase Dashboard** → Your Project → **SQL Editor**
2. Click **New Query**
3. Copy all content from `/scripts/051-workflow-tables.sql`
4. Click **Run** (wait for success)
5. Click **New Query** again
6. Copy all content from `/scripts/052-workflow-functions.sql`
7. Click **Run** (wait for success)

✅ Database setup complete!

---

### Step 2: Verify Tables (1 minute)

In Supabase Dashboard → **Table Editor**, you should see:
- [ ] `stock_alerts`
- [ ] `bon_approvisionnement`
- [ ] `bon_approvisionnement_items`
- [ ] `workflow_audit_log`
- [ ] `supplier_products`

In Supabase Dashboard → **Functions**, you should see:
- [ ] `generate_appro_reference`
- [ ] `convert_alerts_to_appro`
- [ ] `generate_purchase_orders_from_appro`

---

### Step 3: Access Pages (2 minutes)

Your app now has 3 new pages:

1. **Stock Alerts Dashboard**
   ```
   /workflow/stock-alerts
   ```
   - View stock alerts
   - Select alerts
   - Convert to procurement order (1 click!)

2. **Procurement Orders Dashboard**
   ```
   /workflow/procurement-orders
   ```
   - View procurement orders
   - Generate supplier orders

3. **Workflow Traceability**
   ```
   /workflow/traceability
   ```
   - Complete audit trail
   - See all transformations

---

## The 1-Click Workflow

### How It Works

1. **Go to** `/workflow/stock-alerts`
2. **Select** alerts with checkboxes
3. **Choose** priority level
4. **Click** "Convert to Procurement Order"
5. ✅ **Done!** Procurement order created instantly

### Behind the Scenes

```
Your Click
    ↓
API: POST /api/workflow/convert-alerts
    ↓
Function: convert_alerts_to_appro()
    ↓
- Creates bon_approvisionnement
- Creates bon_approvisionnement_items
- Updates alert statuses
- Creates audit log entry
    ↓
✅ Procurement order ID returned
```

---

## API Usage (if integrating with other systems)

### Convert Alerts

```bash
curl -X POST http://localhost:3000/api/workflow/convert-alerts \
  -H "Content-Type: application/json" \
  -d '{
    "alertIds": ["uuid1", "uuid2"],
    "priority": "normal",
    "userId": "user-uuid",
    "tenantId": "tenant-uuid"
  }'
```

**Response:**
```json
{
  "success": true,
  "bonApproId": "new-uuid",
  "message": "Stock alerts converted to procurement order successfully"
}
```

### Generate Orders

```bash
curl -X POST http://localhost:3000/api/workflow/generate-orders \
  -H "Content-Type: application/json" \
  -d '{
    "approId": "bon-appro-uuid",
    "userId": "user-uuid"
  }'
```

**Response:**
```json
{
  "success": true,
  "orderCount": 2,
  "message": "2 purchase order(s) generated successfully"
}
```

---

## Common Tasks

### Task 1: Convert Critical Alerts

1. Go to `/workflow/stock-alerts`
2. Look for **RED badges** (critical severity)
3. Check those checkboxes
4. Set priority to "Urgent"
5. Click "Convert to Procurement Order"
6. Done!

### Task 2: View All Generated Orders

1. Go to `/workflow/procurement-orders`
2. See all procurement orders
3. Click on "Draft" tab to see pending orders
4. Click "Generate Supplier Orders" on any order

### Task 3: See Full History

1. Go to `/workflow/traceability`
2. See timeline of all actions
3. Scroll down for more history
4. Click on entries to see details

### Task 4: Check Who Did What

1. Go to `/workflow/traceability`
2. Look for "performed_by" information
3. See exact timestamps of all actions
4. Check what changed in audit details

---

## Using in Your Code

### Example 1: Display Alerts in Your Component

```tsx
import { useStockAlerts } from '@/hooks/use-workflow-data';
import { useTenant } from '@/hooks/use-tenant';

export function MyComponent() {
  const { tenant } = useTenant();
  const { alerts, isLoading } = useStockAlerts(tenant?.id || null);

  return (
    <div>
      <h2>Stock Alerts: {alerts.length}</h2>
      {alerts.map(alert => (
        <div key={alert.id}>
          <p>{alert.item_name}</p>
          <p>Current: {alert.current_stock}</p>
          <p>Min: {alert.min_stock}</p>
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Convert Alerts Programmatically

```tsx
import { useStockAlertsWorkflow } from '@/hooks/use-stock-alerts-workflow';

export function MyConvertButton() {
  const { convertAlertsToAppro, isLoading } = useStockAlertsWorkflow();

  const handleConvert = async () => {
    const bonApproId = await convertAlertsToAppro(
      ['alert-uuid-1', 'alert-uuid-2'],
      'normal'
    );
    console.log('Created:', bonApproId);
  };

  return (
    <button onClick={handleConvert} disabled={isLoading}>
      {isLoading ? 'Converting...' : 'Convert Alerts'}
    </button>
  );
}
```

### Example 3: Show Procurement Orders

```tsx
import { useBonApprovisionnement } from '@/hooks/use-workflow-data';
import { useTenant } from '@/hooks/use-tenant';

export function MyOrdersList() {
  const { tenant } = useTenant();
  const { orders } = useBonApprovisionnement(tenant?.id || null);

  return (
    <div>
      {orders.map(order => (
        <div key={order.id}>
          <h3>{order.reference}</h3>
          <p>Items: {order.total_items}</p>
          <p>Total: {order.estimated_total}</p>
          <p>Status: {order.status}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Troubleshooting

### "Failed to convert alerts" Error

**Solution:**
1. Make sure you have stock alerts in database
2. Check user UUID is correct
3. Verify tenant_id is correct
4. Confirm SQL functions exist in Supabase

### Procurement Orders Not Showing

**Solution:**
1. Check `/workflow/stock-alerts` page loads
2. Verify alerts were successfully converted
3. Check Supabase SQL Editor for errors
4. Look at browser console for error messages

### Real-time Updates Not Working

**Solution:**
1. Check Supabase Realtime is enabled
2. Verify database tables have Realtime enabled
3. Try refreshing page
4. Check network tab for WebSocket connections

### No Audit Log Entries

**Solution:**
1. Verify triggers are active in Supabase
2. Check workflow_audit_log table exists
3. Ensure recent actions occurred
4. Look at Supabase logs for trigger errors

---

## File Locations Quick Reference

```
Pages (navigate to these):
├── /workflow/stock-alerts          ← View & convert alerts
├── /workflow/procurement-orders    ← Manage orders
└── /workflow/traceability          ← Audit trail

API Routes (call these):
├── POST /api/workflow/convert-alerts
├── POST /api/workflow/generate-orders
└── GET  /api/workflow/audit-log

Components (import these):
├── StockAlertsList          from @/components/workflow/...
├── BonApproView             from @/components/workflow/...
└── WorkflowTraceability     from @/components/workflow/...

Hooks (use these):
├── useStockAlerts()         from @/hooks/use-workflow-data
├── useBonApprovisionnement()from @/hooks/use-workflow-data
└── useStockAlertsWorkflow() from @/hooks/use-stock-alerts-workflow

Documentation (read these):
├── WORKFLOW_README.md                   ← Full documentation
├── WORKFLOW_SETUP.sql                   ← Setup guide
├── WORKFLOW_IMPLEMENTATION_SUMMARY.md   ← Implementation details
├── WORKFLOW_DELIVERABLES.md             ← Deliverables checklist
└── lib/workflow/examples.tsx            ← 7 code examples

SQL Scripts (run these):
├── /scripts/051-workflow-tables.sql     ← Run first
└── /scripts/052-workflow-functions.sql  ← Run second
```

---

## Next Steps

After setup is complete:

1. **Test the workflow** - Create stock alerts and convert them
2. **Explore the pages** - Navigate through all 3 dashboards
3. **Check audit trail** - Verify all actions are logged
4. **Customize** - Modify priority levels, status values, or reference format
5. **Integrate** - Use components/hooks in your own pages
6. **Deploy** - Push to production when ready

---

## Support

- **Full Documentation:** See `WORKFLOW_README.md`
- **Setup Guide:** See `WORKFLOW_SETUP.sql`
- **Examples:** See `/lib/workflow/examples.tsx`
- **Deliverables:** See `WORKFLOW_DELIVERABLES.md`
- **Implementation Details:** See `WORKFLOW_IMPLEMENTATION_SUMMARY.md`

---

## Summary

✅ **Database:** 5 tables + 3 functions ready
✅ **API:** 3 routes ready to use
✅ **Pages:** 3 dashboards ready to access
✅ **Components:** 3 components ready to import
✅ **Hooks:** 2 hooks ready to use
✅ **Documentation:** 5 guides with examples
✅ **Real-time:** Supabase subscriptions active

**You're all set! 🚀**
