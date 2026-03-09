"use client"

import { MessageCircle, Phone, Globe, Instagram, ArrowRight, Loader2, type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useOrders } from "@/hooks/use-tenant-data"
import { useMemo } from "react"

const channelIcons: Record<string, LucideIcon> = {
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  phone: Phone,
  web: Globe,
  instagram: Instagram,
  tiktok: Globe,
}

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  phone: "Téléphone",
  web: "Site Web",
  instagram: "Instagram",
  tiktok: "TikTok",
}

export function OnlineSalesWidget() {
  const { data: orders, isLoading } = useOrders()

  const { onlineOrders, ordersBySource, revenueBySource, totalOnline } = useMemo(() => {
    const online = (orders || []).filter((o) => o.source !== "comptoir")

    const bySource = online.reduce((acc, order) => {
      acc[order.source] = (acc[order.source] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const revenue = online.reduce((acc, order) => {
      acc[order.source] = (acc[order.source] || 0) + (order.total ?? 0)
      return acc
    }, {} as Record<string, number>)

    const total = online.reduce((sum, o) => sum + (o.total ?? 0), 0)

    return {
      onlineOrders: online,
      ordersBySource: bySource,
      revenueBySource: revenue,
      totalOnline: total,
    }
  }, [orders])

  const sources = Object.keys(ordersBySource)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Ventes en ligne</CardTitle>
          <Link
            href="/canaux"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            Voir tout
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Chargement" />
          </div>
        ) : ordersBySource.length === 0 || Object.keys(ordersBySource).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune commande en ligne
          </p>
        ) : (
          Object.keys(ordersBySource).map((source) => {
            const Icon = channelIcons[source] || Globe
            const count = ordersBySource[source] || 0

            return (
              <div key={source} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2.5">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{channelLabels[source] || source}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">
                    {(revenueBySource[source] || 0).toLocaleString("fr-TN")} TND
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {count} cmd{count > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div className="pt-2 border-t flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total en ligne</span>
          <Badge variant="secondary" className="font-semibold">
            {totalOnline.toLocaleString("fr-TN")} TND
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
