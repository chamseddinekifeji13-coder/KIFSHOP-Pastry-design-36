import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getActiveProfile } from '@/lib/active-profile'

// GET: Fetch current shop configuration
export async function GET() {
  try {
    const profile = await getActiveProfile()
    if (!profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, primary_color, address, phone, email, fiscal_id, logo_url')
      .eq('id', profile.tenantId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[v0] Shop Config GET error:', {
        code: error.code,
        message: error.message,
        details: error.details
      })
      return NextResponse.json(
        { 
          success: false,
          error: 'Erreur lors de la recuperation de la configuration',
          details: error.message
        },
        { status: 500 }
      )
    }

    if (!tenant) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Erreur lors de la recuperation de la configuration',
          details: 'Tenant non trouve'
        },
        { status: 404 }
      )
    }

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
    console.error('[v0] Shop Config GET exception:', error)
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
      .select('id, name, primary_color, address, phone, email, fiscal_id, logo_url')
      .single()

    if (error) {
      console.error('[v0] Shop Config PUT error:', {
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
    console.error('[v0] Shop Config PUT exception:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save config' },
      { status: 500 }
    )
  }
}
