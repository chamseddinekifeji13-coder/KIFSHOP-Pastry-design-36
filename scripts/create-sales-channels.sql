CREATE TABLE IF NOT EXISTS sales_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  contact TEXT DEFAULT '',
  auto_reply TEXT DEFAULT '',
  notify_on_order BOOLEAN DEFAULT true,
  notify_on_message BOOLEAN DEFAULT true,
  open_hour TEXT DEFAULT '08:00',
  close_hour TEXT DEFAULT '18:00',
  quick_replies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, channel_type)
);

ALTER TABLE sales_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view own channels"
  ON sales_channels FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can manage own channels"
  ON sales_channels FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
