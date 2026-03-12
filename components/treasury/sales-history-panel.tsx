"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency } from "@/lib/utils"
import { ShoppingCart, Clock, User } from "lucide-react"

interface SaleItem {
  id: string
  name: string
  price: number
  quantity: number
  timestamp: Date
  cashier?: string
}

interface SalesHistoryPanelProps {
  sales: SaleItem[]
  maxItems?: number
}

export function SalesHistoryPanel({ sales, maxItems = 5 }: SalesHistoryPanelProps) {
  const recentSales = sales.slice(-maxItems).reverse()

  return (
    <div className="h-full flex flex-col bg-white border-l border-amber-200">
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white p-3">
        <div className="flex items-center gap-2 font-bold">
          <ShoppingCart className="h-4 w-4" />
          Historique des ventes
        </div>
        <div className="text-xs text-amber-100 mt-1">
          {sales.length} ventes aujourd'hui
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {recentSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Aucune vente</p>
            </div>
          ) : (
            recentSales.map((sale, idx) => (
              <Card key={idx} className="p-2 bg-amber-50/30 border-amber-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs text-amber-900 truncate">
                      {sale.name}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600">
                      <Clock className="h-2.5 w-2.5" />
                      {sale.timestamp.toLocaleTimeString("fr-TN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-[10px]">
                      x{sale.quantity}
                    </Badge>
                    <p className="font-bold text-amber-900 text-xs mt-1">
                      {formatCurrency(sale.price * sale.quantity)}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
