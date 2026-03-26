import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { withSession, withSessionAndBody, badRequestResponse, serverErrorResponse } from '@/lib/api-helpers'

// GET: Fetch current shop configuration
export async function GET() {
  const [session, authError] = await withSession()
  if (authError) return authError

  try {
    console.log('[v0] Shop Config GET - Session:', {
      tenantId: session.tenantId,
      authUserId: session.authUserId
    })

    const supabase = createAdminClient()

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, primary_color, address, phone, email, fiscal_id, logo_url')
      .eq('id', session.tenantId)
      .single()

    if (error) {
      console.error('[v0] Shop Config GET error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        status: error.status
      })
      return NextResponse.json({ 
        success: false, 
        error: 'Erreur lors de la recuperation de la configuration',
        details: error.message
      }, { status: 500 })
    }

    if (!tenant) {
      console.error('[v0] Shop Config GET - No tenant found for id:', session.tenantId)
      return NextResponse.json({ 
        success: false, 
        error: 'Erreur lors de la recuperation de la configuration',
        details: 'Tenant non trouvé'
      }, { status: 404 })
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
    return serverErrorResponse(error)
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
export async function PUT(request: Request) {
  const [data, error] = await withSessionAndBody<ShopConfigBody>(request)
  if (error) return error

  const { session, body } = data
  const { name, primaryColor, address, phone, email, taxId, logoUrl } = body

  // Validate required fields
  if (!name || name.trim().length === 0) {
    return badRequestResponse('Le nom de la boutique est obligatoire')
  }

  if (!primaryColor || !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
    return badRequestResponse('Couleur principale invalide')
  }

  // Validate email format if provided
  if (email && email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return badRequestResponse('Format email invalide')
    }
  }

  console.log('[v0] Shop Config Update - Session:', {
    tenantId: session.tenantId,
    authUserId: session.authUserId,
    role: session.activeRole
  })

  try {
    // Verify admin client configuration
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('[v0] Supabase Config Check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceRoleKey,
      url: supabaseUrl?.substring(0, 30) + '...'
    })

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(`Supabase config missing: URL=${!!supabaseUrl}, ServiceKey=${!!serviceRoleKey}`)
    }

    const supabase = createAdminClient()

    // Update tenant configuration
    const { data: tenant, error: updateError } = await supabase
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
      .eq('id', session.tenantId)
      .select('id, name, primary_color, address, phone, email, fiscal_id, logo_url')
      .single()

    if (updateError) {
      console.error('[v0] Shop Config Update error details:', {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
        status: updateError.status,
        fullError: JSON.stringify(updateError, null, 2)
      })
      
      // Return more informative error
      const errorMsg = updateError.hint || updateError.message || 'Erreur lors de la mise a jour'
      return NextResponse.json({ 
        success: false, 
        error: 'Erreur lors de la mise a jour de la configuration',
        details: errorMsg,
        code: updateError.code
      }, { status: 500 })
    }

    if (!tenant) {
      console.error('[v0] Shop Config Update - No tenant returned from database')
      return NextResponse.json({ 
        success: false, 
        error: 'Erreur lors de la mise a jour de la configuration',
        details: 'Aucun enregistrement retourné du serveur'
      }, { status: 500 })
    }

    console.log('[v0] Shop Config Configuration updated successfully for tenant:', session.tenantId)

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
    return serverErrorResponse(error)
  }
}
