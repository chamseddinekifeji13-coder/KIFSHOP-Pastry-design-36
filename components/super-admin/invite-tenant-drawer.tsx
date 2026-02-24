"use client"

import { useState, useCallback } from "react"
import {
  Loader2,
  Send,
  MapPin,
  Mail,
  Building2,
  Calendar,
  Link2,
  Copy,
  Check,
  Facebook,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createTenantInvite } from "@/lib/super-admin/actions"
import { toast } from "sonner"

interface InviteTenantDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const TUNISIAN_CITIES = [
  "Tunis", "Sousse", "Sfax", "Nabeul", "Monastir",
  "Bizerte", "Gabes", "Kairouan", "Ariana", "Ben Arous",
  "Manouba", "Mahdia", "Hammamet", "La Marsa", "Sidi Bou Said",
]

export function InviteTenantDrawer({
  open,
  onOpenChange,
  onSuccess,
}: InviteTenantDrawerProps) {
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [city, setCity] = useState("")
  const [trialDays, setTrialDays] = useState("14")

  // Post-invite state
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function resetForm() {
    setName("")
    setEmail("")
    setCity("")
    setTrialDays("14")
    setInviteLink(null)
    setCopied(false)
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Veuillez entrer le nom de la patisserie")
      return
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Veuillez entrer une adresse email valide")
      return
    }

    setSubmitting(true)
    const { data, error } = await createTenantInvite({
      name: name.trim(),
      email: email.trim(),
      city: city || undefined,
      trial_days: parseInt(trialDays),
    })
    setSubmitting(false)

    if (error || !data) {
      toast.error("Erreur lors de la creation de l'invitation", {
        description: error || "Veuillez reessayer",
      })
      return
    }

    const link = `${window.location.origin}/invite/${data.token}`
    setInviteLink(link)

    toast.success("Invitation creee avec succes", {
      description: `Lien d'invitation genere pour ${data.tenant_name}`,
    })

    onSuccess?.()
  }

  const handleCopy = useCallback(async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast.success("Lien copie dans le presse-papiers")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Impossible de copier le lien")
    }
  }, [inviteLink])

  function shareVia(channel: "whatsapp" | "facebook" | "messenger" | "email") {
    if (!inviteLink) return
    const text = encodeURIComponent(
      `Bienvenue sur KIFSHOP ! Votre patisserie "${name}" a ete invitee. Inscrivez-vous ici : ${inviteLink}`
    )
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}&quote=${text}`,
      messenger: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(inviteLink)}&redirect_uri=${encodeURIComponent(window.location.href)}`,
      email: `mailto:${email}?subject=${encodeURIComponent("Invitation KIFSHOP - " + name)}&body=${text}`,
    }
    window.open(urls[channel], "_blank", "noopener,noreferrer")
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Inviter une patisserie
              </h2>
              <p className="text-xs text-muted-foreground">
                Envoyez un lien d{"'"}inscription avec essai gratuit
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {!inviteLink ? (
            <>
              {/* Form */}
              <Card className="rounded-xl border shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Nom de la patisserie *
                    </Label>
                    <Input
                      placeholder="Ex: Patisserie El-Felah"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Adresse email *
                    </Label>
                    <Input
                      type="email"
                      placeholder="contact@patisserie.tn"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      Ville
                    </Label>
                    <Select value={city} onValueChange={setCity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner une ville" />
                      </SelectTrigger>
                      <SelectContent>
                        {TUNISIAN_CITIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Duree de l{"'"}essai gratuit
                    </Label>
                    <Select value={trialDays} onValueChange={setTrialDays}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 jours</SelectItem>
                        <SelectItem value="14">14 jours</SelectItem>
                        <SelectItem value="21">21 jours</SelectItem>
                        <SelectItem value="30">30 jours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Success - share panel */}
              <Card className="rounded-xl border border-primary/20 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Invitation creee
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {name} - {trialDays} jours d{"'"}essai
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="ml-auto border-primary/30 bg-primary/5 text-primary text-[10px]"
                    >
                      En attente
                    </Badge>
                  </div>

                  <Separator />

                  {/* Copy link */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Lien d{"'"}invitation
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={inviteLink}
                        className="text-xs font-mono bg-muted/50"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        <span className="sr-only">Copier le lien</span>
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Share buttons */}
                  <div className="space-y-2">
                    <Label className="text-xs">Partager via</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="h-10 text-xs gap-2"
                        onClick={() => shareVia("whatsapp")}
                      >
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        className="h-10 text-xs gap-2"
                        onClick={() => shareVia("facebook")}
                      >
                        <Facebook className="h-4 w-4 text-blue-600" />
                        Facebook
                      </Button>
                      <Button
                        variant="outline"
                        className="h-10 text-xs gap-2"
                        onClick={() => shareVia("messenger")}
                      >
                        <MessageCircle className="h-4 w-4 text-blue-500" />
                        Messenger
                      </Button>
                      <Button
                        variant="outline"
                        className="h-10 text-xs gap-2"
                        onClick={() => shareVia("email")}
                      >
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Email
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t p-4">
          {!inviteLink ? (
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Generer l{"'"}invitation
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                resetForm()
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              Nouvelle invitation
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
