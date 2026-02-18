import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import { AuthHashHandler } from '@/components/auth/auth-hash-handler'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'KIFSHOP - Gestion Pâtisserie',
  description: 'Application SaaS multi-tenant pour la gestion des pâtisseries et laboratoires en Tunisie',
  generator: 'v0.app',
  metadataBase: new URL('https://kifshop.tn'),
  manifest: '/manifest.json',
  openGraph: {
    title: 'KIFSHOP - Gestion Pâtisserie',
    description: 'Application SaaS multi-tenant pour la gestion des pâtisseries et laboratoires en Tunisie',
    url: 'https://kifshop.tn',
    siteName: 'KIFSHOP',
    locale: 'fr_TN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KIFSHOP - Gestion Pâtisserie',
    description: 'Gestion complète pour pâtisseries et laboratoires en Tunisie',
  },
  alternates: {
    canonical: 'https://kifshop.tn',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KIFSHOP',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#4A7C59',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AuthHashHandler />
        {children}
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  )
}
