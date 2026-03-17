-- Create pos80_config table for storing POS80 API configuration
CREATE TABLE IF NOT EXISTS public.pos80_config (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  terminal_id TEXT,
  auth_type VARCHAR(20) DEFAULT 'bearer', -- 'bearer', 'basic', 'api_key'
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  test_status VARCHAR(20), -- 'success', 'failed', 'pending'
  test_error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pos80_config_tenant_id ON public.pos80_config(tenant_id);

-- Enable RLS
ALTER TABLE public.pos80_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "pos80_config_select_policy" ON public.pos80_config
  FOR SELECT USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "pos80_config_insert_policy" ON public.pos80_config
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.role IN ('owner', 'gerant')
    )
  );

CREATE POLICY "pos80_config_update_policy" ON public.pos80_config
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.role IN ('owner', 'gerant')
    )
  );

CREATE POLICY "pos80_config_delete_policy" ON public.pos80_config
  FOR DELETE USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.role IN ('owner', 'gerant')
    )
  );
