import Image from "next/image"
import { CheckCircle2 } from "lucide-react"

export function ShowcaseSection() {
  return (
    <section className="bg-muted/30 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        {/* Row 1: Image left, text right */}
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative h-[350px] overflow-hidden rounded-2xl shadow-lg lg:h-[420px]">
            <Image
              src="/images/pastry-showcase.jpg"
              alt="Patissier decorant un gateau dans un laboratoire professionnel"
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-5">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#4A7C59]">
              Concu pour les artisans
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
              De la recette a la livraison, tout est suivi
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground text-pretty">
              KIFSHOP Pastry accompagne chaque etape de votre production. Creez vos fiches techniques,
              planifiez vos productions, suivez la consommation des matieres premieres et gerez vos
              commandes clients — le tout depuis une seule interface.
            </p>
            <ul className="mt-2 space-y-3">
              {[
                "Fiches techniques avec calcul automatique des couts",
                "Planification de production par jour ou par semaine",
                "Deduction automatique des matieres premieres",
                "Suivi en temps reel des stocks et alertes seuils bas",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#4A7C59]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Row 2: Text left, image right */}
        <div className="mt-20 grid items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-5 lg:order-1">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#4A7C59]">
              Votre vitrine digitale
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
              Presentez vos creations, recevez des commandes
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground text-pretty">
              Avec l{"'"}E-Boutique integree et les canaux de vente (WhatsApp, Instagram, telephone),
              transformez chaque message en commande tracee. Vos clients voient votre catalogue, passent
              commande, et vous gerez tout depuis KIFSHOP.
            </p>
            <ul className="mt-2 space-y-3">
              {[
                "Catalogue produits avec photos et prix",
                "Commandes via WhatsApp, Instagram et Messenger",
                "Suivi des prospects et conversion en commandes",
                "Facturation et suivi de tresorerie integres",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#4A7C59]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative h-[350px] overflow-hidden rounded-2xl shadow-lg lg:order-2 lg:h-[420px]">
            <Image
              src="/images/pastry-display.jpg"
              alt="Vitrine de patisserie avec assortiment de gateaux et viennoiseries"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
