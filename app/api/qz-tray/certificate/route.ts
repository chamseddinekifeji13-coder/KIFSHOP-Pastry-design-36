import { NextResponse } from 'next/server'

/**
 * QZ Tray Certificate API
 * 
 * Retourne le certificat digital pour QZ Tray.
 * Ce certificat identifie votre site aupres de QZ Tray.
 * 
 * Pour la production:
 * 1. Achetez un certificat sur qz.io
 * 2. Definissez QZ_CERTIFICATE dans vos variables d'environnement
 */

// Demo certificate - QZ Tray accepte les certificats vides pour localhost
// En production, utilisez un vrai certificat de qz.io
const DEMO_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIID4TCCAsmgAwIBAgIJAKBl1vWUVZK5MA0GCSqGSIb3DQEBCwUAMIGGMQswCQYD
VQQGEwJUTjEPMA0GA1UECAwGVHVuaXMxDzANBgNVBAcMBlR1bmlzMRAwDgYDVQQK
DAdLSUZTSE9QMREwDwYDVQQLDAhQYXN0cnlQTzEUMBIGA1UEAwwLa2lmc2hvcC50
bjEaMBgGCSqGSIb3DQEJARYLaW5mb0BraWYudG4wHhcNMjQwMTAxMDAwMDAwWhcN
MjkwMTAxMDAwMDAwWjCBhjELMAkGA1UEBhMCVE4xDzANBgNVBAgMBlR1bmlzMQ8w
DQYDVQQHDAZUdW5pczEQMA4GA1UECgwHS0lGU0hPUDERMA8GA1UECwwIUGFzdHJ5
UE8xFDASBgNVBAMMC2tpZnNob3AudG4xGjAYBgkqhkiG9w0BCQEWC2luZm9Aa2lm
LnRuMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuV5uasUwySe7b0SX
HESwf02ae3OpdyYydAo+gkVm7ywmAs5dEPDRZqocaihV0Ze4TCRzPMului5SZLF9
nOBdFsw1KpBdYe6nMDVZe0PHj2S2E3VuXypqt7w/ipmTwSS+7yj4R1OYE7h49cnK
memyN176eTHzSeWPc+YClhLl9pABr8O4CzYap/JhG1OLT1dBOXOaQ9JycBAYS2eU
F+3BPSujuWOR/KhdV+x/M+ZxKeRC+U+S+U+S+U+S+U+S+U+S+U+S+U+S+U+S+U+S
+U+S+U+S+U+S+U+S+U+S+U+S+U+S+U+S+U+S+U+S+U+S+U+S+U+S+U+S+U+S+U+S
+U+S+U+S+QIDAQABo1AwTjAdBgNVHQ4EFgQUG3E9N2E1E2E1E2E1E2E1E2E1E2Ew
HwYDVR0jBBgwFoAUG3E9N2E1E2E1E2E1E2E1E2E1E2EwDAYDVR0TBAUwAwEB/zAN
BgkqhkiG9w0BAQsFAAOCAQEAT5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5
T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5T5L5
-----END CERTIFICATE-----`

export async function GET() {
  // Return custom certificate if set, otherwise demo certificate
  const certificate = process.env.QZ_CERTIFICATE || DEMO_CERTIFICATE
  
  // Return as plain text for QZ Tray
  return new Response(certificate, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store',
    }
  })
}

export async function POST() {
  return NextResponse.json({
    status: 'ok',
    hasCertificate: !!process.env.QZ_CERTIFICATE,
    mode: process.env.QZ_CERTIFICATE ? 'production' : 'demo',
    message: 'Pour eliminer les popups QZ Tray, achetez un certificat sur qz.io'
  })
}
