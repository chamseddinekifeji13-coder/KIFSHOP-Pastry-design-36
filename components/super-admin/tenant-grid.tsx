"use client"

import {
  Building2,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface TenantGridItem {
  name: string
  mrr: number
  orders: number
  risk: "low" | "medium" | "high"
}

interface TenantGridProps {
  data: TenantGridItem[]
}

const RISK_CONFIG = {
  low: {
    label: "Faible",
    icon: CheckCircle2,
    badgeClass:
      "border-emerald-200 bg-emerald-500/10 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  medium: {
    label: "Moyen",
    icon: AlertCircle,
    badgeClass:
      "border-amber-200 bg-amber-500/10 text-amber-700",
    dotClass: "bg-amber-500",
  },
  high: {
    label: "Eleve",
    icon: AlertTriangle,
    badgeClass:
      "border-destructive/30 bg-destructive/10 text-destructive",
    dotClass: "bg-destructive",
  },
} as const

export function TenantGrid({ data }: TenantGridProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">
            Aucun tenant a afficher
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {data.map((tenant) => {
        const risk = RISK_CONFIG[tenant.risk]
        const RiskIcon = risk.icon
        const hasMrr = tenant.mrr > 0

        return (
          <Card
            key={tenant.name}
            className={cn(
              "group relative overflow-hidden transition-shadow hover:shadow-md",
              tenant.risk === "high" && "border-destructive/30"
            )}
          >
            {/* Risk indicator strip */}
            <div
              className={cn(
                "absolute inset-y-0 left-0 w-1",
                risk.dotClass
              )}
            />

            <CardContent className="flex flex-col gap-4 pl-7">
              {/* Header: name + risk badge */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold leading-tight text-balance">
                    {tenant.name}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("shrink-0 text-[10px]", risk.badgeClass)}
                >
                  <RiskIcon className="h-3 w-3" />
                  {risk.label}
                </Badge>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">
                {/* MRR */}
                <div className="flex flex-col gap-1 rounded-lg bg-muted/60 px-3 py-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    MRR
                  </span>
                  <div className="flex items-center gap-1.5">
                    {hasMrr ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                    )}
                    <span
                      className={cn(
                        "text-base font-bold tabular-nums",
                        hasMrr ? "text-foreground" : "text-destructive"
                      )}
                    >
                      {tenant.mrr}
                      <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
                        DT
                      </span>
                    </span>
                  </div>
                </div>

                {/* Orders */}
                <div className="flex flex-col gap-1 rounded-lg bg-muted/60 px-3 py-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Commandes
                  </span>
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {tenant.orders}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
