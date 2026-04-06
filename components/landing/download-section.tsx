'use client'

import { Send, Check, Server, Cloud, ArrowRight, Download, Apple, Monitor, Smartphone, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

// Configuration des liens de téléchargement
const DOWNLOAD_LINKS = {
  windows: "https://kifshop.com/downloads/kifshop-setup.exe",
  mac: "https://kifshop.com/downloads/kifshop.dmg",
  linux: "https://kifshop.com/downloads/kifshop.AppImage",
  ios: "https://apps.apple.com/app/kifshop",
  android: "https://play.google.com/store/apps/details?id=com.kifshop",
  web: "https://app.kifshop.com",
}

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

        {/* Tabs for Deployment and Downloads */}
        <div className="mt-14">
          <Tabs defaultValue="deployment" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto mb-8 bg-muted">
              <TabsTrigger value="deployment" className="gap-2">
                <Cloud className="h-4 w-4" />
                Deploiement
              </TabsTrigger>
              <TabsTrigger value="download" className="gap-2">
                <Download className="h-4 w-4" />
                Telecharger
              </TabsTrigger>
            </TabsList>

            {/* Deployment Tab */}
            <TabsContent value="deployment">
              <div className="grid gap-6 lg:grid-cols-2">
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
            </TabsContent>

            {/* Download Tab */}
            <TabsContent value="download">
              <div className="space-y-8">
                {/* Desktop Downloads */}
                <div className="rounded-2xl border border-border bg-card p-8">
                  <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-[#4A7C59]" />
                    Applications Desktop
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <a
                      href={DOWNLOAD_LINKS.windows}
                      className="group flex flex-col items-center gap-4 rounded-xl border border-border p-6 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-200">
                        <Monitor className="h-8 w-8" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-foreground">Windows</p>
                        <p className="text-xs text-muted-foreground">Setup (.exe)</p>
                      </div>
                      <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
                        <Download className="h-4 w-4" />
                        Telecharger
                      </Button>
                    </a>

                    <a
                      href={DOWNLOAD_LINKS.mac}
                      className="group flex flex-col items-center gap-4 rounded-xl border border-border p-6 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-gray-600 group-hover:bg-gray-200">
                        <Apple className="h-8 w-8" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-foreground">macOS</p>
                        <p className="text-xs text-muted-foreground">DMG Installer</p>
                      </div>
                      <Button size="sm" className="w-full bg-gray-600 hover:bg-gray-700 text-white gap-2">
                        <Download className="h-4 w-4" />
                        Telecharger
                      </Button>
                    </a>

                    <a
                      href={DOWNLOAD_LINKS.linux}
                      className="group flex flex-col items-center gap-4 rounded-xl border border-border p-6 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-100 text-orange-600 group-hover:bg-orange-200">
                        <Monitor className="h-8 w-8" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-foreground">Linux</p>
                        <p className="text-xs text-muted-foreground">AppImage</p>
                      </div>
                      <Button size="sm" className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2">
                        <Download className="h-4 w-4" />
                        Telecharger
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Mobile Downloads */}
                <div className="rounded-2xl border border-border bg-card p-8">
                  <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <Download className="h-5 w-5 text-[#4A7C59]" />
                    Applications Mobile
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 max-w-md">
                    <a
                      href={DOWNLOAD_LINKS.ios}
                      className="group flex flex-col items-center gap-4 rounded-xl border border-border p-6 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-gray-600 group-hover:bg-gray-200">
                        <Apple className="h-8 w-8" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-foreground">iOS</p>
                        <p className="text-xs text-muted-foreground">App Store</p>
                      </div>
                      <Button size="sm" className="w-full bg-gray-600 hover:bg-gray-700 text-white gap-2">
                        <Download className="h-4 w-4" />
                        Obtenir
                      </Button>
                    </a>

                    <a
                      href={DOWNLOAD_LINKS.android}
                      className="group flex flex-col items-center gap-4 rounded-xl border border-border p-6 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100 text-green-600 group-hover:bg-green-200">
                        <Smartphone className="h-8 w-8" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-foreground">Android</p>
                        <p className="text-xs text-muted-foreground">Play Store</p>
                      </div>
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
                        <Download className="h-4 w-4" />
                        Obtenir
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Web App */}
                <div className="rounded-2xl border border-[#4A7C59]/20 bg-card p-8">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#4A7C59]/10 text-[#4A7C59]">
                      <Globe className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">Application Web</h4>
                      <p className="text-sm text-muted-foreground">Fonctionne dans votre navigateur, aucune installation</p>
                    </div>
                    <Button className="bg-[#4A7C59] hover:bg-[#3d6a4b] text-white gap-2" asChild>
                      <a href={DOWNLOAD_LINKS.web}>
                        Ouvrir
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
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
