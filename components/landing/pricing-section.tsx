import Link from "next/link"
import { Check, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const plans = [
  {
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
    ctaHref: "/auth/sign-up",
  },
  {
    name: "Pro",
    price: "89",
    currency: "DT",
    period: "/mois",
    description: "Pour les patisseries en croissance",
    highlight: true,
    badge: "Populaire",
    features: [
      "Toutes les fonctionnalites",
      "Jusqu'a 5 utilisateurs",
      "Support prioritaire 24/7",
      "E-Boutique integree",
      "Notifications inter-roles",
      "Sauvegardes automatiques",
    ],
    cta: "Choisir Pro",
    ctaHref: "/auth/sign-up",
  },
  {
    name: "Enterprise",
    price: "Sur mesure",
    period: "",
    description: "Pour les grandes enseignes et laboratoires",
    highlight: false,
    features: [
      "Utilisateurs illimites",
      "Multi-points de vente",
      "API et integrations custom",
      "Deploiement On-Premise possible",
      "Formation et onboarding dedies",
      "SLA et support dedie",
    ],
    cta: "Nous contacter",
    ctaHref: "#contact",
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4A7C59]">
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
                  ? "border-[#4A7C59]/40 bg-card shadow-md"
                  : "border-border bg-card shadow-sm"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#4A7C59] px-4 py-1 text-xs font-semibold text-white shadow-md">
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
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
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
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-[#4A7C59]" : "text-muted-foreground"}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full h-11 gap-2 ${
                  plan.highlight
                    ? "bg-[#4A7C59] hover:bg-[#3d6a4b] text-white"
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
