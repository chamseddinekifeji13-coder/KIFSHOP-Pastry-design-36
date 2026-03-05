"use client"

import { useState, useMemo } from "react"
import {
  Megaphone, Send, Users, Star, AlertTriangle, Filter,
  MessageCircle, Phone, CheckCircle2, Loader2, Copy, X,
  Hash, TrendingUp, ChevronDown, Ban, User,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useTenant } from "@/lib/tenant-context"
import { useClients } from "@/hooks/use-tenant-data"
import { type Client } from "@/lib/clients/actions"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n/context"

type Channel = "whatsapp" | "sms"

const statusFilter: Record<string, { label: string; color: string }> = {
  all: { label: "Tous", color: "bg-muted" },
  normal: { label: "Normal", color: "bg-muted" },
  vip: { label: "VIP", color: "bg-emerald-100 text-emerald-700" },
  warning: { label: "Attention", color: "bg-amber-100 text-amber-700" },
}

export function CampaignsView() {
  const { t } = useI18n()
  const { data: clients = [], isLoading } = useClients()
  const [step, setStep] = useState<"audience" | "compose" | "preview">("audience")

  // Audience filters
  const [targetStatus, setTargetStatus] = useState<string>("all")
  const [minOrders, setMinOrders] = useState<string>("")
  const [minSpent, setMinSpent] = useState<string>("")
  const [maxReturns, setMaxReturns] = useState<string>("")
  const [excludeBlacklisted, setExcludeBlacklisted] = useState(true)

  // Compose
  const [channel, setChannel] = useState<Channel>("whatsapp")
  const [message, setMessage] = useState("")
  const [campaignName, setCampaignName] = useState("")

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Filter audience
  const audience = useMemo(() => {
    return clients.filter((c) => {
      if (excludeBlacklisted && c.status === "blacklisted") return false
      if (targetStatus !== "all" && c.status !== targetStatus) return false
      if (minOrders && c.totalOrders < parseInt(minOrders)) return false
      if (minSpent && c.totalSpent < parseFloat(minSpent)) return false
      if (maxReturns && c.returnCount > parseInt(maxReturns)) return false
      return true
    })
  }, [clients, targetStatus, minOrders, minSpent, maxReturns, excludeBlacklisted])

  // Template variables
  const processedMessage = (client: Client) => {
    return message
      .replace(/\{nom\}/g, client.name || "Cher(e) client(e)")
      .replace(/\{telephone\}/g, client.phone)
      .replace(/\{total_commandes\}/g, String(client.totalOrders))
      .replace(/\{total_depense\}/g, client.totalSpent.toFixed(0))
  }

  const handleCopyNumbers = () => {
    const numbers = audience.map((c) => c.phone).join("\n")
    navigator.clipboard.writeText(numbers)
    toast.success(`${audience.length} numeros copies dans le presse-papiers`)
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message)
    toast.success("Message copie dans le presse-papiers")
  }

  const handleSendCampaign = async () => {
    setSending(true)
    // Simulate sending (in production, integrate with WhatsApp Business API or SMS gateway)
    await new Promise((r) => setTimeout(r, 2000))
    setSending(false)
    setSent(true)
    toast.success(`Campagne "${campaignName}" envoyee a ${audience.length} clients via ${channel === "whatsapp" ? "WhatsApp" : "SMS"}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campagnes Promotionnelles</h1>
          <p className="text-muted-foreground">
            Creez et envoyez des messages a vos clients
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {["audience", "compose", "preview"].map((s, i) => {
          const labels = { audience: "1. Audience", compose: "2. Message", preview: "3. Apercu" }
          const isActive = s === step
          const isDone = (s === "audience" && (step === "compose" || step === "preview")) ||
            (s === "compose" && step === "preview")
          return (
            <button
              key={s}
              onClick={() => setStep(s as typeof step)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-primary text-primary-foreground" :
                isDone ? "bg-primary/10 text-primary" :
                "bg-muted text-muted-foreground"
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                isActive ? "bg-primary-foreground/20 text-primary-foreground" :
                isDone ? "bg-primary text-primary-foreground" :
                "bg-muted-foreground/20 text-muted-foreground"
              }`}>
                {isDone ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{labels[s as keyof typeof labels]}</span>
            </button>
          )
        })}
      </div>

      {/* Step 1: Audience */}
      {step === "audience" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtrer l'audience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Statut client</Label>
                    <Select value={targetStatus} onValueChange={setTargetStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="vip">VIP uniquement</SelectItem>
                        <SelectItem value="warning">Attention</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Min. commandes</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 3"
                      value={minOrders}
                      onChange={(e) => setMinOrders(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Min. depense (TND)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 100"
                      value={minSpent}
                      onChange={(e) => setMinSpent(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max. retours</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 1"
                      value={maxReturns}
                      onChange={(e) => setMaxReturns(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="exclude-blacklisted"
                    checked={excludeBlacklisted}
                    onCheckedChange={(v) => setExcludeBlacklisted(v === true)}
                  />
                  <label htmlFor="exclude-blacklisted" className="text-sm">
                    Exclure les clients blacklistes
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Audience preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Audience selectionnee ({audience.length})
                  </span>
                  <Button variant="outline" size="sm" onClick={handleCopyNumbers} disabled={audience.length === 0}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copier numeros
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {audience.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun client correspond aux filtres</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1.5">
                    {audience.slice(0, 50).map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm truncate">{c.name || "Sans nom"}</span>
                          <Badge variant="secondary" className={`text-[10px] px-1 py-0 ${
                            c.status === "vip" ? "bg-emerald-100 text-emerald-700" :
                            c.status === "warning" ? "bg-amber-100 text-amber-700" : ""
                          }`}>
                            {c.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{c.phone}</span>
                      </div>
                    ))}
                    {audience.length > 50 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        + {audience.length - 50} autres clients
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto mb-3">
                    <Megaphone className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">{audience.length}</p>
                  <p className="text-sm text-muted-foreground">clients cibles</p>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VIP</span>
                    <span className="font-medium">{audience.filter(c => c.status === "vip").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Normal</span>
                    <span className="font-medium">{audience.filter(c => c.status === "normal").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CA moyen</span>
                    <span className="font-medium">
                      {audience.length > 0
                        ? (audience.reduce((s, c) => s + c.totalSpent, 0) / audience.length).toFixed(0)
                        : 0} TND
                    </span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => setStep("compose")}
                  disabled={audience.length === 0}
                >
                  Etape suivante
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 2: Compose */}
      {step === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Rediger le message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Nom de la campagne</Label>
                <Input
                  placeholder="Ex: Promo Ramadan 2026"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Canal</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Message</Label>
                <Textarea
                  placeholder={"Bonjour {nom},\n\nNous avons une offre speciale pour vous...\n\nKIFSHOP"}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <p className="text-[10px] text-muted-foreground w-full mb-1">Variables disponibles :</p>
                  {["{nom}", "{telephone}", "{total_commandes}", "{total_depense}"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setMessage((m) => m + " " + v)}
                      className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted-foreground/10 text-muted-foreground font-mono"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("audience")}>Retour</Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep("preview")}
                  disabled={!message.trim() || !campaignName.trim()}
                >
                  Apercu
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Apercu en direct</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`rounded-xl p-4 ${channel === "whatsapp" ? "bg-emerald-50 border border-emerald-200" : "bg-blue-50 border border-blue-200"}`}>
                <div className="flex items-center gap-2 mb-3">
                  {channel === "whatsapp" ? (
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Phone className="h-4 w-4 text-blue-600" />
                  )}
                  <span className="text-xs font-semibold text-muted-foreground">
                    {channel === "whatsapp" ? "WhatsApp" : "SMS"}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {audience.length > 0 ? processedMessage(audience[0]) : message || "Votre message apparaitra ici..."}
                </p>
              </div>
              {audience.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Apercu pour: {audience[0].name || audience[0].phone}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Preview & Send */}
      {step === "preview" && (
        <Card>
          <CardContent className="pt-6">
            {sent ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-xl font-bold">Campagne envoyee !</p>
                <p className="text-muted-foreground mt-1">
                  "{campaignName}" envoyee a {audience.length} clients via {channel === "whatsapp" ? "WhatsApp" : "SMS"}
                </p>
                <Button className="mt-6" onClick={() => { setSent(false); setStep("audience"); setMessage(""); setCampaignName("") }}>
                  Nouvelle campagne
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-lg font-bold">Recapitulatif de la campagne</p>
                  <p className="text-sm text-muted-foreground">Verifiez avant d'envoyer</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-xl border p-3 text-center">
                    <p className="text-2xl font-bold">{audience.length}</p>
                    <p className="text-xs text-muted-foreground">Destinataires</p>
                  </div>
                  <div className="rounded-xl border p-3 text-center">
                    <p className="text-2xl font-bold capitalize">{channel}</p>
                    <p className="text-xs text-muted-foreground">Canal</p>
                  </div>
                  <div className="rounded-xl border p-3 text-center">
                    <p className="text-2xl font-bold">{message.length}</p>
                    <p className="text-xs text-muted-foreground">Caracteres</p>
                  </div>
                  <div className="rounded-xl border p-3 text-center">
                    <p className="text-2xl font-bold truncate">{campaignName}</p>
                    <p className="text-xs text-muted-foreground">Campagne</p>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Message</p>
                  <p className="text-sm whitespace-pre-wrap">{message}</p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("compose")}>Modifier</Button>
                  <Button variant="outline" onClick={handleCopyMessage}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copier message
                  </Button>
                  <Button variant="outline" onClick={handleCopyNumbers}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copier numeros
                  </Button>
                  <Button className="flex-1" onClick={handleSendCampaign} disabled={sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Envoyer la campagne
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
