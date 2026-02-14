"use client"

import { useState } from "react"
import { CreditCard, Store, Printer, Bell, Tags } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useTenant } from "@/lib/tenant-context"
import { getCategories } from "@/lib/mock-data"
import { ShopConfigDrawer } from "./shop-config-drawer"
import { CategoriesDrawer } from "./categories-drawer"

export function SettingsView() {
  const { currentTenant, currentRole } = useTenant()
  const categories = getCategories(currentTenant.id)
  const [shopConfigOpen, setShopConfigOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Configurez votre boutique et votre abonnement
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Abonnement</CardTitle>
              </div>
              <Badge className="bg-primary">Pro</Badge>
            </div>
            <CardDescription>Gérez votre plan KIFSHOP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Plan actuel</span>
                <span className="font-medium">Pro</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Prix</span>
                <span className="font-medium">99 TND/mois</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Prochaine facturation</span>
                <span className="font-medium">01/03/2026</span>
              </div>
            </div>
            {currentRole === "gerant" && (
              <Button variant="outline" className="w-full bg-transparent">
                Gérer l{"'"}abonnement
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Shop Config */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Configuration Boutique</CardTitle>
            </div>
            <CardDescription>Informations de votre établissement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-lg text-2xl font-bold text-primary-foreground"
                style={{ backgroundColor: currentTenant.primaryColor }}
              >
                {currentTenant.logo}
              </div>
              <div className="flex-1">
                <p className="font-medium">{currentTenant.name}</p>
                <p className="text-sm text-muted-foreground">ID: {currentTenant.id}</p>
              </div>
              {currentRole === "gerant" && (
                <Button variant="outline" size="sm" onClick={() => setShopConfigOpen(true)} className="bg-transparent">
                  Modifier
                </Button>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="tax-rate">Taux TVA (%)</Label>
                <Input id="tax-rate" defaultValue="19" disabled={currentRole !== "gerant"} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Categories de produits</CardTitle>
              </div>
              {currentRole === "gerant" && (
                <Button variant="outline" size="sm" onClick={() => setCategoriesOpen(true)} className="bg-transparent">
                  Gerer
                </Button>
              )}
            </div>
            <CardDescription>Organisez vos produits finis par categorie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm font-medium">{cat.name}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {categories.length} categories configurees
            </p>
          </CardContent>
        </Card>

        {/* Printer Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Impression</CardTitle>
            </div>
            <CardDescription>Configuration des tickets et factures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Impression automatique</p>
                <p className="text-xs text-muted-foreground">Imprimer le ticket après chaque vente</p>
              </div>
              <Switch defaultChecked disabled={currentRole !== "gerant"} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Inclure le logo</p>
                <p className="text-xs text-muted-foreground">Afficher le logo sur les tickets</p>
              </div>
              <Switch defaultChecked disabled={currentRole !== "gerant"} />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
            <CardDescription>Alertes et rappels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Alertes stock critique</p>
                <p className="text-xs text-muted-foreground">Notification quand le stock est bas</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Nouvelles commandes</p>
                <p className="text-xs text-muted-foreground">Notification pour chaque commande</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Rapport quotidien</p>
                <p className="text-xs text-muted-foreground">Résumé des ventes par email</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>


      </div>

      <ShopConfigDrawer open={shopConfigOpen} onOpenChange={setShopConfigOpen} />
      <CategoriesDrawer open={categoriesOpen} onOpenChange={setCategoriesOpen} />
    </div>
  )
}
