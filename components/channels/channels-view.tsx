"use client"

import { useState } from "react"
import {
  MessageCircle,
  Phone,
  Globe,
  Instagram,
  Settings,
  Copy,
  ExternalLink,
  TrendingUp,
  ShoppingCart,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useTenant } from "@/lib/tenant-context"
import { useOrders, useSalesChannels } from "@/hooks/use-tenant-data"
import { toggleSalesChannel, type SalesChannelConfig } from "@/lib/channels/actions"
import { toast } from "sonner"
import { ChannelConfigDrawer } from "./channel-config-drawer"
import { useI18n } from "@/lib/i18n/context"

const channelNames: Record<string, string> = {
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  phone: "Telephone",
  web: "Boutique en ligne",
  instagram: "Instagram",
  tiktok: "TikTok",
}

const channelIcons: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  phone: Phone,
  web: Globe,
  instagram: Instagram,
  tiktok: Globe,
}

const channelColors: Record<string, string> = {
  whatsapp: "bg-green-500",
  messenger: "bg-blue-500",
  phone: "bg-orange-500",
  web: "bg-primary",
  instagram: "bg-pink-500",
  tiktok: "bg-gray-900",
}

const channelDescriptions: Record<string, string> = {
  whatsapp: "Recevez les commandes via WhatsApp Business et repondez automatiquement",
  messenger: "Integrez Facebook Messenger pour recevoir les commandes depuis votre page",
  phone: "Enregistrez les commandes recues par telephone dans le systeme",
  web: "Boutique en ligne integree avec lien partageable",
  instagram: "Recevez les commandes via Instagram DM avec redirection WhatsApp",
  tiktok: "Recevez les commandes via TikTok Shop ou les DMs TikTok",
}

export function ChannelsView() {
  const { t } = useI18n()
  const { currentTenant } = useTenant()
  const { data: orders = [] } = useOrders()
  const { data: channels = [], mutate: mutateChannels } = useSalesChannels()

  const [configChannel, setConfigChannel] = useState<SalesChannelConfig | null>(null)
  const [configOpen, setConfigOpen] = useState(false)

  const getChannelStats = (source: string) => {
    const channelOrders = orders.filter((o: any) => o.source === source)
    return {
      orderCount: channelOrders.length,
      revenue: channelOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0),
    }
  }

  const totalOnlineOrders = orders.filter((o: any) => o.source !== "comptoir").length
  const totalOnlineRevenue = orders.filter((o: any) => o.source !== "comptoir").reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0)
  const activeChannels = channels.filter(c => c.enabled).length

  const ordersBySource = orders.reduce((acc: Record<string, number>, order: any) => {
    acc[order.source] = (acc[order.source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const handleToggleChannel = async (channel: SalesChannelConfig) => {
    const newEnabled = !channel.enabled
    // Optimistic update
    mutateChannels(
      channels.map(c => c.channelType === channel.channelType ? { ...c, enabled: newEnabled } : c),
      false
    )
    try {
      await toggleSalesChannel(currentTenant.id, channel.channelType, newEnabled)
      mutateChannels()
      toast.success(newEnabled ? "Canal active" : "Canal desactive", {
        description: channelNames[channel.channelType],
      })
    } catch {
      mutateChannels() // Revert
      toast.error("Erreur lors de la mise a jour")
    }
  }

  const handleCopyAutoReply = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Message copie dans le presse-papier")
    }).catch(() => {
      toast.info("Message de reponse automatique", { description: text })
    })
  }

  const handleConfigure = (channel: SalesChannelConfig) => {
    setConfigChannel(channel)
    setConfigOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("channels.title")}</h1>
        <p className="text-muted-foreground">
        {t("channels.subtitle")}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeChannels}/{channels.length}</p>
                <p className="text-xs text-muted-foreground">{t("channels.active_channels")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/30">
                <ShoppingCart className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOnlineOrders}</p>
                <p className="text-xs text-muted-foreground">Commandes en ligne</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10">
                <TrendingUp className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOnlineRevenue.toLocaleString("fr-TN")} TND</p>
                <p className="text-xs text-muted-foreground">Revenu total en ligne</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channels Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {channels.map(channel => {
          const Icon = channelIcons[channel.channelType] || Globe
          const stats = getChannelStats(channel.channelType)
          const recentOrders = ordersBySource[channel.channelType] || 0
          const name = channelNames[channel.channelType] || channel.channelType

          return (
            <Card key={channel.channelType} className={!channel.enabled ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${channelColors[channel.channelType]} text-card`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{name}</CardTitle>
                      <CardDescription className="text-xs">{channel.contact || ""}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={channel.enabled}
                    onCheckedChange={() => handleToggleChannel(channel)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{channelDescriptions[channel.channelType]}</p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3">
                  <div className="text-center">
                    <p className="text-lg font-bold">{stats.orderCount}</p>
                    <p className="text-[10px] text-muted-foreground">Commandes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{stats.revenue.toLocaleString("fr-TN")}</p>
                    <p className="text-[10px] text-muted-foreground">TND revenu</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{recentOrders}</p>
                    <p className="text-[10px] text-muted-foreground">En cours</p>
                  </div>
                </div>

                {/* Auto-reply preview */}
                {channel.autoReply && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Reponse automatique</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyAutoReply(channel.autoReply)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs leading-relaxed italic">
                      &quot;{channel.autoReply}&quot;
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => handleConfigure(channel)}
                  >
                    <Settings className="mr-2 h-3.5 w-3.5" />
                    Configurer
                  </Button>
                  {(channel.channelType === "whatsapp" || channel.channelType === "messenger") && channel.contact && (
                    <Button variant="outline" size="sm" className="bg-transparent" asChild>
                      <a
                        href={channel.channelType === "whatsapp"
                          ? `https://wa.me/${channel.contact.replace(/\s+/g, "")}`
                          : channel.contact}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        Ouvrir
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Order Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guide rapide : Enregistrer une commande</CardTitle>
          <CardDescription>
            Comment transformer un message ou appel en commande dans KIFSHOP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
              <div>
                <p className="text-sm font-medium">Recevoir la demande</p>
                <p className="text-xs text-muted-foreground">Le client vous contacte par telephone, WhatsApp ou Messenger</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
              <div>
                <p className="text-sm font-medium">Creer la commande</p>
                <p className="text-xs text-muted-foreground">Allez dans Commandes, cliquez &quot;Nouvelle commande&quot; et selectionnez la source</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
              <div>
                <p className="text-sm font-medium">Suivre et livrer</p>
                <p className="text-xs text-muted-foreground">Suivez le statut de la commande et organisez la livraison</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ChannelConfigDrawer
        channel={configChannel}
        open={configOpen}
        onOpenChange={setConfigOpen}
        onSaved={() => mutateChannels()}
      />
    </div>
  )
}
