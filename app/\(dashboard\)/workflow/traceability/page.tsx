"use client"

import { useContext, useState } from "react"
import { TenantContext } from "@/lib/tenant-context"
import { AuditTimeline } from "@/components/workflow/audit-timeline"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, AlertCircle } from "lucide-react"

export default function TraceabilityPage() {
  const context = useContext(TenantContext)
  const [searchQuery, setSearchQuery] = useState("")
  const [entityType, setEntityType] = useState<"stock_alert" | "bon_approvisionnement" | "purchase_order">("bon_approvisionnement")
  const [entityId, setEntityId] = useState<string>("")
  const [showTimeline, setShowTimeline] = useState(false)

  if (!context) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Impossible de charger le contexte tenant</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { tenantId } = context

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setEntityId(searchQuery.trim())
      setShowTimeline(true)
    }
  }

  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      stock_alert: "Alerte Stock",
      bon_approvisionnement: "Bon d'Approvisionnement",
      purchase_order: "Commande Fournisseur",
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Traçabilité</h1>
        <p className="text-muted-foreground mt-2">
          Suivi complet du workflow d'approvisionnement
        </p>
      </div>

      {/* Statistiques Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Alertes Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Suivi</div>
            <p className="text-xs text-muted-foreground mt-1">Recherchez une alerte par ID</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bons d'Approvisionnement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Suivi</div>
            <p className="text-xs text-muted-foreground mt-1">Recherchez un bon par ID</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Commandes Fournisseurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Suivi</div>
            <p className="text-xs text-muted-foreground mt-1">Recherchez une commande par ID</p>
          </CardContent>
        </Card>
      </div>

      {/* Recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Recherche de Traçabilité</CardTitle>
          <CardDescription>Saisissez un ID pour afficher l'historique complet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={entityType} onValueChange={(val) => setEntityType(val as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stock_alert">Alerte Stock</TabsTrigger>
              <TabsTrigger value="bon_approvisionnement">Bon Appro</TabsTrigger>
              <TabsTrigger value="purchase_order">Commande</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder={`ID de ${getEntityTypeLabel(entityType).toLowerCase()}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Timeline */}
      {showTimeline && entityId && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Historique: {getEntityTypeLabel(entityType)} #{entityId.slice(0, 8)}
          </h2>
          <AuditTimeline 
            tenantId={tenantId}
            entityType={entityType}
            entityId={entityId}
          />
        </div>
      )}

      {/* Informations d'aide */}
      {!showTimeline && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Comment utiliser la traçabilité?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>1. Sélectionnez le type d'entité (Alerte Stock, Bon d'Appro, ou Commande)</li>
              <li>2. Saisissez l'ID de l'entité que vous souhaitez tracker</li>
              <li>3. Cliquez sur le bouton de recherche pour afficher l'historique complet</li>
              <li>4. Consultez la timeline pour voir toutes les actions et transitions</li>
              <li>5. Cliquez sur "Voir les détails" pour les informations JSON complètes</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
