import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tenantId = user.user_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID not found' },
        { status: 400 }
      )
    }

    // Get pending stock alerts for the tenant
    const { data: alerts, error: alertsError } = await supabase
      .from('stock_alerts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')

    if (alertsError) {
      throw new Error(alertsError.message)
    }

    if (!alerts || alerts.length === 0) {
      return NextResponse.json(
        { message: 'Aucune alerte à convertir', count: 0 },
        { status: 200 }
      )
    }

    // Convert alerts to bon d'approvisionnement using the database function
    const { data: result, error: convertError } = await supabase
      .rpc('convert_alerts_to_appro', {
        p_alert_ids: alerts.map(a => a.id),
        p_user_id: user.id,
        p_priority: 'normal'
      })

    if (convertError) {
      throw new Error(convertError.message)
    }

    return NextResponse.json(
      { message: `${alerts.length} alertes converties en bon d'approvisionnement`, count: alerts.length, appro_id: result },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Workflow API Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
