"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, ChefHat, Info, Sparkles, ShieldCheck } from "lucide-react"

export default function SignUpPage() {
  const [shopName, setShopName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [businessType, setBusinessType] = useState("atelier")
  const [estimatedDailyOrders, setEstimatedDailyOrders] = useState("0-5")
  const [teamSize, setTeamSize] = useState("1-2")
  const [salesChannels, setSalesChannels] = useState("")
  const [website, setWebsite] = useState("")
  const [acceptedContact, setAcceptedContact] = useState(true)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [honeyPot, setHoneyPot] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caracteres.")
      setLoading(false)
      return
    }

    const normalizedPhone = phone.replace(/\s+/g, "").replace(/[^\d+]/g, "")
    if (normalizedPhone.length < 8) {
      setError("Numero WhatsApp/telephone invalide.")
      setLoading(false)
      return
    }

    if (!acceptedTerms) {
      setError("Vous devez accepter les conditions d'utilisation.")
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
          signup_phone: normalizedPhone,
          signup_city: city,
          signup_business_type: businessType,
          signup_estimated_daily_orders: estimatedDailyOrders,
          signup_team_size: teamSize,
          signup_sales_channels: salesChannels,
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
      try {
        await fetch("/api/platform-prospects/capture-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shopName,
            displayName,
            email,
            phone: normalizedPhone,
            city,
            businessType,
            estimatedDailyOrders,
            teamSize,
            salesChannels,
            acceptedContact,
            website,
            honeyPot,
          }),
        })
      } catch (captureError) {
        console.error("Prospect capture failed:", captureError)
      }
      router.push("/dashboard")
      router.refresh()
      return
    }

    // If email confirmation is required, show success message
    try {
      await fetch("/api/platform-prospects/capture-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName,
          displayName,
          email,
          phone: normalizedPhone,
          city,
          businessType,
          estimatedDailyOrders,
          teamSize,
          salesChannels,
          acceptedContact,
          website,
          honeyPot,
        }),
      })
    } catch (captureError) {
      console.error("Prospect capture failed:", captureError)
    }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <Card className="w-full max-w-sm border-0 shadow-none lg:border lg:shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4A7C59] text-white lg:hidden">
            <ChefHat className="h-6 w-6" />
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
    <Card className="w-full max-w-xl border-0 shadow-none lg:border lg:shadow-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4A7C59] text-white lg:hidden">
          <ChefHat className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold text-balance">Creer un compte</CardTitle>
        <CardDescription>
          Lancez votre patisserie sur KIFSHOP Pastry en quelques minutes.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSignUp}>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <Info className="h-4 w-4 text-[#4A7C59]" />
              Pourquoi ces informations ?
            </div>
            <p className="text-muted-foreground">
              Elles nous permettent de vous accompagner des le debut (configuration rapide,
              conseils adaptes, support prioritaire) et de proteger la plateforme contre les faux comptes.
            </p>
          </div>

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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp / Telephone</Label>
              <Input
                id="phone"
                placeholder="54130433"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                placeholder="Sousse"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Type de business</Label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="atelier">Atelier</SelectItem>
                  <SelectItem value="boutique">Boutique</SelectItem>
                  <SelectItem value="maison">Travail a domicile</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Commandes/jour</Label>
              <Select value={estimatedDailyOrders} onValueChange={setEstimatedDailyOrders}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-5">0-5</SelectItem>
                  <SelectItem value="6-15">6-15</SelectItem>
                  <SelectItem value="16-30">16-30</SelectItem>
                  <SelectItem value="30+">30+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Taille equipe</Label>
              <Select value={teamSize} onValueChange={setTeamSize}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2">1-2</SelectItem>
                  <SelectItem value="3-5">3-5</SelectItem>
                  <SelectItem value="6-10">6-10</SelectItem>
                  <SelectItem value="10+">10+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="salesChannels">Canaux de vente (optionnel)</Label>
            <Textarea
              id="salesChannels"
              placeholder="Instagram, WhatsApp, boutique..."
              value={salesChannels}
              onChange={(e) => setSalesChannels(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Page Facebook / Instagram / Site (optionnel)</Label>
            <Input
              id="website"
              placeholder="https://..."
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
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
              placeholder="8 caracteres minimum"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <input
            type="text"
            name="company_website"
            value={honeyPot}
            onChange={(e) => setHoneyPot(e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={acceptedContact}
              onCheckedChange={(v) => setAcceptedContact(v === true)}
            />
            <span>J&apos;accepte d&apos;etre contacte pour la qualification et la demo KIFSHOP.</span>
          </label>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={acceptedTerms}
              onCheckedChange={(v) => setAcceptedTerms(v === true)}
            />
            <span>
              J&apos;accepte les{" "}
              <Link href="/terms" target="_blank" className="text-primary underline underline-offset-2 hover:no-underline">
                conditions d&apos;utilisation
              </Link>{" "}
              et la{" "}
              <Link href="/privacy" target="_blank" className="text-primary underline underline-offset-2 hover:no-underline">
                politique de confidentialite
              </Link>
              .
            </span>
          </label>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <div className="w-full rounded-lg bg-[#4A7C59]/10 border border-[#4A7C59]/20 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-[#355a41]">
              <Sparkles className="h-4 w-4" />
              Vous etes a 1 etape de digitaliser votre patisserie.
            </p>
            <p className="mt-1 text-[#355a41]/90">
              Creez votre compte maintenant : vous pourrez commencer a suivre vos commandes et votre production des aujourd&apos;hui.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Creer mon compte
          </Button>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Vos donnees restent confidentielles et securisees.
          </p>
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
