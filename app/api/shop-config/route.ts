import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getActiveProfile } from '@/lib/active-profile'

// GET: Fetch current shop configuration
export async function GET(request: NextRequest) {
  console.log('[v0] Shop Config GET - Starting')
  try {
    let tenantId: string | null = null
    
    // First try to get from active profile (if user is fully authenticated)
    try {
      console.log('[v0] Attempting getActiveProfile()...')
      const profile = await getActiveProfile()
      console.log('[v0] getActiveProfile() result:', profile ? `{tenantId: ${profile.tenantId}}` : 'null')
      if (profile) {
        tenantId = profile.tenantId
      }
    } catch (e) {
      console.error('[v0] getActiveProfile error:', e instanceof Error ? e.message : String(e))
    }
    
    // Fallback: try to get from X-Tenant-Id header (sent by client-side component)
    if (!tenantId) {
      const headerTenantId = request.headers.get('X-Tenant-Id')
      console.log('[v0] Fallback to header X-Tenant-Id:', headerTenantId || 'NOT SET')
      tenantId = headerTenantId
    }
    
    if (!tenantId) {
      console.log('[v0] No tenantId found - returning 401')
      return NextResponse.json(
        { error: 'Unauthorized: No tenant information' },
        { status: 401 }
      )
    }

    console.log('[v0] Using tenantId:', tenantId)

    let supabase
    try {
      console.log('[v0] Creating admin client...')
      supabase = createAdminClient()
      console.log('[v0] Admin client created successfully')
    } catch (error) {
      console.error('[v0] createAdminClient failed:', error instanceof Error ? error.message : String(error))
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Query just the tenants table with minimal fields
    console.log('[v0] Querying tenants table...')
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    console.log('[v0] Query result:', { hasData: !!tenant, hasError: !!error, errorCode: error?.code })

    if (error) {
      console.error('[v0] Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
      })
      return NextResponse.json(
        { 
          error: 'Failed to fetch configuration',
          details: error.message
        },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      )
    }

    if (!tenant) {
      console.log('[v0] No tenant found')
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    console.log('[v0] Returning tenant config successfully')
    return NextResponse.json({
      success: true,
      config: {
        name: tenant.name || '',
        primaryColor: tenant.primary_color || '#000000',
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        taxId: tenant.fiscal_id || '',
        logoUrl: tenant.logo_url || '',
      }
    })
  } catch (error) {
    console.error('[v0] Shop Config GET unhandled exception:', error instanceof Error ? error.message : String(error), error instanceof Error ? error.stack : '')
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    )
  }
}

interface ShopConfigBody {
  name: string
  primaryColor: string
  address?: string
  phone?: string
  email?: string
  taxId?: string
  logoUrl?: string
}

// PUT: Update shop configuration
export async function PUT(request: NextRequest) {
  try {
    let profile = null
    try {
      profile = await getActiveProfile()
    } catch (error) {
      console.error('[v0] getActiveProfile failed in PUT:', error instanceof Error ? error.message : String(error))
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: ShopConfigBody = await request.json()
    const { name, primaryColor, address, phone, email, taxId, logoUrl } = body

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Shop name is required' },
        { status: 400 }
      )
    }

    if (!primaryColor || !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      return NextResponse.json(
        { error: 'Invalid primary color' },
        { status: 400 }
      )
    }

    // Validate email format if provided
    if (email && email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    let supabase
    try {
      supabase = createAdminClient()
    } catch (error) {
      console.error('[v0] createAdminClient failed in PUT:', error instanceof Error ? error.message : String(error))
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Update tenant configuration
    const { data: tenant, error } = await supabase
      .from('tenants')
      .update({
        name: name.trim(),
        primary_color: primaryColor,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        fiscal_id: taxId?.trim() || null,
        logo_url: logoUrl || null,
      })
      .eq('id', profile.tenantId)
      .select('*')
      .single()

    if (error) {
      console.error('[v0] Shop Config PUT error:', {
        code: error.code,
        message: error.message,
        details: error.details
      })
      return NextResponse.json(
        { 
          error: 'Failed to update configuration',
          details: error.message
        },
        { status: 500 }
      )
    }

    if (!tenant) {
      return NextResponse.json(
        { error: 'Failed to update configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: {
        name: tenant.name || '',
        primaryColor: tenant.primary_color || '#000000',
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        taxId: tenant.fiscal_id || '',
        logoUrl: tenant.logo_url || '',
      }
    })
  } catch (error) {
    console.error('[v0] Shop Config PUT exception:', error)
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    )
  }
}
