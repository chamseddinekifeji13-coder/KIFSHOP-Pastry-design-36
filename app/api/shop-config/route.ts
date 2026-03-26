import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getActiveProfile } from '@/lib/active-profile'

// GET: Fetch current shop configuration
export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`[v0-${requestId}] ===== SHOP_CONFIG GET START =====`)
  
  try {
    let tenantId: string | null = null
    
    // First try to get from active profile (if user is fully authenticated)
    try {
      console.log(`[v0-${requestId}] Attempting getActiveProfile()...`)
      const profile = await getActiveProfile()
      console.log(`[v0-${requestId}] getActiveProfile() result:`, profile ? `{ tenantId: ${profile.tenantId} }` : 'null')
      if (profile) {
        tenantId = profile.tenantId
      }
    } catch (e) {
      console.warn(`[v0-${requestId}] getActiveProfile() threw:`, e instanceof Error ? e.message : String(e))
    }
    
    // Fallback: try to get from X-Tenant-Id header (sent by client-side component)
    if (!tenantId) {
      const headerTenantId = request.headers.get('X-Tenant-Id')
      console.log(`[v0-${requestId}] Header X-Tenant-Id:`, headerTenantId || 'NOT SET')
      tenantId = headerTenantId
    }
    
    if (!tenantId) {
      console.log(`[v0-${requestId}] ERROR: No tenantId found - returning 401`)
      return NextResponse.json(
        { error: 'Unauthorized: No tenant information' },
        { status: 401 }
      )
    }

    console.log(`[v0-${requestId}] Using tenantId:`, tenantId)

    let supabase
    try {
      console.log(`[v0-${requestId}] Calling createAdminClient()...`)
      supabase = createAdminClient()
      console.log(`[v0-${requestId}] createAdminClient() succeeded`)
    } catch (err) {
      console.error(`[v0-${requestId}] createAdminClient() THREW:`, {
        name: err instanceof Error ? err.name : 'unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      })
      return NextResponse.json(
        { error: 'Server configuration error: Supabase credentials missing', details: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      )
    }

    console.log(`[v0-${requestId}] Querying tenants table for id:`, tenantId)
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, primary_color, address, phone, email, fiscal_id, logo_url')
      .eq('id', tenantId)
      .single()

    console.log(`[v0-${requestId}] Query result:`, { hasData: !!tenant, hasError: !!error, errorCode: error?.code, errorMessage: error?.message })

    if (error) {
      console.error(`[v0-${requestId}] Supabase error:`, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      
      // PGRST116 = "not found", which is okay - just return 404
      if (error.code === 'PGRST116') {
        console.log(`[v0-${requestId}] Tenant not found (PGRST116) - returning 404`)
        return NextResponse.json(
          { 
            error: 'Tenant non trouvé',
            details: `No tenant found for id: ${tenantId}`
          },
          { status: 404 }
        )
      }
      
      console.log(`[v0-${requestId}] Returning 500 for Supabase error`)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la recuperation de la configuration',
          details: error.message
        },
        { status: 500 }
      )
    }

    if (!tenant) {
      console.log(`[v0-${requestId}] No error but tenant is null - returning 404`)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la recuperation de la configuration',
          details: 'Tenant non trouve'
        },
        { status: 404 }
      )
    }

    console.log(`[v0-${requestId}] SUCCESS - returning tenant config`)
    return NextResponse.json({
      success: true,
      config: {
        name: tenant.name,
        primaryColor: tenant.primary_color,
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        taxId: tenant.fiscal_id || '',
        logoUrl: tenant.logo_url || '',
      }
    })
  } catch (error) {
    console.error(`[v0-${requestId}] UNHANDLED EXCEPTION:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    console.log(`[v0-${requestId}] ===== SHOP_CONFIG GET END (ERROR) =====`)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch config' },
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
    } catch (e) {
      console.warn('[v0] getActiveProfile error in PUT:', e)
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
        { error: 'Le nom de la boutique est obligatoire' },
        { status: 400 }
      )
    }

    if (!primaryColor || !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      return NextResponse.json(
        { error: 'Couleur principale invalide' },
        { status: 400 }
      )
    }

    // Validate email format if provided
    if (email && email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Format email invalide' },
          { status: 400 }
        )
      }
    }

    console.log('[v0] Shop Config PUT - updating tenantId:', profile.tenantId)

    let supabase
    try {
      supabase = createAdminClient()
    } catch (err) {
      console.error('[v0] Failed to create admin client in PUT:', err instanceof Error ? err.message : String(err))
      return NextResponse.json(
        { error: 'Server configuration error: Supabase credentials missing' },
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
      .select('id, name, primary_color, address, phone, email, fiscal_id, logo_url')
      .single()

    if (error) {
      console.error('[v0] Shop Config PUT Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { 
          error: 'Erreur lors de la mise a jour de la configuration',
          details: error.hint || error.message
        },
        { status: 500 }
      )
    }

    if (!tenant) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise a jour de la configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration mise a jour avec succes',
      config: {
        name: tenant.name,
        primaryColor: tenant.primary_color,
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        taxId: tenant.fiscal_id || '',
        logoUrl: tenant.logo_url || '',
      }
    })
  } catch (error) {
    console.error('[v0] Shop Config PUT exception:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save config' },
      { status: 500 }
    )
  }
}
