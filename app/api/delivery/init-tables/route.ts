import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/delivery/init-tables
 * Initialize delivery tables in Supabase
 * This endpoint creates all necessary delivery-related tables if they don't exist
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant ID from user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 400 }
      );
    }

    const tenantId = profile.tenant_id;

    // SQL to create delivery tables
    const sql = `
      -- ============================================================================
      -- DELIVERY EXPORT TABLES FOR API INTEGRATION
      -- ============================================================================

      -- 1. delivery_provider_credentials table
      CREATE TABLE IF NOT EXISTS public.delivery_provider_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        provider_code TEXT NOT NULL,
        provider_name TEXT NOT NULL,
        api_key TEXT,
        api_secret TEXT,
        account_number TEXT,
        account_pin TEXT,
        username TEXT,
        password TEXT,
        base_url TEXT,
        webhook_url TEXT,
        extra_config JSONB,
        is_enabled BOOLEAN DEFAULT false,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE(tenant_id, provider_code)
      );

      CREATE INDEX IF NOT EXISTS idx_delivery_provider_credentials_tenant_id 
        ON public.delivery_provider_credentials(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_provider_credentials_provider_code 
        ON public.delivery_provider_credentials(provider_code);

      -- 2. delivery_shipments table
      CREATE TABLE IF NOT EXISTS public.delivery_shipments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        order_id UUID,
        order_number TEXT NOT NULL,
        provider_code TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_address TEXT NOT NULL,
        customer_city TEXT NOT NULL,
        customer_governorate TEXT NOT NULL,
        customer_postal_code TEXT,
        delivery_type TEXT DEFAULT 'standard',
        tracking_number TEXT,
        provider_shipment_id TEXT,
        awb_number TEXT,
        cod_amount DECIMAL DEFAULT 0,
        shipping_cost DECIMAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        status_history JSONB DEFAULT '[]',
        notes TEXT,
        response_data JSONB,
        error_message TEXT,
        exported_at TIMESTAMP WITH TIME ZONE,
        last_sync_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_delivery_shipments_tenant_id 
        ON public.delivery_shipments(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_shipments_order_id 
        ON public.delivery_shipments(order_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_shipments_tracking_number 
        ON public.delivery_shipments(tracking_number);
      CREATE INDEX IF NOT EXISTS idx_delivery_shipments_provider_code 
        ON public.delivery_shipments(provider_code);
      CREATE INDEX IF NOT EXISTS idx_delivery_shipments_status 
        ON public.delivery_shipments(status);
      CREATE INDEX IF NOT EXISTS idx_delivery_shipments_created_at 
        ON public.delivery_shipments(created_at);

      -- 3. delivery_shipment_items table
      CREATE TABLE IF NOT EXISTS public.delivery_shipment_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shipment_id UUID NOT NULL REFERENCES public.delivery_shipments(id) ON DELETE CASCADE,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        weight DECIMAL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_delivery_shipment_items_shipment_id 
        ON public.delivery_shipment_items(shipment_id);

      -- 4. delivery_export_logs table
      CREATE TABLE IF NOT EXISTS public.delivery_export_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        shipment_id UUID REFERENCES public.delivery_shipments(id) ON DELETE SET NULL,
        provider_code TEXT NOT NULL,
        operation TEXT NOT NULL,
        status TEXT NOT NULL,
        request_payload JSONB,
        response_payload JSONB,
        error_message TEXT,
        http_status INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_delivery_export_logs_tenant_id 
        ON public.delivery_export_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_export_logs_shipment_id 
        ON public.delivery_export_logs(shipment_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_export_logs_provider_code 
        ON public.delivery_export_logs(provider_code);
      CREATE INDEX IF NOT EXISTS idx_delivery_export_logs_created_at 
        ON public.delivery_export_logs(created_at);

      -- 5. delivery_webhooks table
      CREATE TABLE IF NOT EXISTS public.delivery_webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
        provider_code TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        events TEXT[] DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        secret_token TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_delivery_webhooks_tenant_id 
        ON public.delivery_webhooks(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_webhooks_provider_code 
        ON public.delivery_webhooks(provider_code);

      -- 6. delivery_rates table
      CREATE TABLE IF NOT EXISTS public.delivery_rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        provider_code TEXT NOT NULL,
        governorate TEXT NOT NULL,
        delivery_type TEXT DEFAULT 'standard',
        base_rate DECIMAL NOT NULL,
        per_kg_rate DECIMAL NOT NULL,
        cod_fee_percentage DECIMAL,
        min_weight DECIMAL DEFAULT 0,
        max_weight DECIMAL DEFAULT 100,
        currency TEXT DEFAULT 'TND',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_delivery_rates_tenant_id 
        ON public.delivery_rates(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_rates_provider_code 
        ON public.delivery_rates(provider_code);
      CREATE INDEX IF NOT EXISTS idx_delivery_rates_governorate 
        ON public.delivery_rates(governorate);

      -- ============================================================================
      -- ROW LEVEL SECURITY (RLS) POLICIES
      -- ============================================================================

      -- Enable RLS on all tables
      ALTER TABLE IF EXISTS public.delivery_provider_credentials ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.delivery_shipments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.delivery_shipment_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.delivery_export_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.delivery_webhooks ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.delivery_rates ENABLE ROW LEVEL SECURITY;

      -- Policies for delivery_provider_credentials
      DROP POLICY IF EXISTS "Users can view their tenant delivery credentials" ON public.delivery_provider_credentials;
      CREATE POLICY "Users can view their tenant delivery credentials"
        ON public.delivery_provider_credentials FOR SELECT
        USING (
          tenant_id IN (
            SELECT DISTINCT tenant_id FROM public.tenant_users 
            WHERE user_id = auth.uid()
          )
        );

      DROP POLICY IF EXISTS "Users can insert their tenant delivery credentials" ON public.delivery_provider_credentials;
      CREATE POLICY "Users can insert their tenant delivery credentials"
        ON public.delivery_provider_credentials FOR INSERT
        WITH CHECK (
          tenant_id IN (
            SELECT DISTINCT tenant_id FROM public.tenant_users 
            WHERE user_id = auth.uid()
          )
        );

      DROP POLICY IF EXISTS "Users can update their tenant delivery credentials" ON public.delivery_provider_credentials;
      CREATE POLICY "Users can update their tenant delivery credentials"
        ON public.delivery_provider_credentials FOR UPDATE
        USING (
          tenant_id IN (
            SELECT DISTINCT tenant_id FROM public.tenant_users 
            WHERE user_id = auth.uid()
          )
        );

      -- Policies for delivery_shipments
      DROP POLICY IF EXISTS "Users can view their tenant delivery shipments" ON public.delivery_shipments;
      CREATE POLICY "Users can view their tenant delivery shipments"
        ON public.delivery_shipments FOR SELECT
        USING (
          tenant_id IN (
            SELECT DISTINCT tenant_id FROM public.tenant_users 
            WHERE user_id = auth.uid()
          )
        );

      DROP POLICY IF EXISTS "Users can insert their tenant delivery shipments" ON public.delivery_shipments;
      CREATE POLICY "Users can insert their tenant delivery shipments"
        ON public.delivery_shipments FOR INSERT
        WITH CHECK (
          tenant_id IN (
            SELECT DISTINCT tenant_id FROM public.tenant_users 
            WHERE user_id = auth.uid()
          )
        );

      -- Policies for delivery_shipment_items
      DROP POLICY IF EXISTS "Users can view delivery shipment items" ON public.delivery_shipment_items;
      CREATE POLICY "Users can view delivery shipment items"
        ON public.delivery_shipment_items FOR SELECT
        USING (
          shipment_id IN (
            SELECT id FROM public.delivery_shipments
            WHERE tenant_id IN (
              SELECT DISTINCT tenant_id FROM public.tenant_users 
              WHERE user_id = auth.uid()
            )
          )
        );

      -- Policies for delivery_export_logs
      DROP POLICY IF EXISTS "Users can view their tenant delivery logs" ON public.delivery_export_logs;
      CREATE POLICY "Users can view their tenant delivery logs"
        ON public.delivery_export_logs FOR SELECT
        USING (
          tenant_id IN (
            SELECT DISTINCT tenant_id FROM public.tenant_users 
            WHERE user_id = auth.uid()
          )
        );

      -- Policies for delivery_webhooks
      DROP POLICY IF EXISTS "Users can view their tenant delivery webhooks" ON public.delivery_webhooks;
      CREATE POLICY "Users can view their tenant delivery webhooks"
        ON public.delivery_webhooks FOR SELECT
        USING (
          tenant_id IN (
            SELECT DISTINCT tenant_id FROM public.tenant_users 
            WHERE user_id = auth.uid()
          )
        );

      -- Policies for delivery_rates
      DROP POLICY IF EXISTS "Users can view their tenant delivery rates" ON public.delivery_rates;
      CREATE POLICY "Users can view their tenant delivery rates"
        ON public.delivery_rates FOR SELECT
        USING (
          tenant_id IN (
            SELECT DISTINCT tenant_id FROM public.tenant_users 
            WHERE user_id = auth.uid()
          )
        );
    `;

    // Execute the SQL
    const { error: execError } = await supabase.rpc('exec', { sql });

    if (execError) {
      console.error('[API] Error executing init SQL:', execError);
      // Try alternative approach using direct client
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize tables. Tables might already exist or you need to use the Supabase dashboard to run the SQL.',
        details: execError.message,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery tables initialized successfully',
      tables: [
        'delivery_provider_credentials',
        'delivery_shipments',
        'delivery_shipment_items',
        'delivery_export_logs',
        'delivery_webhooks',
        'delivery_rates',
      ],
    }, { status: 200 });
  } catch (error) {
    console.error('[API] Init tables error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'If using Supabase, please run the SQL scripts from the Supabase dashboard directly.'
      },
      { status: 500 }
    );
  }
}
