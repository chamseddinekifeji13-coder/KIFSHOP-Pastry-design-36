import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Cake, Sparkles } from "lucide-react"

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
    <div className="min-h-svh flex flex-col lg:flex-row bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Left side - Branding with light theme */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="absolute top-20 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-80 h-80 bg-orange-200/30 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-3 group w-fit">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
              <Cake className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground tracking-tight">
                KIFSHOP <span className="font-light text-primary">Pastry</span>
              </span>
              <span className="text-xs text-muted-foreground">Gestion Patisserie Pro</span>
            </div>
          </Link>
          
          {/* Center content with illustration */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Decorative pastry image */}
            <div className="relative w-80 h-80 mb-8">
              <Image
                src="https://images.unsplash.com/photo-1558326567-98ae2405596b?q=80&w=800&auto=format&fit=crop"
                alt="Patisserie"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover rounded-3xl shadow-2xl shadow-primary/10"
                priority
              />
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">+150 patisseries</div>
                  <div className="text-xs text-muted-foreground">nous font confiance</div>
                </div>
              </div>
            </div>
            
            {/* Main text */}
            <div className="text-center max-w-md">
              <h1 className="text-3xl xl:text-4xl font-bold text-foreground leading-tight mb-4">
                Simplifiez la gestion de votre patisserie
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Stocks, production, commandes et tresorerie reunis dans une interface intuitive et elegante.
              </p>
            </div>
            
            {/* Stats pills */}
            <div className="flex items-center gap-4 mt-8">
              <div className="bg-white rounded-full px-5 py-2.5 shadow-sm border border-border/50 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-foreground">100% Tunisien</span>
              </div>
              <div className="bg-white rounded-full px-5 py-2.5 shadow-sm border border-border/50 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm font-medium text-foreground">Support 24/7</span>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="text-sm text-muted-foreground">
            &copy; 2026 KIFSHOP Pastry. Tous droits reserves.
          </div>
        </div>
      </div>

      {/* Right side - Form with white card */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Cake className="h-7 w-7" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-foreground mt-4">
              KIFSHOP <span className="font-light text-primary">Pastry</span>
            </h1>
          </div>
          
          {/* Form card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-border/50 p-8 lg:p-10">
            {children}
          </div>
          
          {/* Additional info below card */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>En vous connectant, vous acceptez nos</p>
            <p>
              <Link href="/terms" className="text-primary hover:underline">Conditions d{"'"}utilisation</Link>
              {" "}et{" "}
              <Link href="/privacy" className="text-primary hover:underline">Politique de confidentialite</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
