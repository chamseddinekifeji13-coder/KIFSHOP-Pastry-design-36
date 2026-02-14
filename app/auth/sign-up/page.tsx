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
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${window.location.origin}/dashboard`,
        data: {
          display_name: displayName,
          shop_name: shopName,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // If email confirmation is not required, create tenant immediately
    if (data.session) {
      try {
        // Create the tenant
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .insert({
            name: shopName,
            slug: shopName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
            primary_color: "#4A7C59",
            subscription_plan: "free",
          })
          .select("id")
          .single()

        if (tenantError) throw tenantError

        // Link user to tenant
        const { error: linkError } = await supabase.from("tenant_users").insert({
          tenant_id: tenant.id,
          user_id: data.user!.id,
          role: "owner",
          display_name: displayName,
        })

        if (linkError) throw linkError

        router.push("/dashboard")
        router.refresh()
        return
      } catch (err) {
        console.error("Setup error:", err)
        setError("Compte cree mais erreur lors de la configuration. Veuillez vous reconnecter.")
        setLoading(false)
        return
      }
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
          Inscrivez votre patisserie sur KIFSHOP
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
              placeholder="gerant@kifshop.tn"
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
