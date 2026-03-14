import type { Metadata } from "next"
import Link from "next/link"
import { ChefHat, BarChart3, ShoppingCart, Package, Sparkles, TrendingUp, Users } from "lucide-react"

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
      {/* Left panel - Premium branded section (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-secondary flex-col justify-between p-10">
        {/* Subtle geometric pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Premium gradient accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
        
        {/* Top: Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-secondary shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
              <ChefHat className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white tracking-tight">
                KIFSHOP <span className="font-normal text-primary">Pastry</span>
              </span>
              <span className="text-xs text-white/40">Gestion Patisserie Pro</span>
            </div>
          </Link>
        </div>

        {/* Center: Main content */}
        <div className="relative z-10 flex flex-col max-w-lg">
          <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            <span>Solution complete pour artisans</span>
          </div>
          
          <h1 className="text-4xl font-bold text-white leading-tight mb-4 text-balance">
            Simplifiez la gestion de votre patisserie
          </h1>
          
          <p className="text-white/50 text-lg leading-relaxed mb-10 text-pretty">
            Stocks, production, commandes et tresorerie reunis dans une interface intuitive.
          </p>

          {/* Feature cards - Modern glass style */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Package, label: "Gestion stocks", desc: "Matieres premieres" },
              { icon: ChefHat, label: "Production", desc: "Planification" },
              { icon: ShoppingCart, label: "Commandes", desc: "Ventes & POS" },
              { icon: BarChart3, label: "Analytics", desc: "Tableau de bord" },
            ].map((feat) => (
              <div
                key={feat.label}
                className="group flex items-start gap-3 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-4 transition-all hover:bg-white/[0.06] hover:border-primary/20"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <feat.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">{feat.label}</span>
                  <span className="text-xs text-white/40">{feat.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Social proof */}
        <div className="relative z-10 flex items-center gap-6 pt-6 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 border-2 border-secondary flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 border-2 border-secondary flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">+150 patisseries</span>
              <span className="text-xs text-white/40">font confiance a KIFSHOP</span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">100% Tunisien</span>
            <span className="text-xs text-white/40">Support local</span>
          </div>
        </div>
      </div>

      {/* Right panel - Form area with refined styling */}
      <div className="flex flex-1 items-center justify-center bg-background p-6 lg:p-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
