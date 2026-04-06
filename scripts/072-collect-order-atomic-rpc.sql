-- Atomic order collection RPC
-- Creates collection + transaction + order update in a single DB transaction.

CREATE OR REPLACE FUNCTION public.collect_order_payment_atomic(
  p_tenant_id uuid,
  p_order_id uuid,
  p_cash_session_id uuid,
  p_amount numeric,
  p_payment_method text DEFAULT 'cash',
  p_collected_by uuid DEFAULT NULL,
  p_collected_by_name text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(
  collection_id uuid,
  transaction_id uuid,
  next_deposit numeric,
  next_payment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_remaining numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Montant invalide';
  END IF;

  SELECT id, total, deposit, payment_status
  INTO v_order
  FROM public.orders
  WHERE tenant_id::text = p_tenant_id::text
    AND id::text = p_order_id::text
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  v_remaining := GREATEST(COALESCE(v_order.total, 0) - COALESCE(v_order.deposit, 0), 0);

  IF COALESCE(v_order.payment_status, '') IN ('paid', 'collected') OR v_remaining <= 0 THEN
    RAISE EXCEPTION 'Cette commande est deja encaissee';
  END IF;

  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Montant invalide: reste % TND a encaisser',
      TO_CHAR(v_remaining, 'FM9999999990.000');
  END IF;

  next_deposit := COALESCE(v_order.deposit, 0) + p_amount;
  next_payment_status := CASE
    WHEN next_deposit >= COALESCE(v_order.total, 0) THEN 'paid'
    WHEN next_deposit > 0 THEN 'partial'
    ELSE 'unpaid'
  END;

  INSERT INTO public.transactions (
    tenant_id,
    type,
    category,
    amount,
    payment_method,
    description,
    order_id,
    cash_session_id,
    is_collection,
    created_by_name,
    created_at
  )
  VALUES (
    p_tenant_id::text,
    'income',
    'encaissement-commande',
    p_amount,
    COALESCE(NULLIF(TRIM(p_payment_method), ''), 'cash'),
    'Encaissement commande #' || p_order_id::text,
    p_order_id::text,
    p_cash_session_id,
    true,
    p_collected_by_name,
    NOW()
  )
  RETURNING id INTO transaction_id;

  INSERT INTO public.order_collections (
    tenant_id,
    order_id,
    transaction_id,
    cash_session_id,
    amount,
    payment_method,
    collected_by,
    collected_by_name,
    notes,
    collected_at
  )
  VALUES (
    p_tenant_id::text,
    p_order_id::text,
    transaction_id,
    p_cash_session_id,
    p_amount,
    COALESCE(NULLIF(TRIM(p_payment_method), ''), 'cash'),
    p_collected_by::text,
    p_collected_by_name,
    p_notes,
    NOW()
  )
  RETURNING id INTO collection_id;

  UPDATE public.orders
  SET
    deposit = next_deposit,
    payment_status = next_payment_status,
    updated_at = NOW()
  WHERE tenant_id::text = p_tenant_id::text
    AND id::text = p_order_id::text;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Erreur de mise a jour de la commande apres encaissement';
  END IF;

  RETURN NEXT;
END;
$$;
