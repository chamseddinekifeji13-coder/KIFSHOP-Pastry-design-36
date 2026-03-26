import { put } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'
import { getActiveProfile } from '@/lib/active-profile'

export async function POST(request: NextRequest) {
  try {
    // ✅ Verify authentication - use getActiveProfile which returns null on error
    const profile = await getActiveProfile()
    if (!profile || !profile.tenantId) {
      console.error('[v0] No active profile found')
      return NextResponse.json({ error: 'Non authentifie. Veuillez vous reconnecter.' }, { status: 401 })
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      console.error('[v0] No file provided')
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // ✅ Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!allowedTypes.includes(file.type)) {
      console.error('[v0] Invalid file type:', file.type)
      return NextResponse.json({ error: 'Type de fichier non supporte. Utilisez JPG, PNG ou WebP.' }, { status: 400 })
    }

    // ✅ Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      console.error('[v0] File too large:', file.size, 'max:', maxSize)
      return NextResponse.json({ error: 'Le fichier ne doit pas depasser 5 Mo' }, { status: 400 })
    }

    console.log('[v0] Uploading file:', file.name, 'size:', file.size, 'type:', file.type, 'tenantId:', profile.tenantId)

    // ✅ Upload to Vercel Blob with tenant isolation
    const blob = await put(
      `${profile.tenantId}/product-images/${Date.now()}-${file.name}`,
      file,
      { access: 'private' }
    )

    console.log('[v0] File uploaded successfully:', blob.url)

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('[v0] Upload error:', error instanceof Error ? error.message : String(error))
    const message = error instanceof Error ? error.message : 'Erreur lors du telechargement'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
