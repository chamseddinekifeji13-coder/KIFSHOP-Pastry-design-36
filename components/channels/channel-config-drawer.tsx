"use client"

import { useState, useEffect } from "react"
import { Save, X, MessageCircle, Phone, Globe, Instagram } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { SalesChannel } from "@/lib/mock-data"
import { toast } from "sonner"

const channelIcons: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  phone: Phone,
  web: Globe,
  instagram: Instagram,
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

  useEffect(() => {
    if (channel) {
      setContact(channel.contact)
      setAutoReply(channel.autoReply || "")
      setEnabled(channel.enabled)
    }
  }, [channel])

  const handleSubmit = () => {
    if (!contact.trim()) {
      toast.error("Le contact est obligatoire")
      return
    }
    toast.success("Canal mis a jour", { description: channel?.name })
    onOpenChange(false)
  }

  if (!channel) return null
  const Icon = channelIcons[channel.type]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5" />
            <div>
              <SheetTitle>Configurer {channel.name}</SheetTitle>
              <SheetDescription>Parametres du canal de vente</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <div>
              <p className="text-sm font-medium">{enabled ? "Canal actif" : "Canal desactive"}</p>
              <p className="text-xs text-muted-foreground">
                {enabled ? "Les clients peuvent vous contacter via ce canal" : "Ce canal est desactive"}
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <Label htmlFor="channel-contact">
              {channel.type === "phone" ? "Numero de telephone" :
               channel.type === "whatsapp" ? "Numero WhatsApp Business" :
               channel.type === "messenger" ? "Lien de la page Facebook" :
               channel.type === "instagram" ? "Nom d'utilisateur Instagram" :
               "URL du site web"}
            </Label>
            <Input
              id="channel-contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={
                channel.type === "phone" ? "+216 XX XXX XXX" :
                channel.type === "whatsapp" ? "+216 XX XXX XXX" :
                channel.type === "messenger" ? "fb.com/votre-page" :
                channel.type === "instagram" ? "@votre_compte" :
                "https://kifshop.tn/..."
              }
            />
          </div>

          {/* Auto-reply (for messaging channels) */}
          {(channel.type === "whatsapp" || channel.type === "messenger" || channel.type === "instagram") && (
            <div className="space-y-2">
              <Label htmlFor="channel-autoreply">Message de reponse automatique</Label>
              <Textarea
                id="channel-autoreply"
                value={autoReply}
                onChange={(e) => setAutoReply(e.target.value)}
                rows={4}
                placeholder="Bienvenue! Merci de nous contacter. Notre equipe vous repondra dans les plus brefs delais..."
              />
              <p className="text-xs text-muted-foreground">
                Ce message sera envoye automatiquement a chaque nouveau client
              </p>
            </div>
          )}

          {/* Phone-specific options */}
          {channel.type === "phone" && (
            <div className="space-y-4 rounded-lg border p-4">
              <h4 className="text-sm font-medium">Horaires d'appel</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ouverture</Label>
                  <Input type="time" defaultValue="08:00" />
                </div>
                <div className="space-y-2">
                  <Label>Fermeture</Label>
                  <Input type="time" defaultValue="18:00" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Les appels en dehors de ces horaires seront renvoyes vers la messagerie
              </p>
            </div>
          )}

          {/* WhatsApp-specific quick replies */}
          {channel.type === "whatsapp" && (
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="text-sm font-medium">Reponses rapides WhatsApp</h4>
              <p className="text-xs text-muted-foreground">Messages pre-configures pour repondre rapidement</p>
              <div className="space-y-2">
                {[
                  "Voici notre catalogue: kifshop.tn/masmoudi",
                  "Votre commande est en preparation!",
                  "Votre commande est prete au retrait.",
                  "Livraison prevue aujourd'hui entre 14h-18h.",
                ].map((msg, i) => (
                  <div key={i} className="flex items-center gap-2 rounded bg-muted/50 p-2 text-xs">
                    <span className="flex-1">{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Notifications</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Nouvelle commande</p>
                  <p className="text-xs text-muted-foreground">Notification a chaque nouvelle commande</p>
                </div>
                <Switch checked={notifyOnOrder} onCheckedChange={setNotifyOnOrder} />
              </div>
              {(channel.type === "whatsapp" || channel.type === "messenger") && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Nouveau message</p>
                    <p className="text-xs text-muted-foreground">Notification a chaque nouveau message client</p>
                  </div>
                  <Switch checked={notifyOnMessage} onCheckedChange={setNotifyOnMessage} />
                </div>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
            <X className="mr-2 h-4 w-4" />
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
