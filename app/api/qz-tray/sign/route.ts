import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * QZ Tray Message Signing API
 * 
 * Cette API signe les messages pour QZ Tray afin d'eliminer les popups
 * "Site non approuve" et permettre l'impression silencieuse.
 * 
 * IMPORTANT: En production, utilisez un vrai certificat QZ Tray
 * achete sur qz.io pour une securite complete.
 */

// Demo private key for development - DO NOT USE IN PRODUCTION
// Generate your own via: QZ Tray > Advanced > Site Manager > Create New
const DEMO_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC5Xm5qxTDJJ6pv
RJccRLB/TZp7c6l3KDJ0Cj6CRWbvLCYCzl0Q8NFmqhxqKFXRl7hMJHM8y6W6LlJk
sX2c4F0WzDUqkF1h7qcwNVl7Q8ePZLYTdW5fKmq3vD+KmZPBJL7vKPhHU5gTuHj1
ycqZ6bI3Xvp5MfNJ5Y9z5gKWEuX2kAGvw7gLN9qn8mEbU4tPV0E5c5pD0nJwEBhL
Z5QX7cE9K6O5Y5H8qF1X7H8z5nEp5EL5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5
T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5
T5L5T5L5AgMBAAECggEABJQgJRzU8hQOdwNJqOLWLJQ8ZCfA5Y6e0m1T0aELzJvT
qF5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y
5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y
5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y
5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y
5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5YQKBgQDm
5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y
5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5YQKBgQDPHB5Y
5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y
5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5YQKBgC5Y5Y5Y5Y
5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y
-----END PRIVATE KEY-----`

export async function POST(request: Request) {
  try {
    const { toSign } = await request.json()
    
    if (!toSign) {
      return NextResponse.json({ error: 'Missing toSign parameter' }, { status: 400 })
    }

    // Check for custom private key in environment
    const privateKeyPem = process.env.QZ_PRIVATE_KEY || DEMO_PRIVATE_KEY
    
    // For demo mode, return empty signature (QZ Tray accepts this for localhost)
    // In production, you would sign with a real certificate
    if (!process.env.QZ_PRIVATE_KEY) {
      console.debug('[QZ Sign] Demo mode - returning empty signature')
      return NextResponse.json({ signature: '' })
    }

    // Sign the message with SHA512
    const sign = crypto.createSign('RSA-SHA512')
    sign.update(toSign)
    sign.end()
    
    const signature = sign.sign(privateKeyPem, 'base64')
    
    return NextResponse.json({ signature })
  } catch (error: any) {
    console.error('[QZ Sign] Error:', error.message)
    // Return empty signature on error - QZ Tray will show permission dialog
    return NextResponse.json({ signature: '' })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'QZ Tray signing endpoint',
    hasPrivateKey: !!process.env.QZ_PRIVATE_KEY,
    mode: process.env.QZ_PRIVATE_KEY ? 'production' : 'demo'
  })
}
