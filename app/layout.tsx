import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { OfflineIndicator } from '@/components/pwa/offline-indicator'
import { AuthHashHandler } from '@/components/auth/auth-hash-handler'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: 'KIFSHOP Pastry - Logiciel de Gestion Patisserie en Tunisie',
    template: '%s | KIFSHOP Pastry',
  },
  description: 'KIFSHOP Pastry est le logiciel de gestion complet pour patisseries, boulangeries et laboratoires en Tunisie. Gerez vos stocks, commandes, production, facturation et tresorerie en temps reel. Interface en Francais et Arabe. Essai gratuit.',
  keywords: [
    'logiciel gestion patisserie',
    'gestion patisserie tunisie',
    'logiciel boulangerie',
    'gestion stock patisserie',
    'caisse patisserie',
    'logiciel laboratoire patisserie',
    'gestion commande patisserie',
    'facturation patisserie',
    'kifshop',
    'application patisserie tunisie',
    'gestion production patisserie',
    'suivi tresorerie boulangerie',
    'logiciel gestion boulangerie tunisie',
  ],
  generator: 'v0.app',
  metadataBase: new URL('https://kifshop.tn'),
  manifest: '/manifest.json',
  openGraph: {
    title: 'KIFSHOP Pastry - Logiciel de Gestion Patisserie N1 en Tunisie',
    description: 'Gerez votre patisserie en toute simplicite : stocks, commandes, production, facturation. Solution SaaS 100% tunisienne. Francais & Arabe. Essai gratuit.',
    url: 'https://kifshop.tn',
    siteName: 'KIFSHOP Pastry',
    locale: 'fr_TN',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'KIFSHOP - Logiciel de gestion pour patisseries en Tunisie',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KIFSHOP Pastry - Gestion Patisserie en Tunisie',
    description: 'Stocks, commandes, production, facturation - tout en un pour votre patisserie. Francais & Arabe. Essai gratuit.',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://kifshop.tn',
    languages: {
      'fr-TN': 'https://kifshop.tn',
      'fr': 'https://kifshop.tn',
      'ar-TN': 'https://kifshop.tn/ar',
      'ar': 'https://kifshop.tn/ar',
    },
  },
  category: 'business',
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
      { url: '/icons/icon-192x192.jpg', sizes: '192x192', type: 'image/jpeg' },
      { url: '/icons/icon-512x512.jpg', sizes: '512x512', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/icons/icon-192x192.jpg', sizes: '192x192', type: 'image/jpeg' },
    ],
  },
  other: {
    'google-site-verification': 'A_REMPLACER_PAR_VOTRE_CODE_GOOGLE',
    'msvalidate.01': 'A_REMPLACER_PAR_VOTRE_CODE_BING',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: '#c6a55f',
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "KIFSHOP Pastry",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, Android, iOS",
              description:
                "Logiciel de gestion complet pour patisseries, boulangeries et laboratoires en Tunisie. Stocks, commandes, production, facturation et tresorerie.",
              url: "https://kifshop.tn",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "TND",
                description: "Essai gratuit",
              },
              author: {
                "@type": "Organization",
                name: "KIFSHOP Pastry",
                url: "https://kifshop.tn",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.8",
                ratingCount: "50",
              },
              featureList: [
                "Gestion des stocks matieres premieres",
                "Planification de production",
                "Gestion des commandes clients",
                "Facturation et devis",
                "Suivi de tresorerie",
                "Gestion des fournisseurs et approvisionnement",
                "Inventaire physique",
                "Multi-utilisateurs avec roles",
                "Application mobile PWA",
              ],
              inLanguage: ["fr", "ar"],
              countryOfOrigin: {
                "@type": "Country",
                name: "Tunisia",
              },
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <OfflineIndicator />
        <AuthHashHandler />
        {children}
        <InstallPrompt />
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  )
}
