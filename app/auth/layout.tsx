import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Connexion - KIFSHOP Logiciel Gestion Patisserie Tunisie",
  description:
    "Connectez-vous a KIFSHOP pour gerer votre patisserie : stocks matieres premieres, commandes clients, planification production, facturation et tresorerie. Solution SaaS 100% tunisienne.",
  openGraph: {
    title: "Connexion - KIFSHOP Gestion Patisserie",
    description:
      "Accedez a votre espace de gestion KIFSHOP. Stocks, commandes, production et facturation pour votre patisserie.",
    images: ["/og-image.jpg"],
  },
  robots: { index: true, follow: true },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      {children}
    </div>
  )
}
