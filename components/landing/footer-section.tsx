import Link from "next/link"
import { ChefHat } from "lucide-react"

export function FooterSection() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-background shadow-lg shadow-primary/30">
                <ChefHat className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-foreground">KIFSHOP <span className="font-normal text-primary">Pastry</span></span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Solution de gestion tout-en-un pour patisseries, boulangeries et laboratoires en Tunisie.
              Stocks, production, commandes, facturation et tresorerie.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Produit</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="#features" className="transition-colors hover:text-primary">Fonctionnalites</Link></li>
              <li><Link href="#pricing" className="transition-colors hover:text-primary">Tarifs</Link></li>
              <li><Link href="#download" className="transition-colors hover:text-primary">Telechargement</Link></li>
              <li><Link href="/auth/sign-up?fresh=1" className="transition-colors hover:text-primary">Essai gratuit</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Ressources</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/auth/login" className="transition-colors hover:text-primary">Connexion</Link></li>
              <li><Link href="/auth/sign-up?fresh=1" className="transition-colors hover:text-primary">Creer un compte</Link></li>
              <li><Link href="#contact" className="transition-colors hover:text-primary">Nous contacter</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>contact@kifshop.tn</li>
              <li><a href="tel:+21625122212" className="transition-colors hover:text-primary">+216 25 12 22 12</a></li>
              <li>Tunisie</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} KIFSHOP Pastry. Tous droits reserves.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="transition-colors hover:text-primary">Conditions</Link>
            <Link href="/privacy" className="transition-colors hover:text-primary">Confidentialite</Link>
            <span>Concu en Tunisie avec passion</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
