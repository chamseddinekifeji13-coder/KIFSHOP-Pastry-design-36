"use client"

import { useState, useEffect } from "react"
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
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  // Handle PKCE code exchange, hash fragment tokens, or existing session
  useEffect(() => {
    const supabase = createClient()

    async function checkSession() {
      console.log("[v0] Reset page - URL:", window.location.href)
      console.log("[v0] Reset page - hash:", window.location.hash)
      console.log("[v0] Reset page - search:", window.location.search)

      // 1. Handle PKCE flow: exchange code from URL query params
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get("code")
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (!exchangeError) {
          // Clean up the URL (remove the code param)
          window.history.replaceState({}, "", "/auth/reset-password")
          setSessionReady(true)
          setChecking(false)
          return
        }
      }

      // 2. Handle implicit flow: hash fragment with access_token
      const hash = window.location.hash
      if (hash && hash.includes("access_token")) {
        // Supabase JS client auto-detects hash tokens on init
        await new Promise((r) => setTimeout(r, 1000))
      }

      // 3. Check if we already have a session (from any flow)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessionReady(true)
      } else {
        setError("Session expiree ou lien invalide. Veuillez redemander un lien de reinitialisation.")
      }
      setChecking(false)
    }

    checkSession()
  }, [])

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caracteres.")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setError("Impossible de mettre a jour le mot de passe. Le lien a peut-etre expire.")
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-success text-success-foreground">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-balance">
            Mot de passe modifie
          </CardTitle>
          <CardDescription>
            Votre mot de passe a ete reinitialise avec succes. Vous pouvez maintenant vous connecter.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => {
              router.push("/dashboard")
              router.refresh()
            }}
          >
            Acceder au tableau de bord
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (checking) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Verification de votre session...</p>
        </CardContent>
      </Card>
    )
  }

  if (!sessionReady && error) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <ArrowLeft className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-balance">
            Lien invalide
          </CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3">
          <Link href="/auth/forgot-password" className="w-full">
            <Button className="w-full">Redemander un lien</Button>
          </Link>
          <Link href="/auth/login" className="w-full">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
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
        <CardTitle className="text-xl font-bold text-balance">
          Nouveau mot de passe
        </CardTitle>
        <CardDescription>
          Choisissez un nouveau mot de passe pour votre compte
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleResetPassword}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
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
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Retapez votre mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reinitialiser le mot de passe
          </Button>
          <Link href="/auth/login" className="w-full">
            <Button variant="ghost" className="w-full" type="button">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour a la connexion
            </Button>
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}
