-- POS80-002: Create POS80 Sync Logs Table
-- Status: IMPORTANT - Must execute sixth
-- Purpose: Create table to track all synchronization operations with POS80

DROP TABLE IF EXISTS public.pos80_sync_logs CASCADE;

CREATE TABLE public.pos80_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Sync Operation Details
    sync_type VARCHAR(50) NOT NULL, -- 'inventory', 'sales', 'customers', 'products'
    operation VARCHAR(50) NOT NULL, -- 'push', 'pull', 'bidirectional'
    sync_direction VARCHAR(50) DEFAULT 'bidirectional', -- 'to_kifshop', 'to_pos80'
    
    -- Record Information
    record_type VARCHAR(100), -- 'product', 'sale', 'customer', etc
    record_id_local UUID, -- Local database ID
    record_id_pos80 VARCHAR(100), -- POS80 system ID
    record_data JSONB, -- Full record data at time of sync
    
    -- Sync Status
    status VARCHAR(50) NOT NULL, -- 'pending', 'in_progress', 'success', 'failed', 'partial'
    error_message TEXT,
    error_details JSONB, -- Detailed error information
    
    -- Request/Response
    request_payload JSONB,
    response_payload JSONB,
    
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER, -- Time taken in milliseconds
    
    -- Retry Info
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'auto', -- 'auto', 'manual', 'webhook', 'api'
    triggered_by UUID, -- User who triggered manual sync
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create comprehensive indexes
CREATE INDEX idx_pos80_sync_logs_tenant_id ON public.pos80_sync_logs(tenant_id);
CREATE INDEX idx_pos80_sync_logs_status ON public.pos80_sync_logs(status);
CREATE INDEX idx_pos80_sync_logs_sync_type ON public.pos80_sync_logs(sync_type);
CREATE INDEX idx_pos80_sync_logs_created_at ON public.pos80_sync_logs(created_at);
CREATE INDEX idx_pos80_sync_logs_record_id_local ON public.pos80_sync_logs(record_id_local);
CREATE INDEX idx_pos80_sync_logs_record_id_pos80 ON public.pos80_sync_logs(record_id_pos80);
CREATE INDEX idx_pos80_sync_logs_error ON public.pos80_sync_logs(status, error_message);

-- Enable RLS
ALTER TABLE public.pos80_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view sync logs of their tenant" 
    ON public.pos80_sync_logs FOR SELECT 
    TO authenticated 
    USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "System can insert sync logs" 
    ON public.pos80_sync_logs FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "System can update sync logs" 
    ON public.pos80_sync_logs FOR UPDATE 
    TO authenticated 
    USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.pos80_sync_logs TO authenticated;

-- Create function to calculate sync duration
CREATE OR REPLACE FUNCTION calculate_pos80_sync_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER * 1000;
    END IF;
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pos80_sync_duration
    BEFORE UPDATE ON public.pos80_sync_logs
    FOR EACH ROW
    EXECUTE FUNCTION calculate_pos80_sync_duration();

-- Create function to auto-retry failed syncs
CREATE OR REPLACE FUNCTION schedule_pos80_retry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'failed' AND NEW.retry_count < NEW.max_retries THEN
        NEW.retry_count = NEW.retry_count + 1;
        NEW.next_retry_at = CURRENT_TIMESTAMP + (INTERVAL '1 minute' * NEW.retry_count);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pos80_retry
    BEFORE UPDATE ON public.pos80_sync_logs
    FOR EACH ROW
    EXECUTE FUNCTION schedule_pos80_retry();
