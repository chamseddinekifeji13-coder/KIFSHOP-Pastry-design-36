import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getActiveProfile } from '@/lib/active-profile'

// GET: Fetch current shop configuration
export async function GET(request: NextRequest) {
  try {
    let tenantId: string | null = null
    
    // First try to get from active profile (if user is fully authenticated)
    try {
      const profile = await getActiveProfile()
      if (profile) {
        tenantId = profile.tenantId
      }
    } catch (e) {
      console.error('[v0] getActiveProfile error:', e instanceof Error ? e.message : String(e))
    }
    
    // Fallback: try to get from X-Tenant-Id header (sent by client-side component)
    if (!tenantId) {
      tenantId = request.headers.get('X-Tenant-Id')
    }
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: No tenant information' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()

    // Query just the tenants table with minimal fields
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    if (error) {
      console.error('[v0] Shop Config GET error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        tenantId
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
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

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
    console.error('[v0] Shop Config GET exception:', error)
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
    const profile = await getActiveProfile()
    
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

    const supabase = createAdminClient()

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
