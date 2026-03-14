"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ChefHat, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message === "Email not confirmed") {
          setError("Votre email n'est pas encore confirme. Verifiez votre boite de reception (et les spams) pour le lien de confirmation.")
        } else if (error.message === "Invalid login credentials") {
          setError("Email ou mot de passe incorrect.")
        } else if (error.message.includes("unexpected")) {
          setError("Erreur de connexion au serveur. Veuillez reessayer dans quelques instants.")
        } else {
          setError(error.message)
        }
        setLoading(false)
        return
      }

      if (!data?.user) {
        setError("Erreur inattendue : aucune donnee utilisateur recue.")
        setLoading(false)
        return
      }

      // Redirect super admins to their dashboard
      const isSuperAdmin = data.user?.user_metadata?.is_super_admin === true
      router.push(isSuperAdmin ? "/super-admin" : "/dashboard")
      router.refresh()
    } catch (err) {
      setError("Impossible de contacter le serveur. Verifiez votre connexion internet et reessayez.")
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* Mobile header */}
      <div className="flex flex-col items-center mb-8 lg:hidden">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-secondary shadow-lg shadow-primary/20 mb-4">
          <ChefHat className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          KIFSHOP <span className="font-normal text-primary">Pastry</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Gestion Patisserie Pro</p>
      </div>

      {/* Desktop header */}
      <div className="hidden lg:block mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Bienvenue</h2>
        <p className="text-muted-foreground">
          Connectez-vous pour acceder a votre espace de gestion
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 mb-6">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Login form */}
      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Adresse email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="pl-10 h-12 rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </Label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Mot de passe oublie ?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pl-10 h-12 rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30" 
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Connexion...
            </>
          ) : (
            <>
              Se connecter
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </form>

      {/* Footer links */}
      <div className="mt-8 space-y-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground">ou</span>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link 
            href="/auth/sign-up" 
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Creer un compte
          </Link>
        </p>

        <Link
          href="/"
          className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Retour a la page d{"'"}accueil
        </Link>
      </div>
    </div>
  )
}
