"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Package, ChefHat, Wallet, ShoppingCart, BarChart3, Users,
  ArrowRight, Check, Phone, MessageCircle, Star, Smartphone,
  Play
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const FEATURES = [
  { icon: Package, title: "Gestion des stocks", desc: "Matieres premieres, emballages, produits finis. Alertes automatiques." },
  { icon: ChefHat, title: "Recettes & Production", desc: "Fiches techniques, calcul des couts, planification." },
  { icon: ShoppingCart, title: "Commandes", desc: "Suivi complet du cycle de commande client." },
  { icon: Wallet, title: "Tresorerie", desc: "Entrees, sorties, solde en temps reel." },
  { icon: BarChart3, title: "Tableau de bord", desc: "Chiffres cles en un coup d'oeil." },
  { icon: Users, title: "Multi-utilisateurs", desc: "Gerant, patissier, vendeur, magasinier." },
]

const TESTIMONIALS = [
  { name: "Sonia B.", city: "Sousse", text: "KIFSHOP a transforme ma gestion quotidienne. Je gagne 2h par jour." },
  { name: "Ahmed K.", city: "Tunis", text: "Enfin un logiciel adapte aux patisseries tunisiennes. Simple et efficace." },
  { name: "Fatma M.", city: "Sfax", text: "Le suivi des stocks en temps reel m'evite les ruptures. Indispensable." },
]

function DemoRequestForm() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [business, setBusiness] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      toast.error("Veuillez remplir votre nom et telephone")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), business: business.trim() }),
      })
      if (res.ok) {
        setSubmitted(true)
        toast.success("Demande envoyee avec succes !")
      } else {
        toast.error("Erreur, veuillez reessayer")
      }
    } catch {
      toast.error("Erreur de connexion")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#4A7C59]/10">
          <Check className="h-8 w-8 text-[#4A7C59]" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Merci {name} !</h3>
        <p className="mt-2 text-muted-foreground">
          Notre equipe vous contactera dans les 24h pour planifier votre demo gratuite.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <a
            href="https://wa.me/21651378404?text=Bonjour%2C%20je%20souhaite%20une%20demo%20KIFSHOP"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#20BD5A] transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Ecrire sur WhatsApp
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="demo-name" className="text-foreground">Votre nom *</Label>
        <Input id="demo-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Mohamed Ben Ali" className="h-12" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="demo-phone" className="text-foreground">Telephone *</Label>
        <Input id="demo-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex: 51 378 404" className="h-12" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="demo-business" className="text-foreground">Nom de votre patisserie</Label>
        <Input id="demo-business" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Ex: Patisserie Al Baraka" className="h-12" />
      </div>
      <Button type="submit" disabled={submitting} className="w-full h-12 bg-[#4A7C59] hover:bg-[#3d6a4b] text-white text-base font-semibold gap-2">
        {submitting ? "Envoi en cours..." : "Demander ma demo gratuite"}
        {!submitting && <ArrowRight className="h-4 w-4" />}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Gratuit, sans engagement. Demo personnalisee en 15 minutes.
      </p>
    </form>
  )
}

