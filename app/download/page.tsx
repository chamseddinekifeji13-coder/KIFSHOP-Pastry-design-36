import type { Metadata } from "next"
import { Navbar } from "@/components/landing/navbar"
import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { DownloadSection } from "@/components/landing/download-section"
import { FooterSection } from "@/components/landing/footer-section"

export const metadata: Metadata = {
  title: "Telecharger KIFSHOP - Installation On-Premise pour Patisserie",
  description:
    "Telechargez KIFSHOP et installez-le sur votre propre serveur. Disponible pour Windows, Linux et Docker. Guide d'installation complet. Logiciel de gestion patisserie 100% tunisien.",
  keywords: [
    "telecharger kifshop",
    "logiciel patisserie on-premise",
    "installer kifshop",
    "kifshop docker",
    "kifshop windows",
    "kifshop linux",
    "logiciel gestion patisserie local",
  ],
  openGraph: {
    title: "Telecharger KIFSHOP - Gestion Patisserie On-Premise",
    description:
      "Installez KIFSHOP sur votre serveur. Compatible Windows, Linux et Docker. Controle total de vos donnees.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://kifshop.tn/download",
  },
}

export default function DownloadPage() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <DownloadSection />
      <FooterSection />
    </main>
  )
}
