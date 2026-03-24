# Stock Alerts Workflow System

## Overview

This system provides a complete, automated workflow to transform stock alerts into supplier purchase orders with full traceability.

### Workflow Steps
1. **Stock Alert Detection** → Low inventory triggers alerts (by severity: critical, warning, info)
2. **1-Click Conversion** → Select alerts and convert to procurement orders (bon_approvisionnement)
3. **Supplier Order Generation** → Automatically create supplier purchase orders
4. **Complete Audit Trail** → Track every action with timestamps and user information

## Features

- ✅ Real-time stock alert detection
- ✅ Bulk conversion (1 click = Multiple alerts → Procurement order)
- ✅ Automatic supplier order generation with cost calculations
- ✅ Complete audit trail with user tracking
- ✅ Real-time notifications via Supabase
- ✅ Multi-tenant support with RLS policies
- ✅ Priority-based processing (low, normal, high, urgent)
- ✅ Traceability dashboard with relationship mapping

## Setup Instructions

### Step 1: Execute Database Migrations

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Create a **New Query**
3. Copy and paste the content from `/scripts/051-workflow-tables.sql`
4. Click **Run**
5. Repeat for `/scripts/052-workflow-functions.sql`

### Step 2: Verify Database Setup

Check in Supabase that these tables exist:
- `stock_alerts`
- `bon_approvisionnement`
- `bon_approvisionnement_items`
- `workflow_audit_log`
- `supplier_products`

Check that these functions exist:
- `generate_appro_reference()`
- `convert_alerts_to_appro()`
- `generate_purchase_orders_from_appro()`

### Step 3: Access the Workflow Pages

Navigate to your app at:
- `/workflow/stock-alerts` - View and convert alerts
- `/workflow/procurement-orders` - Manage procurement orders
- `/workflow/traceability` - View complete audit trail

## API Endpoints

### POST `/api/workflow/convert-alerts`
Convert selected stock alerts to a procurement order.

**Request:**
```json
{
  "alertIds": ["uuid1", "uuid2", ...],
  "priority": "normal",
  "userId": "user-uuid",
  "tenantId": "tenant-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "bonApproId": "uuid",
  "message": "Stock alerts converted to procurement order successfully"
}
```

### POST `/api/workflow/generate-orders`
Generate supplier purchase orders from procurement order.

**Request:**
```json
{
  "approId": "bon-appro-uuid",
  "userId": "user-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "orderCount": 2,
  "message": "2 purchase order(s) generated successfully"
}
```

### GET `/api/workflow/audit-log`
Retrieve complete audit trail.

**Headers:**
```
x-tenant-id: tenant-uuid
```

**Response:**
```json
{
  "success": true,
  "auditLog": [...]
}
```

## Database Schema

### stock_alerts
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference |
| item_name | TEXT | Product/item name |
| item_type | TEXT | raw_material, packaging, consumable |
| current_stock | NUMERIC | Current inventory level |
| min_stock | NUMERIC | Minimum stock threshold |
| suggested_quantity | NUMERIC | Recommended order quantity |
| severity | TEXT | critical, warning, info |
| status | TEXT | pending, converted, ignored, resolved |
| estimated_unit_price | NUMERIC | Unit price estimate |
| preferred_supplier_name | TEXT | Default supplier |
| created_at | TIMESTAMPTZ | Creation timestamp |

### bon_approvisionnement
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference |
| reference | TEXT | Unique reference (BA-YY-XXXX) |
| status | TEXT | draft, validated, sent_to_suppliers, etc |
| priority | TEXT | low, normal, high, urgent |
| total_items | INTEGER | Number of items |
| estimated_total | NUMERIC | Estimated total cost |
| created_by | UUID | User who created |
| validated_by | UUID | User who validated |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### bon_approvisionnement_items
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| bon_appro_id | UUID | Parent procurement order |
| stock_alert_id | UUID | Source alert |
| item_name | TEXT | Item name |
| requested_quantity | NUMERIC | Quantity requested |
| validated_quantity | NUMERIC | Quantity after validation |
| estimated_total | NUMERIC | Line item total |
| assigned_supplier_id | UUID | Assigned supplier |
| purchase_order_id | UUID | Generated purchase order |
| status | TEXT | pending, validated, ordered, received |

