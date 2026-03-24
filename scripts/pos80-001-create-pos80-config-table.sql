-- POS80-001: Create POS80 Configuration Table
-- Status: IMPORTANT - Must execute fifth
-- Purpose: Create table to store POS80 system configuration and API credentials

DROP TABLE IF EXISTS public.pos80_config CASCADE;

CREATE TABLE public.pos80_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- POS80 API Credentials
    api_key VARCHAR(255) NOT NULL,
    api_url VARCHAR(500) NOT NULL,
    location_id VARCHAR(100),
    terminal_id VARCHAR(100),
    
    -- Configuration Settings
    auto_sync_enabled BOOLEAN DEFAULT true,
    sync_interval_minutes INTEGER DEFAULT 15,
    enable_inventory_sync BOOLEAN DEFAULT true,
    enable_sales_sync BOOLEAN DEFAULT true,
    enable_customer_sync BOOLEAN DEFAULT true,
    
    -- Last Sync Information
    last_sync_at TIMESTAMP,
    last_inventory_sync_at TIMESTAMP,
    last_sales_sync_at TIMESTAMP,
    next_sync_at TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    connection_status VARCHAR(50) DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
    last_error_message TEXT,
    last_error_at TIMESTAMP,
    
    -- Metadata
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    CONSTRAINT unique_pos80_per_tenant UNIQUE(tenant_id)
);

-- Create index
CREATE INDEX idx_pos80_config_tenant_id ON public.pos80_config(tenant_id);
CREATE INDEX idx_pos80_config_is_active ON public.pos80_config(is_active);

-- Enable RLS
ALTER TABLE public.pos80_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Only admins can view POS80 config" 
    ON public.pos80_config FOR SELECT 
    TO authenticated 
    USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.role = 'admin'));

CREATE POLICY "Only admins can insert POS80 config" 
    ON public.pos80_config FOR INSERT 
    TO authenticated 
    WITH CHECK (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.role = 'admin'));

CREATE POLICY "Only admins can update POS80 config" 
    ON public.pos80_config FOR UPDATE 
    TO authenticated 
    USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.role = 'admin'));

CREATE POLICY "System can update connection status" 
    ON public.pos80_config FOR UPDATE 
    TO authenticated 
    USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.pos80_config TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pos80_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pos80_config_timestamp
    BEFORE UPDATE ON public.pos80_config
    FOR EACH ROW
    EXECUTE FUNCTION update_pos80_config_timestamp();
