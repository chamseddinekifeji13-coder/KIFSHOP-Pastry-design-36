"use client"

import { useState, useEffect, useCallback } from "react"
import { CreditCard, Store, Printer, Bell, Tags, Users, FileText, Loader2 } from "lucide-react"
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
import { UsersDrawer } from "./users-drawer"
import { ROLE_LABELS } from "@/lib/tenant-context"
import { Textarea } from "@/components/ui/textarea"
import {
  getInvoiceSettings, saveInvoiceSettings,
  type InvoiceSettings,
} from "@/lib/orders/invoice-actions"
import { toast } from "sonner"

export function SettingsView() {
  const { currentTenant, currentRole, users, isLoading: tenantLoading } = useTenant()
  const categories = getCategories(currentTenant.id)
  const [shopConfigOpen, setShopConfigOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [usersOpen, setUsersOpen] = useState(false)

  // Invoice settings
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null)
  const [invoiceLoading, setInvoiceLoading] = useState(true)
  const [invoiceSaving, setInvoiceSaving] = useState(false)

  const loadInvoiceSettings = useCallback(async () => {
    if (tenantLoading || currentTenant.id === "demo") return
    setInvoiceLoading(true)
    const settings = await getInvoiceSettings(currentTenant.id)
    setInvoiceSettings(settings)
    setInvoiceLoading(false)
  }, [currentTenant.id])

  useEffect(() => {
    loadInvoiceSettings()
  }, [loadInvoiceSettings])

  const handleSaveInvoiceSettings = async () => {
    if (!invoiceSettings) return
    setInvoiceSaving(true)
    const ok = await saveInvoiceSettings(currentTenant.id, {
      taxEnabled: invoiceSettings.taxEnabled,
      taxRate: invoiceSettings.taxRate,
      taxLabel: invoiceSettings.taxLabel,
      invoicePrefix: invoiceSettings.invoicePrefix,
      deliveryNotePrefix: invoiceSettings.deliveryNotePrefix,
      footerText: invoiceSettings.footerText,
      showPricesOnDeliveryNote: invoiceSettings.showPricesOnDeliveryNote,
    })
    if (ok) {
      toast.success("Parametres de facturation enregistres")
    } else {
      toast.error("Erreur lors de la sauvegarde")
    }
    setInvoiceSaving(false)
  }

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

        {/* Users Management - Gerant only */}
        {currentRole === "gerant" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Utilisateurs</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={() => setUsersOpen(true)} className="bg-transparent">
                  Gerer
                </Button>
              </div>
              <CardDescription>Profils et acces des utilisateurs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(["gerant", "vendeur", "magasinier", "achat", "caissier"] as const).map((role) => {
                  const count = users.filter((u) => u.role === role).length
                  return (
                    <div key={role} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{ROLE_LABELS[role]}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {users.length} utilisateurs au total
              </p>
            </CardContent>
          </Card>
        )}

        {/* Invoice & Billing Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Facturation & Documents</CardTitle>
            </div>
            <CardDescription>Configuration des factures et bons de livraison</CardDescription>
          </CardHeader>
          <CardContent>
            {invoiceLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : invoiceSettings ? (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* TVA Section */}
                  <div className="space-y-4 rounded-lg border p-4">
                    <h4 className="font-medium text-sm">TVA / Taxe</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Activer la TVA</p>
                        <p className="text-xs text-muted-foreground">Afficher HT, TVA et TTC sur les factures</p>
                      </div>
                      <Switch
                        checked={invoiceSettings.taxEnabled}
                        onCheckedChange={(v) => setInvoiceSettings({ ...invoiceSettings, taxEnabled: v })}
                        disabled={currentRole !== "gerant"}
                      />
                    </div>
                    {invoiceSettings.taxEnabled && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Libelle</Label>
                          <Input
                            value={invoiceSettings.taxLabel}
                            onChange={(e) => setInvoiceSettings({ ...invoiceSettings, taxLabel: e.target.value })}
                            disabled={currentRole !== "gerant"}
                            placeholder="TVA"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Taux (%)</Label>
                          <Input
                            type="number"
                            value={invoiceSettings.taxRate}
                            onChange={(e) => setInvoiceSettings({ ...invoiceSettings, taxRate: parseFloat(e.target.value) || 0 })}
                            disabled={currentRole !== "gerant"}
                            placeholder="19"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Numbering Section */}
                  <div className="space-y-4 rounded-lg border p-4">
                    <h4 className="font-medium text-sm">Numerotation</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Prefixe facture</Label>
                        <Input
                          value={invoiceSettings.invoicePrefix}
                          onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoicePrefix: e.target.value })}
                          disabled={currentRole !== "gerant"}
                          placeholder="FAC"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Ex: {invoiceSettings.invoicePrefix}-{new Date().getFullYear()}-{String(invoiceSettings.invoiceCounter + 1).padStart(4, "0")}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prefixe bon de livraison</Label>
                        <Input
                          value={invoiceSettings.deliveryNotePrefix}
                          onChange={(e) => setInvoiceSettings({ ...invoiceSettings, deliveryNotePrefix: e.target.value })}
                          disabled={currentRole !== "gerant"}
                          placeholder="BL"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Ex: {invoiceSettings.deliveryNotePrefix}-{new Date().getFullYear()}-{String(invoiceSettings.deliveryNoteCounter + 1).padStart(4, "0")}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div>Factures emises: <span className="font-medium text-foreground">{invoiceSettings.invoiceCounter}</span></div>
                      <div>BL emis: <span className="font-medium text-foreground">{invoiceSettings.deliveryNoteCounter}</span></div>
                    </div>
                  </div>
                </div>

                {/* Footer & Options */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Pied de page (factures & BL)</Label>
                    <Textarea
                      value={invoiceSettings.footerText}
                      onChange={(e) => setInvoiceSettings({ ...invoiceSettings, footerText: e.target.value })}
                      disabled={currentRole !== "gerant"}
                      rows={2}
                      placeholder="Merci pour votre confiance."
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Prix sur bon de livraison</p>
                        <p className="text-xs text-muted-foreground">Afficher les prix unitaires et totaux sur le BL</p>
                      </div>
                      <Switch
                        checked={invoiceSettings.showPricesOnDeliveryNote}
                        onCheckedChange={(v) => setInvoiceSettings({ ...invoiceSettings, showPricesOnDeliveryNote: v })}
                        disabled={currentRole !== "gerant"}
                      />
                    </div>
                  </div>
                </div>

                {currentRole === "gerant" && (
                  <Button onClick={handleSaveInvoiceSettings} disabled={invoiceSaving}>
                    {invoiceSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer les parametres
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Connectez votre boutique pour configurer la facturation.</p>
            )}
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
      <UsersDrawer open={usersOpen} onOpenChange={setUsersOpen} />
    </div>
  )
}
