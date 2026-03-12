import { put } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/active-profile'

export async function POST(request: NextRequest) {
  try {
    // ✅ Verify authentication
    const session = await getServerSession()
    
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // ✅ Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non supporte. Utilisez JPG, PNG ou WebP.' }, { status: 400 })
    }

    // ✅ Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Le fichier ne doit pas depasser 5 Mo' }, { status: 400 })
    }

    // ✅ Upload to Vercel Blob with tenant isolation
    const blob = await put(
      `${session.tenantId}/product-images/${Date.now()}-${file.name}`,
      file,
      { access: 'private' }  // Changed from 'public' to 'private' for security
    )

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
