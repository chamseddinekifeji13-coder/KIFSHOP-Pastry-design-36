import { NextResponse } from 'next/server'

// This version should be updated with each deployment
const APP_VERSION = 'v8-20260314-audit'
const BUILD_DATE = '2026-03-14'

export async function GET() {
  return NextResponse.json({
    version: APP_VERSION,
    buildDate: BUILD_DATE,
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
