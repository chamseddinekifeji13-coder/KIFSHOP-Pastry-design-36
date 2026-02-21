"use client"

import { useState } from "react"
import { Download, Monitor, Terminal, Container, Check, Copy, Server, Cloud, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

const VERSION = "2.0.0"

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="group relative rounded-lg bg-[#1a2e23] p-4 font-mono text-sm text-[#7dba94]">
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
        className="absolute right-3 top-3 rounded-md border border-white/10 bg-white/5 p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Copier la commande"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <code className="block whitespace-pre-wrap break-all">{code}</code>
    </div>
  )
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
            KIFSHOP fonctionne en Cloud (heberge par nous) ou On-Premise (installe sur votre serveur). Meme logiciel, meme puissance.
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
                <a href="#install-guide">
                  <Download className="h-4 w-4" />
                  Voir le guide d{"'"}installation
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Install guide */}
        <div id="install-guide" className="mt-16 rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <Download className="h-5 w-5 text-[#4A7C59]" />
            <h3 className="text-xl font-bold text-foreground">
              Guide d{"'"}installation On-Premise
            </h3>
            <Badge variant="secondary" className="text-xs">v{VERSION}</Badge>
          </div>

          <Tabs defaultValue="docker" className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
              <TabsTrigger value="docker" className="gap-2">
                <Container className="h-4 w-4" />
                Docker
              </TabsTrigger>
              <TabsTrigger value="linux" className="gap-2">
                <Terminal className="h-4 w-4" />
                Linux
              </TabsTrigger>
              <TabsTrigger value="windows" className="gap-2">
                <Monitor className="h-4 w-4" />
                Windows
              </TabsTrigger>
            </TabsList>

            <TabsContent value="docker" className="mt-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">1. Telecharger l{"'"}image Docker</p>
                <CopyBlock code="docker pull kifshop/kifshop:latest" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">2. Lancer le conteneur</p>
                <CopyBlock code={`docker run -d \\
  --name kifshop \\
  -p 3000:3000 \\
  -e DATABASE_URL="postgresql://user:pass@host:5432/kifshop" \\
  -e KIFSHOP_LICENSE_KEY="votre-cle" \\
  --restart unless-stopped \\
  kifshop/kifshop:${VERSION}`} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">3. Avec Docker Compose (recommande)</p>
                <CopyBlock code={`# docker-compose.yml
version: "3.8"
services:
  kifshop:
    image: kifshop/kifshop:${VERSION}
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://kifshop:password@db:5432/kifshop
      KIFSHOP_LICENSE_KEY: votre-cle
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - kifshop_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: kifshop
      POSTGRES_USER: kifshop
      POSTGRES_PASSWORD: password

volumes:
  kifshop_data:`} />
              </div>
              <p className="text-sm text-muted-foreground">
                Accedez a KIFSHOP sur <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">http://localhost:3000</code> et suivez l{"'"}assistant de configuration.
              </p>
            </TabsContent>

            <TabsContent value="linux" className="mt-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">1. Prerequis</p>
                <CopyBlock code={`# Ubuntu / Debian
sudo apt update && sudo apt install -y nodejs npm postgresql

# CentOS / RHEL
sudo dnf install -y nodejs npm postgresql-server`} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">2. Telecharger et installer</p>
                <CopyBlock code={`curl -fsSL https://get.kifshop.tn | bash
# ou manuellement :
wget https://releases.kifshop.tn/v${VERSION}/kifshop-linux-x64.tar.gz
tar xzf kifshop-linux-x64.tar.gz
cd kifshop
./install.sh`} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">3. Configurer et demarrer</p>
                <CopyBlock code={`# Editer la configuration
nano /etc/kifshop/config.env

# Demarrer le service
sudo systemctl enable kifshop
sudo systemctl start kifshop`} />
              </div>
            </TabsContent>

            <TabsContent value="windows" className="mt-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">1. Telecharger l{"'"}installateur</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button variant="outline" className="gap-2" asChild>
                    <a href={`https://releases.kifshop.tn/v${VERSION}/kifshop-setup-x64.exe`}>
                      <Download className="h-4 w-4" />
                      KIFSHOP-Setup-{VERSION}-x64.exe
                    </a>
                  </Button>
                  <span className="self-center text-xs text-muted-foreground">~120 MB | Windows 10+</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">2. Installer</p>
                <p className="text-sm text-muted-foreground">
                  Executez l{"'"}installateur et suivez les etapes. L{"'"}assistant configurera automatiquement PostgreSQL et le serveur KIFSHOP.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">3. Acceder</p>
                <p className="text-sm text-muted-foreground">
                  KIFSHOP sera accessible sur <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">http://localhost:3000</code>. Un raccourci sera cree sur le bureau.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Requirements */}
          <div className="mt-8 rounded-xl border border-border bg-muted/30 p-6">
            <h4 className="text-sm font-semibold text-foreground">Configuration minimale requise</h4>
            <div className="mt-3 grid gap-4 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="font-medium text-foreground">Processeur</p>
                <p>2 coeurs (4 recommandes)</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Memoire RAM</p>
                <p>4 Go (8 Go recommandes)</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Disque</p>
                <p>10 Go minimum</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Base de donnees</p>
                <p>PostgreSQL 14+</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
