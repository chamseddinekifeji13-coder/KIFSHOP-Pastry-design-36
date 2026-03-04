import type { Metadata } from "next"
import { CampaignLanding } from "@/components/landing/campaign-landing"

export const metadata: Metadata = {
  title: "Essai Gratuit - KIFSHOP Pastry | Gestion Patisserie Tunisie",
  description:
    "Decouvrez KIFSHOP : le logiciel de gestion N1 pour patisseries en Tunisie. Stocks, commandes, recettes, tresorerie. Essai gratuit 14 jours, sans engagement.",
  openGraph: {
    title: "Gerez votre patisserie comme un pro - KIFSHOP Pastry",
    description:
      "Stocks, recettes, commandes, tresorerie : tout en un. 100% tunisien. Essai gratuit 14 jours.",
    url: "https://kifshop.tn/demo",
    siteName: "KIFSHOP Pastry",
    locale: "fr_TN",
    type: "website",
    images: [
      {
        url: "/images/og-campaign.jpg",
        width: 1200,
        height: 630,
        alt: "KIFSHOP - Logiciel de gestion pour patisseries en Tunisie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gerez votre patisserie comme un pro - KIFSHOP",
    description: "Essai gratuit 14 jours. Stocks, commandes, recettes, tresorerie.",
    images: ["/images/og-campaign.jpg"],
  },
}

export default function DemoPage() {
  return <CampaignLanding />
}
