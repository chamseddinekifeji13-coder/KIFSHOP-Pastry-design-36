import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDeliveryService } from '@/lib/delivery/service';
import { CreateOrderRequest } from '@/lib/delivery/types';

export const runtime = 'nodejs';

/**
 * POST /api/delivery/send-order
 * Send an order to a delivery provider
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

    // Parse request body
    const body = await request.json();
    const orderRequest: CreateOrderRequest = body;

    // Validate required fields
    if (!orderRequest.order_id || !orderRequest.customer_name || !orderRequest.customer_address) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create delivery service
    const deliveryService = createDeliveryService(profile.tenant_id);

    // Send to delivery provider
    const result = await deliveryService.sendToDeliveryProvider(
      orderRequest,
      body.provider_code
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[API] Send order error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
