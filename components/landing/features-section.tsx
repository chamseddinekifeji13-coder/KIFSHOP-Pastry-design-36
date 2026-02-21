import {
  Package, ShoppingCart, ChefHat, FileText, Wallet, Truck,
  ClipboardCheck, Users, Smartphone, BarChart3, Bell, Shield
} from "lucide-react"

const features = [
  {
    icon: Package,
    title: "Stocks matieres premieres",
    desc: "Suivi en temps reel des stocks, alertes seuils bas, mouvements entree/sortie, multi-emplacements.",
  },
  {
    icon: ChefHat,
    title: "Production & Recettes",
    desc: "Fiches techniques detaillees, planification de production, calcul automatique des besoins MP.",
  },
  {
    icon: ShoppingCart,
    title: "Commandes clients",
    desc: "Cycle de vie complet des commandes, suivi des statuts, historique et retours.",
  },
  {
    icon: FileText,
    title: "Facturation",
    desc: "Generation de factures, devis, suivi des paiements et credits clients.",
  },
  {
    icon: Wallet,
    title: "Tresorerie",
    desc: "Tableau de bord financier, suivi des entrees/sorties, categories personnalisables.",
  },
  {
    icon: Truck,
    title: "Approvisionnement",
    desc: "Gestion des fournisseurs, bons de commande, suivi des livraisons.",
  },
  {
    icon: ClipboardCheck,
    title: "Inventaire physique",
    desc: "Sessions d'inventaire, comparaison theorique vs physique, ecarts automatiques.",
  },
  {
    icon: Users,
    title: "Multi-utilisateurs",
    desc: "Roles distincts (proprietaire, gerant, patissier, vendeur), chacun avec ses acces.",
  },
  {
    icon: Smartphone,
    title: "Application mobile PWA",
    desc: "Installez KIFSHOP sur votre telephone. Fonctionne meme hors connexion.",
  },
  {
    icon: BarChart3,
    title: "Tableau de bord",
    desc: "Vue d'ensemble en temps reel : CA, commandes, stocks critiques, tendances.",
  },
  {
    icon: Bell,
    title: "Notifications",
    desc: "Alertes inter-roles en temps reel : stock bas, commande urgente, livraison.",
  },
  {
    icon: Shield,
    title: "Securite avancee",
    desc: "Verification PIN serveur, verrouillage auto, isolation multi-tenant, RLS.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4A7C59]">
            Fonctionnalites
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            Tout ce dont votre patisserie a besoin
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
            Un seul logiciel pour gerer l{"'"}ensemble de votre activite, du laboratoire au point de vente.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-[#4A7C59]/30 hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#4A7C59]/10 text-[#4A7C59] transition-colors group-hover:bg-[#4A7C59] group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
