"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, ChefHat } from "lucide-react"

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
    <Card className="w-full max-w-sm border-0 shadow-none lg:border lg:shadow-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4A7C59] text-white lg:hidden">
          <ChefHat className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold text-balance">KIFSHOP <span className="font-normal text-[#4A7C59]">Pastry</span></CardTitle>
        <CardDescription>
          Connectez-vous a votre espace de gestion
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
              >
                Mot de passe oublie ?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Se connecter
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {"Pas encore de compte ? "}
            <Link href="/auth/sign-up" className="text-primary underline-offset-4 hover:underline">
              Creer un compte
            </Link>
          </p>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
          >
            Retour a la page d{"'"}accueil
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}
