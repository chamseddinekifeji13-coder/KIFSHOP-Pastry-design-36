import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

    // Get all stock alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('raw_materials')
      .select('id, name, current_stock, min_stock, unit, tenant_id')
      .eq('tenant_id', tenantId)

    if (alertsError) {
      throw new Error(alertsError.message)
    }

    // Filter alerts by severity
    const critical = alerts?.filter(a => a.current_stock === 0) || []
    const warning = alerts?.filter(a => a.current_stock > 0 && a.current_stock < a.min_stock) || []

    const formattedAlerts = alerts
      ?.filter(a => a.current_stock < a.min_stock)
      .map(a => ({
        id: a.id,
        name: a.name,
        currentStock: a.current_stock,
        minStock: a.min_stock,
        unit: a.unit,
        severity: a.current_stock === 0 ? 'critical' : 'warning'
      })) || []

    return NextResponse.json(
      {
        alerts: formattedAlerts,
        stats: {
          critical: critical.length,
          warning: warning.length,
          total: formattedAlerts.length
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Stock Alerts API Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
