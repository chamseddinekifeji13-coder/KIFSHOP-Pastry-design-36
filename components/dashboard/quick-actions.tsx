"use client"

import { useState } from "react"
import { Plus, ShoppingCart, Package, ChefHat, Store, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { QuickOrder } from "@/components/orders/quick-order"

const actions = [
  {
    title: "Nouvelle commande",
    description: "Creer une commande client",
    icon: ShoppingCart,
    href: "/commandes?action=new",
    variant: "outline" as const,
  },
  {
    title: "Achat MP",
    description: "Enregistrer un achat",
    icon: Package,
    href: "/stocks?action=purchase",
    variant: "outline" as const,
  },
  {
    title: "Production",
    description: "Lancer une production",
    icon: ChefHat,
    href: "/production?action=new",
    variant: "outline" as const,
  },
  {
    title: "E-Boutique",
    description: "Gerer le catalogue",
    icon: Store,
    href: "/boutique",
    variant: "outline" as const,
  },
]

export function QuickActions() {
  const [quickOrderOpen, setQuickOrderOpen] = useState(false)

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Plus className="h-4 w-4" />
            Actions rapides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* Quick Order button - highlighted first */}
            <Button
              variant="default"
              className="h-auto py-4 flex flex-col items-center gap-2 col-span-2 sm:col-span-3 md:col-span-1"
              onClick={() => setQuickOrderOpen(true)}
            >
              <Zap className="h-5 w-5" />
              <span className="font-semibold text-sm">Commande Rapide</span>
              <span className="text-[10px] text-primary-foreground/70 font-normal leading-tight">
                6 sec
              </span>
            </Button>

            {actions.map((action) => (
              <Button
                key={action.title}
                variant={action.variant}
                className="h-auto py-4 flex flex-col items-center gap-2"
                asChild
              >
                <Link href={action.href}>
                  <action.icon className="h-5 w-5" />
                  <span className="font-medium text-sm">{action.title}</span>
                  <span className="text-[10px] text-muted-foreground font-normal leading-tight">
                    {action.description}
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <QuickOrder
        open={quickOrderOpen}
        onOpenChange={setQuickOrderOpen}
      />
    </>
  )
}
