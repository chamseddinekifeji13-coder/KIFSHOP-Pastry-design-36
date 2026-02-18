"use client"

import { useState } from "react"
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
import { Loader2, ArrowLeft, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        if (error.message?.includes("rate") || error.status === 429) {
          setError("Trop de tentatives. Veuillez attendre quelques minutes avant de reessayer.")
        } else if (error.message?.includes("not found") || error.message?.includes("User not found")) {
          // Don't reveal if email exists or not for security, show success anyway
          setSuccess(true)
          setLoading(false)
          return
        } else {
          setError(`Erreur: ${error.message || "Veuillez reessayer."}`)
        }
        setLoading(false)
        return
      }
    } catch {
      setError("Erreur de connexion. Verifiez votre connexion internet.")
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
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-balance">
            Verifiez votre email
          </CardTitle>
          <CardDescription>
            Un lien de reinitialisation a ete envoye a{" "}
            <span className="font-medium text-foreground">{email}</span>.
            Cliquez dessus pour definir un nouveau mot de passe.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSuccess(false)
              setEmail("")
            }}
          >
            Renvoyer le lien
          </Button>
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
          Mot de passe oublie
        </CardTitle>
        <CardDescription>
          Entrez votre adresse email pour recevoir un lien de reinitialisation
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleResetRequest}>
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
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Envoyer le lien
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
