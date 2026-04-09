"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Check, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

type DbPlan = {
  id: string
  name: string
  display_name: string
  price_monthly: number
  max_sales_channels: number
  max_warehouses: number
  max_users: number
  features: Record<string, string> | null
  is_active: boolean
}

type UiPlan = {
  id: string
  name: string
  price: string
  currency?: string
  period: string
  description: string
  highlight: boolean
  badge?: string
  features: string[]
  cta: string
  ctaHref: string
}

const trialPlan: UiPlan = {
  id: "trial",
  name: "Decouverte",
  price: "Gratuit",
  period: "14 jours",
  description: "Testez toutes les fonctionnalites sans engagement",
  highlight: false,
  features: [
    "Toutes les fonctionnalites incluses",
    "1 utilisateur",
    "Assistance par email",
    "Donnees conservees apres upgrade",
  ],
  cta: "Commencer gratuitement",
  ctaHref: "/auth/sign-up?fresh=1",
}

function toUiPlan(plan: DbPlan, highlight: boolean): UiPlan {
  const featureValues = Object.values(plan.features || {}).filter(Boolean).slice(0, 3)
  const features = [
    "Toutes les fonctionnalites",
    `Jusqu'a ${plan.max_users} utilisateurs`,
    `${plan.max_sales_channels} point(s) de vente`,
    `${plan.max_warehouses} depot(s)`,
    ...featureValues,
  ].slice(0, 6)

  return {
    id: plan.id,
    name: plan.display_name || plan.name,
    price: String(Number(plan.price_monthly || 0)),
    currency: "DT",
    period: "/mois",
    description: `Pour les patisseries avec ${plan.max_sales_channels} point(s) de vente`,
    highlight,
    badge: highlight ? "Populaire" : undefined,
    features,
    cta: `Choisir ${plan.display_name || plan.name}`,
    ctaHref: "/auth/sign-up?fresh=1",
  }
}

export function PricingSection() {
  const [dbPlans, setDbPlans] = useState<DbPlan[]>([])

  useEffect(() => {
    async function loadPlans() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("subscription_plans")
          .select("id, name, display_name, price_monthly, max_sales_channels, max_warehouses, max_users, features, is_active")
          .eq("is_active", true)
          .order("price_monthly", { ascending: true })

        setDbPlans((data || []) as DbPlan[])
      } catch (error) {
        console.error("Failed to load pricing plans:", error)
      }
    }
    loadPlans()
  }, [])

  const plans = useMemo(() => {
    const paid = dbPlans.filter((p) => Number(p.price_monthly || 0) > 0)
    const highlightIndex = paid.length > 1 ? 1 : 0
    const paidUi = paid.map((p, i) => toUiPlan(p, i === highlightIndex))
    return [trialPlan, ...paidUi]
  }, [dbPlans])

  return (
    <section id="pricing" className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Tarifs
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            Des plans adaptes a votre activite
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
            Commencez gratuitement, evoluez quand vous etes pret. Aucune carte bancaire requise pour l{"'"}essai.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                plan.highlight
                  ? "border-primary/40 bg-card shadow-md shadow-primary/20"
                  : "border-border bg-card shadow-sm"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-background shadow-lg shadow-primary/30">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  {plan.currency ? (
                    <>
                      <span className="text-4xl font-bold text-primary">{plan.price}</span>
                      <span className="text-lg font-medium text-muted-foreground">{plan.currency}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      {plan.period && (
                        <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full h-11 gap-2 ${
                  plan.highlight
                    ? "bg-primary hover:bg-primary/90 text-background shadow-lg shadow-primary/40 hover:shadow-primary/60 transition-all duration-300"
                    : ""
                }`}
                variant={plan.highlight ? "default" : "outline"}
                asChild
              >
                {plan.ctaHref.startsWith("#") ? (
                  <a href={plan.ctaHref}>
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                ) : (
                  <Link href={plan.ctaHref}>
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Tous les prix sont en Dinars Tunisiens (DT), HT. Facturation mensuelle ou annuelle (2 mois offerts).
        </p>
      </div>
    </section>
  )
}
