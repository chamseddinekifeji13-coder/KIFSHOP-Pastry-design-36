import Link from "next/link"
import { ChefHat, ArrowRight, Cloud, Server } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#1a2e23] text-white">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
        backgroundSize: "40px 40px"
      }} />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-24 text-center lg:py-32">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Version 2.0 disponible
        </div>

        {/* Main heading */}
        <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Gerez votre patisserie
          <span className="block text-[#7dba94]">en toute simplicite</span>
        </h1>

        <p className="max-w-2xl text-lg leading-relaxed text-white/70 text-pretty">
          <strong className="text-white">KIFSHOP Pastry</strong> est la solution de gestion tout-en-un concue
          specialement pour les patisseries, boulangeries et laboratoires en Tunisie.
          De la gestion des matieres premieres a la planification de production, en passant par les commandes
          clients, la facturation, le suivi de tresorerie et l{"'"}approvisionnement fournisseurs
          — chaque aspect de votre activite est couvert dans une seule plateforme.
        </p>

        <p className="max-w-2xl text-base leading-relaxed text-white/50 text-pretty">
          Multi-utilisateurs avec roles dedies (proprietaire, gerant, patissier, vendeur, caissier),
          accessible sur mobile en tant que PWA, avec notifications en temps reel et synchronisation instantanee.
          Disponible en <strong className="text-white/80">Cloud</strong> (heberge et maintenu par nos soins) ou <strong className="text-white/80">On-Premise</strong> (sur votre propre serveur).
          Interface disponible en <strong className="text-white/80">Francais</strong> et <strong className="text-white/80">Arabe</strong>.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Button size="lg" className="bg-[#4A7C59] hover:bg-[#3d6a4b] text-white gap-2 px-8 h-12 text-base" asChild>
            <Link href="/auth/sign-up">
              <Cloud className="h-4 w-4" />
              Essai gratuit
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white gap-2 px-8 h-12 text-base" asChild>
            <Link href="#download">
              <Server className="h-4 w-4" />
              Telecharger On-Premise
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-8 border-t border-white/10 pt-8 sm:grid-cols-4">
          {[
            { value: "37+", label: "Modules integres" },
            { value: "100%", label: "Made in Tunisia" },
            { value: "PWA", label: "Mobile & Desktop" },
            { value: "24/7", label: "Support inclus" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-[#7dba94]">{stat.value}</p>
              <p className="text-sm text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
