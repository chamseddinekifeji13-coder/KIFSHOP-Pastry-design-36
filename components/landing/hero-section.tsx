import Link from "next/link"
import { ArrowRight, Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"

function DashboardIllustration() {
  return (
    <div className="relative w-full animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
      {/* Browser chrome */}
      <div className="rounded-2xl border border-white/10 bg-[#0f1f17] shadow-2xl overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          </div>
          <div className="mx-auto rounded-md bg-white/5 px-12 py-1 text-[10px] text-white/30">
            kifshop.tn/dashboard
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Commandes", value: "128", change: "+12%", color: "bg-[#4A7C59]" },
              { label: "Revenus", value: "4,250 DT", change: "+8%", color: "bg-[#7dba94]" },
              { label: "Stock", value: "94%", change: "Bon", color: "bg-emerald-500/80" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-white/5 p-3">
                <p className="text-[10px] text-white/40">{stat.label}</p>
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <span className={`inline-block mt-1 rounded-full ${stat.color}/20 px-2 py-0.5 text-[9px] font-medium text-[#7dba94]`}>
                  {stat.change}
                </span>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="rounded-lg bg-white/5 p-3 mb-4">
            <p className="text-[10px] text-white/40 mb-2">Ventes cette semaine</p>
            <div className="flex items-end gap-1.5 h-20">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-[#4A7C59] transition-all animate-bar-grow"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${0.6 + i * 0.08}s`,
                    opacity: 0.5 + (h / 180),
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1.5 text-[8px] text-white/30">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>

          {/* Recent orders */}
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-[10px] text-white/40 mb-2">Commandes recentes</p>
            <div className="space-y-2">
              {[
                { name: "Gateau mariage - Sonia", status: "En cours", statusColor: "bg-yellow-400" },
                { name: "Assortiment 50 pieces", status: "Livre", statusColor: "bg-[#4A7C59]" },
                { name: "Millefeuille x20", status: "Pret", statusColor: "bg-[#7dba94]" },
              ].map((order) => (
                <div key={order.name} className="flex items-center justify-between rounded-md bg-white/[0.03] px-2.5 py-1.5">
                  <span className="text-[10px] text-white/70">{order.name}</span>
                  <span className="flex items-center gap-1 text-[9px] text-white/50">
                    <span className={`h-1.5 w-1.5 rounded-full ${order.statusColor}`} />
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating card - stock alert */}
      <div className="absolute -left-6 bottom-16 animate-float rounded-xl border border-white/10 bg-[#1a2e23]/95 p-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
            <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-medium text-white">Alerte stock</p>
            <p className="text-[9px] text-white/50">Farine: seuil bas atteint</p>
          </div>
        </div>
      </div>

      {/* Floating card - new order */}
      <div className="absolute -right-4 top-24 animate-float rounded-xl border border-white/10 bg-[#1a2e23]/95 p-3 shadow-xl backdrop-blur-md" style={{ animationDelay: "1s" }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4A7C59]/30">
            <svg className="h-4 w-4 text-[#7dba94]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-medium text-white">Nouvelle commande</p>
            <p className="text-[9px] text-white/50">+320 DT via WhatsApp</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#1a2e23] text-white">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
        backgroundSize: "40px 40px"
      }} />

      {/* Gradient orb */}
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#4A7C59]/20 blur-3xl" />
      <div className="absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-[#7dba94]/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left - Text content */}
          <div className="flex flex-col gap-6 animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Version 2.0 disponible
            </div>

            {/* Main heading */}
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Gerez votre patisserie
              <span className="block text-[#7dba94]">en toute simplicite</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-white/70 text-pretty">
              <strong className="text-white">KIFSHOP Pastry</strong> est la solution de gestion tout-en-un concue
              specialement pour les patisseries, boulangeries et laboratoires en Tunisie.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <Button size="lg" className="bg-[#4A7C59] hover:bg-[#3d6a4b] text-white gap-2 px-8 h-12 text-base" asChild>
                <Link href="/auth/sign-up">
                  <Cloud className="h-4 w-4" />
                  Essai gratuit
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white gap-2 px-8 h-12 text-base" asChild>
                <a href="#contact">
                  Nous contacter
                </a>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 gap-6 border-t border-white/10 pt-6 sm:grid-cols-4">
              {[
                { value: "37+", label: "Modules integres" },
                { value: "100%", label: "Made in Tunisia" },
                { value: "PWA", label: "Mobile & Desktop" },
                { value: "24/7", label: "Support inclus" },
              ].map((stat) => (
                <div key={stat.label} className="text-center sm:text-left">
                  <p className="text-2xl font-bold text-[#7dba94]">{stat.value}</p>
                  <p className="text-sm text-white/60">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Dashboard illustration */}
          <div className="relative hidden lg:block">
            <DashboardIllustration />
          </div>
        </div>
      </div>
    </section>
  )
}
