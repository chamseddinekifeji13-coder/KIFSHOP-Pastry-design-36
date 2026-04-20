import type { Metadata } from "next"
import Link from "next/link"
import { ChefHat, ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Conditions Generales d'Utilisation - KIFSHOP Pastry",
  description:
    "Conditions generales d'utilisation de la plateforme KIFSHOP Pastry, logiciel de gestion pour patisseries en Tunisie.",
}

export default function TermsPage() {
  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-background shadow-lg shadow-primary/30">
              <ChefHat className="h-4 w-4" />
            </div>
            <span className="text-base font-bold text-foreground">
              KIFSHOP <span className="font-normal text-primary">Pastry</span>
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Conditions Generales d{"'"}Utilisation
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Derniere mise a jour : Mars 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/90">
          {/* Article 1 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Article 1 - Identification
            </h2>
            <p className="mt-2">
              La plateforme KIFSHOP Pastry (ci-apres &quot;le Service&quot;) est
              editee et exploitee depuis la Tunisie. Le Service est accessible a
              l{"'"}adresse{" "}
              <Link href="https://kifshop.tn" className="text-primary hover:underline">
                https://kifshop.tn
              </Link>
              .
            </p>
            <p className="mt-2">
              Contact : <a href="mailto:contact@kifshop.tn" className="text-primary hover:underline">contact@kifshop.tn</a> — Tel : +216 25 12 22 12
            </p>
          </section>

          {/* Article 2 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Article 2 - Objet du Service
            </h2>
            <p className="mt-2">
              KIFSHOP Pastry est un logiciel de gestion en ligne (SaaS) concu
              specialement pour les patisseries, boulangeries et laboratoires de
              production. Il permet la gestion des stocks de matieres premieres,
              des recettes et de la production, des commandes clients, de la
              tresorerie, de la facturation, ainsi que la gestion commerciale
              (e-boutique, canaux de vente).
            </p>
          </section>

          {/* Article 3 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Article 3 - Inscription et Compte
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                L{"'"}inscription est ouverte a toute personne physique ou morale
                exerçant une activite de patisserie, boulangerie ou production
                alimentaire.
              </li>
              <li>
                L{"'"}utilisateur s{"'"}engage a fournir des informations exactes lors
                de l{"'"}inscription et a les maintenir a jour.
              </li>
              <li>
                Chaque compte est associe a un &quot;tenant&quot; (espace de travail) et
                peut accueillir plusieurs utilisateurs selon l{"'"}abonnement choisi.
              </li>
              <li>
                L{"'"}utilisateur est responsable de la confidentialite de ses
                identifiants (email, mot de passe, code PIN).
              </li>
            </ul>
          </section>

          {/* Article 4 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Article 4 - Abonnements et Tarifs
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Un essai gratuit de 14 jours est offert a toute nouvelle
                inscription, sans carte bancaire.
              </li>
              <li>
                Les tarifs en vigueur sont affiches sur la page{" "}
                <Link href="/#pricing" className="text-primary hover:underline">
                  Tarifs
                </Link>{" "}
                du site.
              </li>
              <li>
                Les abonnements sont mensuels ou annuels. Le renouvellement est
                tacite sauf resiliation prealable.
              </li>
              <li>
                KIFSHOP Pastry se reserve le droit de modifier ses tarifs avec un
                preavis de 30 jours.
              </li>
            </ul>
          </section>

          {/* Article 5 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Article 5 - Donnees Personnelles
            </h2>
            <p className="mt-2">
              Le traitement des donnees personnelles est detaille dans notre{" "}
              <Link
                href="/privacy"
                className="text-primary hover:underline"
              >
                Politique de Confidentialite
              </Link>
              . En utilisant le Service, vous acceptez les pratiques decrites
              dans ce document.
            </p>
          </section>

          {/* Article 6 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Article 6 - Propriete Intellectuelle
            </h2>
            <p className="mt-2">
              L{"'"}ensemble du Service (code, design, marque, contenu) est la
              propriete exclusive de KIFSHOP. Toute reproduction, modification ou
              distribution non autorisee est interdite. Les donnees saisies par
              l{"'"}utilisateur restent sa propriete exclusive.
            </p>
          </section>

          {/* Article 7 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Article 7 - Disponibilite et Limitation de Responsabilite
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                KIFSHOP Pastry s{"'"}engage a assurer la disponibilite du Service
                dans les meilleures conditions, sans garantie d{"'"}absence
                d{"'"}interruption.
              </li>
              <li>
                Des operations de maintenance planifiees pourront etre effectuees
                avec notification prealable.
              </li>
              <li>
                KIFSHOP ne saurait etre tenu responsable des pertes de donnees
                liees a une utilisation non conforme du Service.
              </li>
            </ul>
          </section>

          {/* Article 8 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Article 8 - Resiliation
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                L{"'"}utilisateur peut resilier son abonnement a tout moment depuis
                les parametres de son compte.
              </li>
              <li>
                En cas de non-respect des presentes conditions, KIFSHOP se
                reserve le droit de suspendre ou supprimer un compte.
              </li>
              <li>
                Apres resiliation, les donnees sont conservees pendant 30 jours
                avant suppression definitive, sauf demande contraire.
              </li>
            </ul>
          </section>

          {/* Article 9 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Article 9 - Droit Applicable
            </h2>
            <p className="mt-2">
              Les presentes conditions sont regies par le droit tunisien. Tout
              litige sera soumis aux juridictions competentes de Tunisie.
            </p>
          </section>

          {/* Contact */}
          <section className="rounded-xl border border-border bg-muted/30 p-6">
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p className="mt-2">
              Pour toute question relative aux presentes conditions :<br />
              Email :{" "}
              <a
                href="mailto:contact@kifshop.tn"
                className="text-primary hover:underline"
              >
                contact@kifshop.tn
              </a>
              <br />
              Telephone :{" "}
              <a
                href="tel:+21625122212"
                className="text-primary hover:underline"
              >
                +216 25 12 22 12
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-4xl px-6 py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} KIFSHOP Pastry. Tous droits reserves.</p>
        </div>
      </footer>
    </div>
  )
}
