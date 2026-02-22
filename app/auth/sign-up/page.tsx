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
import { Loader2 } from "lucide-react"

export default function SignUpPage() {
  const [shopName, setShopName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caracteres.")
      setLoading(false)
      return
    }

    const supabase = createClient()

    // Pass tenant_name + display_name via metadata
    // The database trigger (handle_new_user) will create both the tenant and tenant_users row
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        data: {
          tenant_name: shopName,
          display_name: displayName,
          role: "owner",
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Supabase returns a fake user with no identities for repeated signups
    // This means the email is already registered
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("Cet email est deja utilise. Connectez-vous ou utilisez un autre email.")
      setLoading(false)
      return
    }

    // If email confirmation is not required (auto-confirmed), redirect directly
    if (data.session) {
      router.push("/dashboard")
      router.refresh()
      return
    }

    // If email confirmation is required, show success message
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            K
          </div>
          <CardTitle className="text-xl font-bold text-balance">Verifiez votre email</CardTitle>
          <CardDescription>
            Un lien de confirmation a ete envoye a <span className="font-medium text-foreground">{email}</span>. Cliquez dessus pour activer votre compte.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/auth/login" className="w-full">
            <Button variant="outline" className="w-full">
              Retour a la connexion
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
          K
        </div>
        <CardTitle className="text-xl font-bold text-balance">Creer un compte</CardTitle>
        <CardDescription>
          Inscrivez votre patisserie sur KIFSHOP Pastry
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSignUp}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="shopName">Nom de la patisserie</Label>
            <Input
              id="shopName"
              placeholder="Ma Patisserie"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Votre nom</Label>
            <Input
              id="displayName"
              placeholder="Ahmed Ben Ali"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
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
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="6 caracteres minimum"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Creer mon compte
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {"Deja inscrit ? "}
            <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
