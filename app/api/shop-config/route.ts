import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSession, withSessionAndBody, badRequestResponse, serverErrorResponse } from '@/lib/api-helpers'

// GET: Fetch current shop configuration
export async function GET() {
  const [session, authError] = await withSession()
  if (authError) return authError

  try {
    const supabase = await createClient()

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, primary_color, address, phone, email, tax_id')
      .eq('id', session.tenantId)
      .single()

    if (error) {
      console.error('[Shop Config] Fetch error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Erreur lors de la recuperation de la configuration' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      config: {
        name: tenant.name,
        primaryColor: tenant.primary_color,
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        taxId: tenant.tax_id || '',
      }
    })
  } catch (error) {
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
}

// PUT: Update shop configuration
export async function PUT(request: Request) {
  const [data, error] = await withSessionAndBody<ShopConfigBody>(request)
  if (error) return error

  const { session, body } = data
  const { name, primaryColor, address, phone, email, taxId } = body

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

  try {
    const supabase = await createClient()

    // Update tenant configuration
    const { data: tenant, error: updateError } = await supabase
      .from('tenants')
      .update({
        name: name.trim(),
        primary_color: primaryColor,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        tax_id: taxId?.trim() || null,
      })
      .eq('id', session.tenantId)
      .select('id, name, primary_color, address, phone, email, tax_id')
      .single()

    if (updateError) {
      console.error('[Shop Config] Update error:', updateError)
      
      // Check for RLS policy error
      if (updateError.code === 'PGRST301' || updateError.message?.includes('policy')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Permission refusee. Seul le proprietaire peut modifier la configuration.' 
        }, { status: 403 })
      }

      return NextResponse.json({ 
        success: false, 
        error: 'Erreur lors de la sauvegarde de la configuration' 
      }, { status: 500 })
    }

    console.log('[Shop Config] Configuration updated successfully for tenant:', session.tenantId)

    return NextResponse.json({
      success: true,
      message: 'Configuration mise a jour avec succes',
      config: {
        name: tenant.name,
        primaryColor: tenant.primary_color,
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        taxId: tenant.tax_id || '',
      }
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
