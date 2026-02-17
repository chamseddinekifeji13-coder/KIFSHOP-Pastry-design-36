"use client"

import { useState, useEffect } from "react"
import { Save, MessageCircle, Phone, Globe, Instagram, Bell, Clock, Zap, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
interface SalesChannel {
  id: string; name: string; type: string; isActive: boolean; orderCount: number
  config?: Record<string, string>
  enabled?: boolean; contact?: string; ordersCount?: number; revenue?: number; autoReply?: string
}
import { toast } from "sonner"

const channelIcons: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  phone: Phone,
  web: Globe,
  instagram: Instagram,
  tiktok: Globe,
}

const channelColors: Record<string, { bg: string; icon: string; accent: string; border: string }> = {
  whatsapp: { bg: "from-green-50 to-emerald-50", icon: "bg-green-100 text-green-600", accent: "bg-green-600 hover:bg-green-700", border: "border-green-100" },
  messenger: { bg: "from-blue-50 to-indigo-50", icon: "bg-blue-100 text-blue-600", accent: "bg-blue-600 hover:bg-blue-700", border: "border-blue-100" },
  phone: { bg: "from-amber-50 to-orange-50", icon: "bg-amber-100 text-amber-600", accent: "bg-amber-600 hover:bg-amber-700", border: "border-amber-100" },
  web: { bg: "from-cyan-50 to-teal-50", icon: "bg-cyan-100 text-cyan-600", accent: "bg-cyan-600 hover:bg-cyan-700", border: "border-cyan-100" },
  instagram: { bg: "from-pink-50 to-rose-50", icon: "bg-pink-100 text-pink-600", accent: "bg-pink-600 hover:bg-pink-700", border: "border-pink-100" },
  tiktok: { bg: "from-gray-50 to-slate-50", icon: "bg-gray-100 text-gray-800", accent: "bg-gray-800 hover:bg-gray-900", border: "border-gray-100" },
}

interface ChannelConfigDrawerProps {
  channel: SalesChannel | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChannelConfigDrawer({ channel, open, onOpenChange }: ChannelConfigDrawerProps) {
  const [contact, setContact] = useState("")
  const [autoReply, setAutoReply] = useState("")
  const [enabled, setEnabled] = useState(false)
  const [notifyOnOrder, setNotifyOnOrder] = useState(true)
  const [notifyOnMessage, setNotifyOnMessage] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (channel) {
      setContact(channel.contact || "")
      setAutoReply(channel.autoReply || "")
      setEnabled(channel.enabled ?? channel.isActive ?? false)
    }
  }, [channel])

  const handleSubmit = async () => {
    if (!contact.trim()) {
      toast.error("Le contact est obligatoire")
      return
    }
    setIsSubmitting(true)
    await new Promise((r) => setTimeout(r, 500))
    toast.success("Canal mis a jour", { description: channel?.name })
    onOpenChange(false)
    setIsSubmitting(false)
  }

  if (!channel) return null

  const Icon = channelIcons[channel.type] || Globe
  const colors = channelColors[channel.type] || channelColors.web

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header Banner */}
        <div className={`bg-gradient-to-br ${colors.bg} border-b px-6 pt-6 pb-5`}>
          <SheetHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.icon} shadow-sm`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-lg">{channel.name}</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">
                  Configuration du canal de vente
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Enable/Disable Toggle */}
          <div className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${enabled ? `${colors.border} bg-muted/30` : "border-border"}`}>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <div className="flex-1">
              <p className="text-sm font-medium">{enabled ? "Canal actif" : "Canal desactive"}</p>
              <p className="text-xs text-muted-foreground">
                {enabled ? "Les clients peuvent vous contacter via ce canal" : "Ce canal est actuellement desactive"}
              </p>
            </div>
            <div className={`h-2.5 w-2.5 rounded-full ${enabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"}`} />
          </div>

          {/* Contact Info */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              Coordonnees
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {channel.type === "phone" ? "Numero de telephone" :
                 channel.type === "whatsapp" ? "Numero WhatsApp Business" :
                 channel.type === "messenger" ? "Lien de la page Facebook" :
                 channel.type === "instagram" ? "Nom d'utilisateur Instagram" :
                 channel.type === "tiktok" ? "Nom d'utilisateur TikTok" :
                 "URL du site web"}
              </Label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="pl-10 transition-all focus:ring-2 focus:ring-primary/20"
                  placeholder={
                    channel.type === "phone" ? "+216 XX XXX XXX" :
                    channel.type === "whatsapp" ? "+216 XX XXX XXX" :
                    channel.type === "messenger" ? "fb.com/votre-page" :
                    channel.type === "instagram" ? "@votre_compte" :
                    channel.type === "tiktok" ? "@votre_tiktok" :
                    "https://votre-site.com"
                  }
                />
              </div>
            </div>
          </div>

          {/* Auto-reply for messaging channels */}
          {(channel.type === "whatsapp" || channel.type === "messenger" || channel.type === "instagram" || channel.type === "tiktok") && (
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Zap className="h-4 w-4 text-amber-500" />
                Reponse automatique
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Message envoye automatiquement</Label>
                <Textarea
                  value={autoReply}
                  onChange={(e) => setAutoReply(e.target.value)}
                  rows={3}
                  placeholder="Bienvenue! Merci de nous contacter. Notre equipe vous repondra dans les plus brefs delais..."
                  className="resize-none transition-all focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[11px] text-muted-foreground">
                  Ce message sera envoye a chaque nouveau client qui vous contacte
                </p>
              </div>
            </div>
          )}

          {/* Phone-specific: call hours */}
          {channel.type === "phone" && (
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4 text-amber-500" />
                Horaires d{"'"}appel
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Ouverture</Label>
                  <Input type="time" defaultValue="08:00" className="transition-all focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Fermeture</Label>
                  <Input type="time" defaultValue="18:00" className="transition-all focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Les appels en dehors de ces horaires seront renvoyes vers la messagerie
              </p>
            </div>
          )}

          {/* WhatsApp quick replies */}
          {channel.type === "whatsapp" && (
            <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <MessageCircle className="h-4 w-4 text-green-500" />
                Reponses rapides
              </div>
              <p className="text-[11px] text-muted-foreground">Messages pre-configures pour gagner du temps</p>
              <div className="space-y-2">
                {[
                  "Voici notre catalogue: consultez notre site!",
                  "Votre commande est en preparation!",
                  "Votre commande est prete au retrait.",
                  "Livraison prevue aujourd'hui entre 14h-18h.",
                ].map((msg, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border/50 p-2.5 text-xs transition-colors hover:bg-muted">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                    <span className="flex-1">{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Bell className="h-4 w-4 text-blue-500" />
              Notifications
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/30 p-3">
                <div>
                  <p className="text-sm font-medium">Nouvelle commande</p>
                  <p className="text-[11px] text-muted-foreground">Alerte a chaque nouvelle commande recue</p>
                </div>
                <Switch checked={notifyOnOrder} onCheckedChange={setNotifyOnOrder} />
              </div>
              {(channel.type === "whatsapp" || channel.type === "messenger") && (
                <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/30 p-3">
                  <div>
                    <p className="text-sm font-medium">Nouveau message</p>
                    <p className="text-[11px] text-muted-foreground">Alerte a chaque message client recu</p>
                  </div>
                  <Switch checked={notifyOnMessage} onCheckedChange={setNotifyOnMessage} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur-sm p-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            className={`flex-1 ${colors.accent} text-white`}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Enregistrement...
              </span>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
