-- Create pos80_sync_logs table for tracking synchronization history
CREATE TABLE IF NOT EXISTS pos80_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sync_type VARCHAR(20) NOT NULL, -- 'manual', 'cron', 'webhook'
  status VARCHAR(20) NOT NULL, -- 'running', 'success', 'failed', 'partial'
  transactions_count INT DEFAULT 0,
  transactions_created INT DEFAULT 0,
  transactions_updated INT DEFAULT 0,
  stock_updated INT DEFAULT 0,
  revenue_created DECIMAL(10, 2) DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_ms INT,
  triggered_by UUID REFERENCES auth.users(id),
  pos80_response_time_ms INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('running', 'success', 'failed', 'partial')),
  CONSTRAINT valid_sync_type CHECK (sync_type IN ('manual', 'cron', 'webhook'))
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pos80_sync_logs_tenant_id ON pos80_sync_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos80_sync_logs_created_at ON pos80_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos80_sync_logs_status ON pos80_sync_logs(status);

-- Create partitioned table for logs older than 30 days (optional optimization)
-- This can be enabled later if logs grow too large

-- Enable RLS
ALTER TABLE pos80_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "pos80_sync_logs_select_policy" ON pos80_sync_logs
  FOR SELECT USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE id = auth.uid() OR 
      id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "pos80_sync_logs_insert_policy" ON pos80_sync_logs
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE id = auth.uid() OR 
      id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "pos80_sync_logs_update_policy" ON pos80_sync_logs
  FOR UPDATE USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE id = auth.uid() OR 
      id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
    )
  );
