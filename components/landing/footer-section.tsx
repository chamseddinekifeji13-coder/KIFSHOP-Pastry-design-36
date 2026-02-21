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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4A7C59] text-white">
                <ChefHat className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-foreground">KIFSHOP</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Logiciel de gestion complet pour patisseries et boulangeries en Tunisie.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Produit</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="#features" className="transition-colors hover:text-foreground">Fonctionnalites</Link></li>
              <li><Link href="#download" className="transition-colors hover:text-foreground">Telechargement</Link></li>
              <li><Link href="/auth/sign-up" className="transition-colors hover:text-foreground">Essai gratuit</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Ressources</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="#install-guide" className="transition-colors hover:text-foreground">Guide d{"'"}installation</Link></li>
              <li><Link href="/auth/login" className="transition-colors hover:text-foreground">Connexion</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>contact@kifshop.tn</li>
              <li>+216 XX XXX XXX</li>
              <li>Tunisie</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} KIFSHOP. Tous droits reserves.</p>
          <p>Concu en Tunisie avec passion</p>
        </div>
      </div>
    </footer>
  )
}
