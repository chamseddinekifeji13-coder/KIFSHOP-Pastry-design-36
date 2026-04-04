import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDeliveryService } from '@/lib/delivery/service';

export const runtime = 'nodejs';

/**
 * POST /api/delivery/sync-status
 * Sync shipment status with delivery provider
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { tracking_number, provider_code } = body;

    if (!tracking_number) {
      return NextResponse.json(
        { error: 'Missing tracking_number' },
        { status: 400 }
      );
    }

    // Create delivery service
    const deliveryService = createDeliveryService(profile.tenant_id);

    // Sync status
    const result = await deliveryService.syncDeliveryStatus(
      tracking_number,
      provider_code
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to sync status' },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[API] Sync status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/delivery/sync-status
 * Get tracking info for a shipment
 */
export async function GET(request: NextRequest) {
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 400 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const tracking_number = searchParams.get('tracking_number');
    const provider_code = searchParams.get('provider_code');

    if (!tracking_number) {
      return NextResponse.json(
        { error: 'Missing tracking_number parameter' },
        { status: 400 }
      );
    }

    // Create delivery service
    const deliveryService = createDeliveryService(profile.tenant_id);

    // Track shipment
    const result = await deliveryService.trackShipment(
      tracking_number,
      provider_code as any
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to track shipment' },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[API] Track shipment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
