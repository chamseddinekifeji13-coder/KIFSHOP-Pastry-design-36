import type { Metadata } from "next"
import Link from "next/link"
import { ChefHat, ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Politique de Confidentialite - KIFSHOP Pastry",
  description:
    "Politique de confidentialite de KIFSHOP Pastry. Decouvrez comment nous collectons, utilisons et protegeons vos donnees personnelles.",
}

export default function PrivacyPage() {
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
          Politique de Confidentialite
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Derniere mise a jour : Mars 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/90">
          {/* Section 1 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Introduction
            </h2>
            <p className="mt-2">
              KIFSHOP Pastry (ci-apres &quot;nous&quot;, &quot;notre&quot;, &quot;le
              Service&quot;) s{"'"}engage a proteger la vie privee de ses
              utilisateurs. Cette politique decrit les donnees que nous
              collectons, comment nous les utilisons et les mesures de securite
              mises en place.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Donnees Collectees
            </h2>
            <p className="mt-2">Nous collectons les categories de donnees suivantes :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Donnees d{"'"}inscription :</strong> nom, prenom, adresse
                email, nom de la patisserie, mot de passe (chiffre).
              </li>
              <li>
                <strong>Donnees d{"'"}utilisation :</strong> informations sur les
                stocks, commandes, clients, recettes, transactions de
                tresorerie, factures saisies dans le Service.
              </li>
              <li>
                <strong>Donnees techniques :</strong> adresse IP, type de
                navigateur, pages visitees, duree des sessions (a des fins de
                securite et d{"'"}amelioration).
              </li>
              <li>
                <strong>Donnees de contact :</strong> informations transmises
                via le formulaire de contact ou de demande de demonstration.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. Utilisation des Donnees
            </h2>
            <p className="mt-2">Vos donnees sont utilisees pour :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Fournir et maintenir le Service.</li>
              <li>
                Gerer votre compte, vos abonnements et l{"'"}authentification.
              </li>
              <li>
                Repondre a vos demandes de contact ou de demonstration.
              </li>
              <li>
                Ameliorer le Service (analyse anonymisee des usages).
              </li>
              <li>
                Envoyer des communications liees au Service (mises a jour,
                maintenance, securite).
              </li>
            </ul>
            <p className="mt-2">
              Nous ne vendons jamais vos donnees a des tiers. Vos donnees
              metier (stocks, commandes, clients) ne sont jamais partagees.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Conservation des Donnees
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Vos donnees sont conservees tant que votre compte est actif.
              </li>
              <li>
                Apres resiliation, les donnees sont conservees 30 jours puis
                supprimees definitivement, sauf obligation legale contraire.
              </li>
              <li>
                Vous pouvez exporter vos donnees a tout moment depuis les
                parametres de votre compte (fonctionnalite de sauvegarde).
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Vos Droits
            </h2>
            <p className="mt-2">
              Conformement a la legislation tunisienne sur la protection des
              donnees personnelles (Loi organique n&deg;2004-63), vous
              disposez des droits suivants :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Droit d{"'"}acces :</strong> consulter les donnees que nous
                detenons sur vous.
              </li>
              <li>
                <strong>Droit de rectification :</strong> corriger des donnees
                inexactes ou incompletes.
              </li>
              <li>
                <strong>Droit de suppression :</strong> demander la suppression
                de votre compte et de vos donnees.
              </li>
              <li>
                <strong>Droit d{"'"}opposition :</strong> vous opposer au
                traitement de vos donnees a des fins non essentielles.
              </li>
              <li>
                <strong>Droit a la portabilite :</strong> exporter vos donnees
                dans un format structuré (CSV/JSON via la fonctionnalite de
                sauvegarde).
              </li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits, contactez-nous a{" "}
              <a
                href="mailto:contact@kifshop.tn"
                className="text-primary hover:underline"
              >
                contact@kifshop.tn
              </a>
              .
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Cookies
            </h2>
            <p className="mt-2">
              KIFSHOP Pastry utilise uniquement des cookies essentiels au
              fonctionnement du Service :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Cookies d{"'"}authentification :</strong> maintenir votre
                session de connexion (Supabase Auth).
              </li>
              <li>
                <strong>Cookies de preferences :</strong> sauvegarder vos
                parametres d{"'"}affichage (theme, langue).
              </li>
            </ul>
            <p className="mt-2">
              Nous n{"'"}utilisons pas de cookies de tracking publicitaire ni de
              cookies tiers a des fins de profilage.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              8. Modifications
            </h2>
            <p className="mt-2">
              Nous pouvons mettre a jour cette politique periodiquement. En cas
              de changement significatif, nous vous en informerons par email ou
              via une notification dans le Service. La date de derniere mise a
              jour est indiquee en haut de ce document.
            </p>
          </section>

          {/* Contact */}
          <section className="rounded-xl border border-border bg-muted/30 p-6">
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p className="mt-2">
              Pour toute question relative a la protection de vos donnees :<br />
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
              <br />
              Adresse : Tunisie
            </p>
          </section>

          {/* Cross link */}
          <p className="text-center text-muted-foreground">
            Voir egalement nos{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Conditions Generales d{"'"}Utilisation
            </Link>
          </p>
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
