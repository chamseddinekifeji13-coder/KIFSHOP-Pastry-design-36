-- ============================================================
-- FIX: Remove strict foreign key constraint on orders.created_by
-- The created_by column should NOT reference auth.users directly
-- because we use tenant_users.id for employee profiles
-- ============================================================

-- 1. Drop the existing foreign key constraint if it exists
DO $$
BEGIN
  -- Try to drop the constraint by name
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_created_by_fkey' 
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_created_by_fkey;
    RAISE NOTICE 'Dropped constraint: orders_created_by_fkey';
  END IF;
  
  -- Also try alternate naming conventions
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_orders_created_by' 
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT fk_orders_created_by;
    RAISE NOTICE 'Dropped constraint: fk_orders_created_by';
  END IF;
END $$;

-- 2. Drop all foreign key constraints on orders.created_by
DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  FOR constraint_rec IN
    SELECT conname
    FROM pg_constraint 
    WHERE conrelid = 'public.orders'::regclass
    AND contype = 'f'  -- foreign key
    AND array_to_string(conkey, ',') LIKE '%' || (
      SELECT attnum::text 
      FROM pg_attribute 
      WHERE attrelid = 'public.orders'::regclass 
      AND attname = 'created_by'
    ) || '%'
  LOOP
    EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT ' || quote_ident(constraint_rec.conname);
    RAISE NOTICE 'Dropped constraint: %', constraint_rec.conname;
  END LOOP;
END $$;

-- 3. Make sure created_by column is nullable and has no constraint
-- (we store auth.users.id OR can leave it null for system-created orders)
ALTER TABLE public.orders 
  ALTER COLUMN created_by DROP NOT NULL;

-- 4. Add an index for performance on created_by lookups
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON public.orders(created_by);

-- 5. Same fix for order_status_history if it has similar constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_status_history_changed_by_fkey' 
    AND table_name = 'order_status_history'
  ) THEN
    ALTER TABLE public.order_status_history DROP CONSTRAINT order_status_history_changed_by_fkey;
    RAISE NOTICE 'Dropped constraint: order_status_history_changed_by_fkey';
  END IF;
END $$;

-- 6. Fix payment_collections if it has similar constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payment_collections_recorded_by_fkey' 
    AND table_name = 'payment_collections'
  ) THEN
    ALTER TABLE public.payment_collections DROP CONSTRAINT payment_collections_recorded_by_fkey;
    RAISE NOTICE 'Dropped constraint: payment_collections_recorded_by_fkey';
  END IF;
END $$;

COMMIT;
