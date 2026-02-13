"use client"

import { MessageCircle, Phone, Globe, Instagram, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useTenant } from "@/lib/tenant-context"
import { getOrders, getSalesChannels } from "@/lib/mock-data"

const channelIcons: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  phone: Phone,
  web: Globe,
  instagram: Instagram,
}

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  phone: "Telephone",
  web: "Site Web",
  instagram: "Instagram",
}

export function OnlineSalesWidget() {
  const { currentTenant } = useTenant()
  const orders = getOrders(currentTenant.id)
  const channels = getSalesChannels(currentTenant.id)

  // Count orders by source (excluding comptoir)
  const onlineOrders = orders.filter(o => o.source !== "comptoir")
  const ordersBySource = onlineOrders.reduce((acc, order) => {
    acc[order.source] = (acc[order.source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const revenueBySource = onlineOrders.reduce((acc, order) => {
    acc[order.source] = (acc[order.source] || 0) + order.total
    return acc
  }, {} as Record<string, number>)

  const activeChannels = channels.filter(c => c.enabled)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Ventes en ligne</CardTitle>
          <Link href="/canaux" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            Voir tout
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeChannels.slice(0, 4).map(channel => {
          const Icon = channelIcons[channel.type]
          const count = ordersBySource[channel.type] || 0
          const revenue = revenueBySource[channel.type] || 0

          return (
            <div key={channel.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2.5">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{channelLabels[channel.type]}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{revenue.toLocaleString("fr-TN")} TND</p>
                <p className="text-[10px] text-muted-foreground">{count} cmd{count > 1 ? "s" : ""}</p>
              </div>
            </div>
          )
        })}

        {onlineOrders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune commande en ligne
          </p>
        )}

        <div className="pt-2 border-t flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total en ligne</span>
          <Badge variant="secondary" className="font-semibold">
            {onlineOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString("fr-TN")} TND
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
