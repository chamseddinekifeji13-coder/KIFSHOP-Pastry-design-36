"use client"

import { Plus, ShoppingCart, Package, ChefHat, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

const actions = [
  {
    title: "Nouvelle commande",
    description: "Créer une commande client",
    icon: ShoppingCart,
    href: "/commandes?action=new",
    variant: "default" as const,
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
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Plus className="h-4 w-4" />
          Actions rapides
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => (
          <Button
            key={action.title}
            variant={action.variant}
            className="w-full justify-start h-auto py-3"
            asChild
          >
            <Link href={action.href}>
              <action.icon className="h-4 w-4 mr-3" />
              <div className="flex flex-col items-start">
                <span className="font-medium">{action.title}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {action.description}
                </span>
              </div>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
