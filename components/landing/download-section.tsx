import { Send, Check, Server, Cloud, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function DownloadSection() {
  return (
    <section id="download" className="bg-muted/30 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4A7C59]">
            Installation
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            Choisissez votre mode de deploiement
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
            KIFSHOP Pastry fonctionne en Cloud (heberge par nous) ou On-Premise (installe sur votre serveur). Meme logiciel, meme puissance.
          </p>
        </div>

        {/* Comparison cards */}
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {/* Cloud */}
          <div className="relative overflow-hidden rounded-2xl border border-[#4A7C59]/20 bg-card p-8 shadow-sm">
            <div className="absolute right-0 top-0 rounded-bl-xl bg-[#4A7C59] px-3 py-1 text-xs font-medium text-white">
              Recommande
            </div>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4A7C59]/10 text-[#4A7C59]">
                <Cloud className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Cloud</h3>
                <p className="text-sm text-muted-foreground">Heberge et maintenu par KIFSHOP</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-foreground">
              {[
                "Aucune installation requise",
                "Mises a jour automatiques",
                "Sauvegardes quotidiennes incluses",
                "Support prioritaire 24/7",
                "SSL et securite geree",
                "Accessible depuis partout",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4A7C59]" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button className="w-full bg-[#4A7C59] hover:bg-[#3d6a4b] text-white h-11 gap-2" asChild>
                <Link href="/auth/sign-up">
                  Commencer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Essai gratuit 14 jours - Sans carte bancaire
              </p>
            </div>
          </div>

          {/* On-Premise */}
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground">
                <Server className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">On-Premise</h3>
                <p className="text-sm text-muted-foreground">Installe sur votre propre serveur</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-foreground">
              {[
                "Controle total de vos donnees",
                "Fonctionne sur reseau local (sans internet)",
                "Personnalisation avancee possible",
                "Licence perpetuelle disponible",
                "Compatible Windows, Linux, Docker",
                "Ideal pour les grandes patisseries",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button variant="outline" className="w-full h-11 gap-2 border-foreground/20" asChild>
                <a href="#contact">
                  <Send className="h-4 w-4" />
                  Nous contacter
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Trusted by */}
        <div className="mt-14 text-center">
          <p className="text-sm text-muted-foreground">
            Besoin d{"'"}aide pour choisir ? Appelez-nous au{" "}
            <a href="tel:+21625122212" className="font-medium text-[#4A7C59] hover:underline">+216 25 12 22 12</a>
          </p>
        </div>
      </div>
    </section>
  )
}
