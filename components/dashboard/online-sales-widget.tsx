"use client"

import { MessageCircle, Phone, Globe, Instagram, ArrowRight, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useOrders } from "@/hooks/use-tenant-data"

const channelIcons: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle, messenger: MessageCircle, phone: Phone, web: Globe, instagram: Instagram,
}
const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp", messenger: "Messenger", phone: "Telephone", web: "Site Web", instagram: "Instagram",
}

export function OnlineSalesWidget() {
  const { data: orders, isLoading } = useOrders()

  const onlineOrders = (orders || []).filter((o) => o.source !== "comptoir")
  const ordersBySource = onlineOrders.reduce((acc, order) => {
    acc[order.source] = (acc[order.source] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const revenueBySource = onlineOrders.reduce((acc, order) => {
    acc[order.source] = (acc[order.source] || 0) + order.total
    return acc
  }, {} as Record<string, number>)

  const sources = Object.keys(ordersBySource)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Ventes en ligne</CardTitle>
          <Link href="/canaux" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            Voir tout <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sources.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucune commande en ligne</p>
        ) : (
          sources.map((source) => {
            const Icon = channelIcons[source] || Globe
            return (
              <div key={source} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2.5">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{channelLabels[source] || source}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{(revenueBySource[source] || 0).toLocaleString("fr-TN")} TND</p>
                  <p className="text-[10px] text-muted-foreground">{ordersBySource[source]} cmd{ordersBySource[source] > 1 ? "s" : ""}</p>
                </div>
              </div>
            )
          })
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
