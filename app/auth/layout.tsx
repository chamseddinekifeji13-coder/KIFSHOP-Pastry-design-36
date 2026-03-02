import type { Metadata } from "next"
import Link from "next/link"
import { ChefHat, BarChart3, ShoppingCart, Package } from "lucide-react"

export const metadata: Metadata = {
  title: "Connexion - KIFSHOP Pastry Logiciel Gestion Patisserie Tunisie",
  description:
    "Connectez-vous a KIFSHOP Pastry pour gerer votre patisserie : stocks matieres premieres, commandes clients, planification production, facturation et tresorerie. Solution SaaS 100% tunisienne.",
  openGraph: {
    title: "Connexion - KIFSHOP Pastry Gestion Patisserie",
    description:
      "Accedez a votre espace de gestion KIFSHOP Pastry. Stocks, commandes, production et facturation pour votre patisserie.",
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
    <div className="flex min-h-svh">
      {/* Left panel - Branded illustration (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#1a2e23] flex-col items-center justify-center p-12">
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Gradient orbs */}
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#4A7C59]/20 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-[#7dba94]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4A7C59] text-white">
              <ChefHat className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold text-white">
              KIFSHOP <span className="font-normal text-[#7dba94]">Pastry</span>
            </span>
          </Link>

          {/* Tagline */}
          <h2 className="text-3xl font-bold text-white text-balance leading-tight mb-4">
            Gerez votre patisserie en toute simplicite
          </h2>
          <p className="text-white/60 leading-relaxed mb-10 text-pretty">
            Stocks, production, commandes, facturation et tresorerie — tout en un pour votre activite.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-4 w-full">
            {[
              { icon: Package, label: "Gestion stocks" },
              { icon: ChefHat, label: "Production" },
              { icon: ShoppingCart, label: "Commandes" },
              { icon: BarChart3, label: "Tableau de bord" },
            ].map((feat) => (
              <div
                key={feat.label}
                className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3"
              >
                <feat.icon className="h-4 w-4 text-[#7dba94] shrink-0" />
                <span className="text-sm text-white/80">{feat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Form area */}
      <div className="flex flex-1 items-center justify-center bg-background p-4 lg:p-8">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
