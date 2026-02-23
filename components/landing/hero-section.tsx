import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#1a2e23] text-white">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
        backgroundSize: "40px 40px"
      }} />

      <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left - Text content */}
          <div className="flex flex-col gap-6">
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

          {/* Right - Image collage */}
          <div className="relative hidden lg:block">
            <div className="relative">
              {/* Main large image */}
              <div className="overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src="/images/hero-pastry.jpg"
                  alt="Patisseries artisanales tunisiennes disposees sur un comptoir en marbre"
                  width={600}
                  height={400}
                  className="object-cover"
                  style={{ width: "100%", height: "auto" }}
                  priority
                />
              </div>
              {/* Small overlapping image */}
              <div className="absolute -bottom-8 -left-8 overflow-hidden rounded-xl border-4 border-[#1a2e23] shadow-xl">
                <Image
                  src="/images/pastry-ingredients.jpg"
                  alt="Ingredients de patisserie frais et organises"
                  width={200}
                  height={150}
                  className="object-cover"
                  style={{ width: "200px", height: "150px" }}
                />
              </div>
              {/* Decorative accent */}
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-2xl border-2 border-[#7dba94]/30" />
              <div className="absolute -bottom-4 right-12 h-16 w-16 rounded-xl bg-[#4A7C59]/20 backdrop-blur-sm" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
