-- POS80-003: Add Source Column and Sales Reconciliation
-- Status: IMPORTANT - Must execute seventh
-- Purpose: Add source tracking to orders and create sales history for POS80 reconciliation

-- Add source column to orders table if it doesn't exist
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'web', -- 'web', 'pos80', 'api', 'manual'
ADD COLUMN IF NOT EXISTS pos80_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS pos80_sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'synced', 'failed'
ADD COLUMN IF NOT EXISTS pos80_last_sync_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100), -- Reference to POS80 receipt number
ADD COLUMN IF NOT EXISTS external_reference_id VARCHAR(255); -- External system reference

-- Create index for POS80 tracking
CREATE INDEX IF NOT EXISTS idx_orders_pos80_id ON public.orders(pos80_id);
CREATE INDEX IF NOT EXISTS idx_orders_source ON public.orders(source);
CREATE INDEX IF NOT EXISTS idx_orders_pos80_sync_status ON public.orders(pos80_sync_status);

-- Create sales reconciliation table
DROP TABLE IF EXISTS public.sales_reconciliation CASCADE;

CREATE TABLE public.sales_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    reconciliation_date DATE NOT NULL,
    
    -- Sales Totals
    web_sales_count INTEGER DEFAULT 0,
    web_sales_total DECIMAL(10, 2) DEFAULT 0,
    
    pos80_sales_count INTEGER DEFAULT 0,
    pos80_sales_total DECIMAL(10, 2) DEFAULT 0,
    
    manual_sales_count INTEGER DEFAULT 0,
    manual_sales_total DECIMAL(10, 2) DEFAULT 0,
    
    api_sales_count INTEGER DEFAULT 0,
    api_sales_total DECIMAL(10, 2) DEFAULT 0,
    
    -- Discrepancies
    discrepancy_amount DECIMAL(10, 2) DEFAULT 0,
    discrepancy_percentage DECIMAL(5, 2) DEFAULT 0,
    is_balanced BOOLEAN DEFAULT false,
    
    -- Notes
    notes TEXT,
    reconciliation_notes JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reconciled', 'reviewed', 'approved'
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    approved_by UUID,
    approved_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Create indexes
CREATE INDEX idx_sales_reconciliation_tenant_id ON public.sales_reconciliation(tenant_id);
CREATE INDEX idx_sales_reconciliation_date ON public.sales_reconciliation(reconciliation_date);
CREATE INDEX idx_sales_reconciliation_status ON public.sales_reconciliation(status);

-- Enable RLS
ALTER TABLE public.sales_reconciliation ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view sales reconciliation of their tenant" 
    ON public.sales_reconciliation FOR SELECT 
    TO authenticated 
    USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "Only admins can insert reconciliation" 
    ON public.sales_reconciliation FOR INSERT 
    TO authenticated 
    WITH CHECK (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.role = 'admin'));

CREATE POLICY "Only admins can update reconciliation" 
    ON public.sales_reconciliation FOR UPDATE 
    TO authenticated 
    USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.role = 'admin'));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.sales_reconciliation TO authenticated;

-- Create function for sales reconciliation
CREATE OR REPLACE FUNCTION recalculate_sales_reconciliation(p_tenant_id UUID, p_date DATE)
RETURNS void AS $$
DECLARE
    v_web_count INTEGER;
    v_web_total DECIMAL(10, 2);
    v_pos80_count INTEGER;
    v_pos80_total DECIMAL(10, 2);
    v_manual_count INTEGER;
    v_manual_total DECIMAL(10, 2);
    v_api_count INTEGER;
    v_api_total DECIMAL(10, 2);
BEGIN
    -- Get sales counts and totals by source
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0) INTO v_web_count, v_web_total
    FROM public.orders
    WHERE tenant_id = p_tenant_id 
    AND source = 'web'
    AND DATE(created_at) = p_date;
    
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0) INTO v_pos80_count, v_pos80_total
    FROM public.orders
    WHERE tenant_id = p_tenant_id 
    AND source = 'pos80'
    AND DATE(created_at) = p_date;
    
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0) INTO v_manual_count, v_manual_total
    FROM public.orders
    WHERE tenant_id = p_tenant_id 
    AND source = 'manual'
    AND DATE(created_at) = p_date;
    
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0) INTO v_api_count, v_api_total
    FROM public.orders
    WHERE tenant_id = p_tenant_id 
    AND source = 'api'
    AND DATE(created_at) = p_date;
    
    -- Insert or update reconciliation
    INSERT INTO public.sales_reconciliation (
        tenant_id, reconciliation_date,
        web_sales_count, web_sales_total,
        pos80_sales_count, pos80_sales_total,
        manual_sales_count, manual_sales_total,
        api_sales_count, api_sales_total,
        created_by
    ) VALUES (
        p_tenant_id, p_date,
        v_web_count, v_web_total,
        v_pos80_count, v_pos80_total,
        v_manual_count, v_manual_total,
        v_api_count, v_api_total,
        auth.uid()
    )
    ON CONFLICT (tenant_id, reconciliation_date) DO UPDATE SET
        web_sales_count = v_web_count,
        web_sales_total = v_web_total,
        pos80_sales_count = v_pos80_count,
        pos80_sales_total = v_pos80_total,
        manual_sales_count = v_manual_count,
        manual_sales_total = v_manual_total,
        api_sales_count = v_api_count,
        api_sales_total = v_api_total,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