export function CampaignLanding() {
  return (
    <div className="min-h-svh bg-background">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4A7C59]">
              <Package className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">KIFSHOP</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="tel:+21651378404" className="hidden sm:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Phone className="h-3.5 w-3.5" />
              51 378 404
            </a>
            <Button size="sm" className="bg-[#4A7C59] hover:bg-[#3d6a4b] text-white" asChild>
              <a href="#demo">Essai gratuit</a>
            </Button>
          </div>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <Image
            src="/images/kifshop-hero.jpg"
            alt="Patisseries tunisiennes"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a2e23]/95 via-[#1a2e23]/85 to-[#1a2e23]/60" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            {/* Left - Text */}
            <div className="animate-fade-in-up">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Essai gratuit 14 jours
              </div>

              <h1 className="text-3xl font-bold leading-tight text-white text-balance sm:text-4xl lg:text-5xl">
                Votre patisserie merite
                <span className="block text-[#7dba94]">un outil a sa hauteur</span>
              </h1>

              <p className="mt-4 max-w-lg text-base leading-relaxed text-white/80 text-pretty sm:text-lg">
                Gerez vos stocks, recettes, commandes et tresorerie depuis une seule application.
                100% adapte aux patisseries tunisiennes.
              </p>

              {/* Trust badges */}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 backdrop-blur-sm">
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile & Desktop
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 backdrop-blur-sm">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Sans engagement
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 backdrop-blur-sm">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  100% tunisien
                </div>
              </div>

              {/* CTA for mobile */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:hidden">
                <Button size="lg" className="bg-[#4A7C59] hover:bg-[#3d6a4b] text-white gap-2 h-12" asChild>
                  <a href="#demo">
                    Essayer gratuitement
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <a
                  href="https://wa.me/21651378404?text=Bonjour%2C%20je%20souhaite%20une%20demo%20KIFSHOP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            </div>

            {/* Right - Form card (desktop) */}
            <div className="hidden lg:block animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <div className="mb-5 text-center">
                  <h2 className="text-lg font-bold text-foreground">Demandez votre demo gratuite</h2>
                  <p className="mt-1 text-sm text-muted-foreground">On vous rappelle en moins de 24h</p>
                </div>
                <DemoRequestForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-border sm:grid-cols-4">
          {[
            { value: "37+", label: "Modules" },
            { value: "100%", label: "Tunisien" },
            { value: "4.8/5", label: "Satisfaction" },
            { value: "24/7", label: "Support" },
          ].map((s) => (
            <div key={s.label} className="px-4 py-5 text-center">
              <p className="text-2xl font-bold text-[#4A7C59]">{s.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-foreground text-balance sm:text-3xl">
              Fini les cahiers et les feuilles Excel
            </h2>
            <p className="mt-3 text-muted-foreground text-pretty">
              KIFSHOP remplace vos outils disparates par une solution unique, conçue pour le metier de patissier.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-[#4A7C59]/40 hover:shadow-lg hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#4A7C59]/10 text-[#4A7C59] transition-colors group-hover:bg-[#4A7C59] group-hover:text-white">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCREENSHOT / DASHBOARD */}
      <section className="bg-[#1a2e23] py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-white text-balance sm:text-3xl">
                Une interface pensee pour votre quotidien
              </h2>
              <p className="mt-3 text-white/70 text-pretty">
                Pas besoin de formation. KIFSHOP est concu pour etre utilise des le premier jour.
                Interface claire, navigation intuitive, donnees en temps reel.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Tableau de bord avec chiffres du jour",
                  "Alertes stock en temps reel",
                  "Suivi des commandes par statut",
                  "Tresorerie avec graphiques",
                  "Fonctionne sur telephone et ordinateur",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#7dba94]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button size="lg" className="bg-[#4A7C59] hover:bg-[#3d6a4b] text-white gap-2 h-12" asChild>
                  <a href="#demo">
                    <Play className="h-4 w-4" />
                    Voir la demo
                  </a>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                <Image
                  src="/images/kifshop-dashboard.jpg"
                  alt="Dashboard KIFSHOP sur tablette"
                  width={600}
                  height={400}
                  className="w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-foreground text-balance sm:text-3xl">
            Ils nous font confiance
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-xl border border-border bg-card p-6">
                <div className="mb-3 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-[#D4A373] text-[#D4A373]" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground italic">{`"${t.text}"`}</p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4A7C59]/10 text-xs font-bold text-[#4A7C59]">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / DEMO FORM (mobile + anchor) */}
      <section id="demo" className="border-t border-border bg-muted/50 py-16 lg:py-20">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#4A7C59]/10">
                <Package className="h-6 w-6 text-[#4A7C59]" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Essayez KIFSHOP gratuitement</h2>
              <p className="mt-1 text-sm text-muted-foreground">14 jours d{"'"}essai, sans carte bancaire</p>
            </div>
            <DemoRequestForm />
          </div>

          {/* WhatsApp alternative */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">Ou contactez-nous directement :</p>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <a
                href="https://wa.me/21651378404?text=Bonjour%2C%20je%20souhaite%20une%20demo%20KIFSHOP"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#20BD5A] transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <a
                href="tel:+21651378404"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Phone className="h-4 w-4" />
                51 378 404
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4A7C59]">
                <Package className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-semibold text-foreground">KIFSHOP Pastry</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date().getFullYear()} KIFSHOP. Solution 100% tunisienne pour patisseries.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Accueil
              </Link>
              <Link href="/auth/sign-up?fresh=1" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Inscription
              </Link>
              <Link href="/auth/sign-in" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Connexion
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