### workflow_audit_log
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference |
| entity_type | TEXT | stock_alert, bon_approvisionnement, purchase_order |
| entity_id | UUID | ID of the entity |
| action | TEXT | created, updated, validated, converted, ordered |
| old_status | TEXT | Previous status |
| new_status | TEXT | New status |
| details | JSONB | Additional metadata |
| related_alert_id | UUID | Source alert (if applicable) |
| related_appro_id | UUID | Related procurement order |
| related_order_id | UUID | Related purchase order |
| performed_by | UUID | User who performed action |
| performed_at | TIMESTAMPTZ | Action timestamp |

## Hooks and Functions

### `useStockAlerts(tenantId)`
Hook to fetch and subscribe to stock alerts in real-time.

```typescript
const { alerts, isLoading, error, refetch } = useStockAlerts(tenantId);
```

### `useBonApprovisionnement(tenantId)`
Hook to fetch and subscribe to procurement orders in real-time.

```typescript
const { orders, isLoading, error, refetch } = useBonApprovisionnement(tenantId);
```

### `useStockAlertsWorkflow()`
Hook to manage workflow operations (convert alerts, generate orders).

```typescript
const { 
  convertAlertsToAppro, 
  generatePurchaseOrders, 
  isLoading, 
  error 
} = useStockAlertsWorkflow();
```

## Components

### `<StockAlertsList />`
Displays stock alerts with selection and conversion functionality.

```tsx
<StockAlertsList
  alerts={alerts}
  onConvertSuccess={(bonApproId) => {
    // Handle successful conversion
  }}
/>
```

### `<BonApproView />`
Shows procurement order details with order generation button.

```tsx
<BonApproView
  order={order}
  onOrdersGenerated={(count) => {
    // Handle successful generation
  }}
/>
```

### `<WorkflowTraceability />`
Displays complete audit trail of all workflow actions.

```tsx
<WorkflowTraceability tenantId={tenantId} />
```

## Pages

### `/workflow/stock-alerts`
- View all stock alerts by severity
- Summary cards (total, critical, warning, info)
- Select and convert alerts to procurement order
- Real-time updates

### `/workflow/procurement-orders`
- Manage all procurement orders
- Summary by status (draft, validated, sent)
- View estimated totals
- Generate supplier purchase orders
- Real-time updates

### `/workflow/traceability`
- Complete audit trail of all transformations
- Timeline view of all actions
- Entity relationships and linkage
- User tracking and timestamps
- Filter by entity type

## Real-Time Features

The system uses Supabase Realtime to provide:
- Instant stock alert notifications
- Real-time order status updates
- Live audit log updates
- Multi-user collaboration awareness

Subscriptions are automatically managed by the hooks.

## Security

- Row-Level Security (RLS) policies enforce tenant isolation
- User actions are tracked for audit purposes
- All sensitive data is encrypted in transit
- API routes require proper authentication

## Troubleshooting

### "Failed to convert alerts" error
- Verify stock_alerts table contains pending alerts
- Ensure your user has valid UUID
- Check tenant_id is correct
- Confirm SQL functions are created in Supabase

### Procurement orders not generating
- Verify bon_approvisionnement status is "validated"
- Ensure all items have assigned suppliers
- Check generate_purchase_orders_from_appro function exists

### Audit logs empty
- Verify triggers are active in Supabase
- Confirm workflow_audit_log table exists
- Check that recent actions occurred after triggers were created

## Performance Optimization

- Indexes are created on frequently queried columns
- Tenant_id is indexed for fast filtering
- Status columns are indexed for quick status queries
- Real-time subscriptions are optimized per tenant

## Future Enhancements

Potential extensions to the system:
- Automatic reorder point calculation
- Machine learning-based demand forecasting
- Supplier performance tracking
- Cost optimization recommendations
- Integration with accounting systems
- Advanced reporting and analytics
