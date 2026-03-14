import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ChefHat } from "lucide-react"

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
    <div className="min-h-svh flex flex-col lg:flex-row">
      {/* Left side - Image with overlay */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image
          src="https://images.unsplash.com/photo-1517433670267-08bbd4be890f?q=80&w=1920&auto=format&fit=crop"
          alt="Patisserie artisanale"
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/95 via-secondary/80 to-secondary/95" />
        
        {/* Content over image */}
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-3 group w-fit">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-secondary shadow-lg shadow-primary/30 transition-transform group-hover:scale-105">
              <ChefHat className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-white tracking-tight">
                KIFSHOP <span className="font-light text-primary">Pastry</span>
              </span>
              <span className="text-xs text-white/50">Gestion Patisserie Pro</span>
            </div>
          </Link>
          
          {/* Main text */}
          <div className="max-w-md">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
              Gerez votre patisserie en toute simplicite
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              Une solution complete pour les artisans patissiers tunisiens. Stocks, production, commandes et tresorerie reunis.
            </p>
            
            {/* Stats */}
            <div className="flex items-center gap-8 mt-10">
              <div>
                <div className="text-3xl font-bold text-primary">150+</div>
                <div className="text-sm text-white/50">Patisseries</div>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <div className="text-3xl font-bold text-white">100%</div>
                <div className="text-sm text-white/50">Tunisien</div>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <div className="text-3xl font-bold text-white">24/7</div>
                <div className="text-sm text-white/50">Support</div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="text-sm text-white/40">
            2024 KIFSHOP. Tous droits reserves.
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-secondary shadow-lg shadow-primary/30">
                <ChefHat className="h-7 w-7" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-foreground mt-4">
              KIFSHOP <span className="font-light text-primary">Pastry</span>
            </h1>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  )
}
