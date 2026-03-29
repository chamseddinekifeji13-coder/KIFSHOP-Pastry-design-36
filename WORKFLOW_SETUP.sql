-- =============================================
-- SETUP INSTRUCTIONS FOR WORKFLOW SYSTEM
-- =============================================

-- This document explains how to set up the complete Stock Alerts to Supplier Purchase Orders workflow system.

-- STEP 1: Execute this file in Supabase SQL Editor
-- Go to: Supabase Dashboard → Your Project → SQL Editor → New Query
-- Copy the contents of this entire script and paste it into the SQL editor
-- Click "Run" to execute all migrations

-- STEP 2: The workflow creates the following tables:
-- - stock_alerts: Detects low stock levels
-- - bon_approvisionnement: Procurement orders (Bon Appro)
-- - bon_approvisionnement_items: Line items in procurement orders
-- - workflow_audit_log: Complete audit trail of all transformations
-- - supplier_products: Supplier pricing and availability mapping

-- STEP 3: The system includes these SQL functions:
-- - generate_appro_reference(tenant_id): Generates unique reference numbers
-- - convert_alerts_to_appro(alert_ids[], user_id, priority): Converts alerts to procurement orders
-- - generate_purchase_orders_from_appro(appro_id, user_id): Generates supplier purchase orders

-- STEP 4: Real-time triggers track all changes automatically
-- - Audit logs are created for every action
-- - Status changes are recorded with timestamps
-- - Related entities are linked for complete traceability

-- =============================================
-- TO USE THE WORKFLOW IN YOUR APP:
-- =============================================

-- 1. Navigate to: /workflow/stock-alerts
--    - View all stock alerts sorted by severity
--    - Select multiple alerts with checkboxes
--    - Choose priority level
--    - Click "Convert to Procurement Order" (1 CLICK)

-- 2. Navigate to: /workflow/procurement-orders
--    - View all generated procurement orders
--    - Review items and estimated costs
--    - Click "Generate Supplier Orders" to create purchase orders

-- 3. Navigate to: /workflow/traceability
--    - See complete audit trail of all transformations
--    - Track status changes at each step
--    - Link between alerts → procurement → supplier orders

-- =============================================
-- API ENDPOINTS
-- =============================================

-- POST /api/workflow/convert-alerts
-- - Converts selected stock alerts to procurement order
-- - Body: { alertIds: [], priority: "normal", userId: "", tenantId: "" }
-- - Returns: { bonApproId: uuid, message: string }

-- POST /api/workflow/generate-orders
-- - Generates supplier purchase orders from procurement order
-- - Body: { approId: uuid, userId: uuid }
-- - Returns: { orderCount: number, message: string }

-- GET /api/workflow/audit-log
-- - Retrieves complete audit trail
-- - Headers: { x-tenant-id: uuid }
-- - Returns: { auditLog: WorkflowAuditLog[] }

-- =============================================
-- DATABASE SCHEMA OVERVIEW
-- =============================================

-- stock_alerts:
-- - id: UUID (primary key)
-- - tenant_id: UUID (tenant reference)
-- - item_name: TEXT
-- - item_type: raw_material | packaging | consumable
-- - current_stock: NUMERIC
-- - min_stock: NUMERIC
-- - suggested_quantity: NUMERIC
-- - severity: critical | warning | info
-- - status: pending | converted | ignored | resolved
-- - estimated_unit_price: NUMERIC (optional)
-- - preferred_supplier_name: TEXT (optional)
-- - created_at: TIMESTAMPTZ

-- bon_approvisionnement:
-- - id: UUID (primary key)
-- - tenant_id: UUID
-- - reference: TEXT UNIQUE (e.g., "BA-25-0001")
-- - status: draft | validated | sent_to_suppliers | partially_ordered | fully_ordered | cancelled
-- - priority: low | normal | high | urgent
-- - total_items: INTEGER
-- - estimated_total: NUMERIC
-- - created_by: UUID (user reference)
-- - validated_by: UUID (optional)
-- - validated_at: TIMESTAMPTZ (optional)
-- - created_at, updated_at: TIMESTAMPTZ

-- bon_approvisionnement_items:
-- - id: UUID
-- - bon_appro_id: UUID (references bon_approvisionnement)
-- - stock_alert_id: UUID (references stock_alerts)
-- - item_name, item_unit: TEXT
-- - requested_quantity: NUMERIC
-- - validated_quantity: NUMERIC (optional)
-- - estimated_unit_price: NUMERIC
-- - estimated_total: NUMERIC
-- - assigned_supplier_id: UUID
-- - assigned_supplier_name: TEXT
-- - purchase_order_id: UUID (references orders table)
-- - status: pending | validated | ordered | received | cancelled

-- workflow_audit_log:
-- - id: UUID
-- - tenant_id: UUID
-- - entity_type: stock_alert | bon_approvisionnement | purchase_order
-- - entity_id: UUID
-- - action: created | updated | validated | converted | ordered | received
-- - old_status, new_status: TEXT
-- - details: JSONB (additional metadata)
-- - related_alert_id, related_appro_id, related_order_id: UUID
-- - performed_by: UUID (user reference)
-- - performed_at: TIMESTAMPTZ

-- =============================================
-- WORKFLOW FLOW DIAGRAM
-- =============================================

-- Stock Alert (inventory low)
--     ↓
-- [1 CLICK] Convert to Procurement Order (bon_approvisionnement)
--     ↓
-- Validate Items & Assign Suppliers
--     ↓
-- [Generate Supplier Orders] → Purchase Orders (orders table)
--     ↓
-- Track Delivery & Receipt
--     ↓
-- Complete Audit Trail Available in Traceability Page

-- =============================================
-- TROUBLESHOOTING
-- =============================================

-- Q: I see "Failed to convert alerts" error
-- A: Ensure:
--    1. Stock alerts exist in the stock_alerts table
--    2. Your user has a valid UUID in the auth.users table
--    3. Your tenant_id is correct
--    4. The SQL functions are created (you can check in Supabase → Functions)

-- Q: Procurement orders are not generating
-- A: Make sure:
--    1. The bon_approvisionnement status is "validated"
--    2. All items have assigned suppliers
--    3. The generate_purchase_orders_from_appro function exists

-- Q: Audit logs are empty
-- A: Check:
--    1. The triggers are active (Supabase → Triggers)
--    2. workflow_audit_log table has write permissions
--    3. Recent actions occurred after the triggers were created

-- =============================================
-- CUSTOMIZATION TIPS
-- =============================================

-- 1. Change severity thresholds in the SQL functions
-- 2. Customize the bon_approvisionnement reference format (currently "BA-YY-XXXX")
-- 3. Add custom fields to any table by running ALTER TABLE statements
-- 4. Modify status values in CHECK constraints if needed
-- 5. Create additional indexes on frequently queried columns

-- =============================================
-- FEATURES INCLUDED
-- =============================================

-- ✓ Real-time stock alert detection
-- ✓ 1-click conversion to procurement orders
-- ✓ Automatic supplier order generation
-- ✓ Complete audit trail with timestamps
-- ✓ User action tracking
-- ✓ Tenant isolation with RLS policies
-- ✓ Estimated costs calculations
-- ✓ Priority-based ordering
-- ✓ Relationship tracking between entities
-- ✓ Real-time notifications via Supabase

