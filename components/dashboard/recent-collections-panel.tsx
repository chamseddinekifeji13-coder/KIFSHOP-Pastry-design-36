"use client"

import { Banknote, CreditCard, Building2, Wallet, Truck, Store, Globe, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePaymentCollections } from "@/hooks/use-tenant-data"

const paymentMethodIcons: Record<string, typeof Banknote> = {
  cash: Banknote,
  card: CreditCard,
  bank_transfer: Building2,
  check: Wallet,
  cod_courier: Truck,
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Especes",
  card: "Carte",
  bank_transfer: "Virement",
  check: "Cheque",
  cod_courier: "Livreur",
}

const collectedByIcons: Record<string, typeof Store> = {
  direct: Store,
  courier: Truck,
  online: Globe,
}

export function RecentCollectionsPanel() {
  const { data: collections, isLoading } = usePaymentCollections()

  // Get today's date in local format for filtering
  const today = new Date().toLocaleDateString("fr-CA")
  
  // Filter today's collections and take the 5 most recent
  const todayCollections = (collections || [])
    .filter((c) => c.collectedAt?.startsWith(today))
    .slice(0, 5)

  // Calculate total for today
  const todayTotal = (collections || [])
    .filter((c) => c.collectedAt?.startsWith(today))
    .reduce((sum, c) => sum + (c.amount ?? 0), 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold">
          <span className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Encaissements recents
          </span>
          {!isLoading && todayTotal > 0 && (
            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
              {todayTotal.toLocaleString("fr-TN")} TND
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Chargement..." />
          </div>
        ) : todayCollections.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucun encaissement aujourd&apos;hui
          </p>
        ) : (
          todayCollections.map((collection) => {
            const MethodIcon = paymentMethodIcons[collection.paymentMethod] || Banknote
            const CollectedIcon = collectedByIcons[collection.collectedBy] || Store
            return (
              <div
                key={collection.id}
                className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                  <MethodIcon className="h-4 w-4 text-green-600" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-green-600">
                      +{collection.amount.toLocaleString("fr-TN")} TND
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {paymentMethodLabels[collection.paymentMethod] || collection.paymentMethod}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {collection.orderCustomerName || "Client"}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <CollectedIcon className="h-3 w-3" />
                    <span>
                      {new Date(collection.collectedAt).toLocaleTimeString("fr-TN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {collection.recordedByName && (
                      <span className="truncate">- {collection.recordedByName}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
