"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertCircle, CheckCircle2, Filter, Download, Loader2 } from "lucide-react"
import {
  getUnverifiedCourierCollections,
  approveCourierCollection,
  approveCourierCollectionsByDriver,
  getCourierCollectionsSummary,
} from "@/lib/orders/actions"
import { useTenant } from "@/lib/tenant-context"

interface CourierCollection {
  id: string
  orderId: string
  tenantId: string
  amount: number
  paymentMethod: string
  collectorName: string
  collectedAt: string
  recordedByName?: string
  verified: boolean
  verifiedAt?: string
  verifiedByName?: string
  reference?: string
  notes?: string
}

export function CourierCollectionsView() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id
  const [unverified, setUnverified] = useState<CourierCollection[]>([])
  const [all, setAll] = useState<CourierCollection[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState<string>("")
  const [drivers, setDrivers] = useState<string[]>([])
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set())

  const loadData = async () => {
    if (!tenantId) {
      setUnverified([])
      setSummary(null)
      setDrivers([])
      setLoading(false)
      return
    }

    setLoading(true)
    const [collections, summaryData] = await Promise.all([
      getUnverifiedCourierCollections(tenantId),
      getCourierCollectionsSummary(tenantId),
    ])
    setUnverified(collections)
    setSummary(summaryData)

    // Extraire les noms uniques de livreurs
    const uniqueDrivers = [...new Set(collections.map((c) => c.collectorName))]
    setDrivers(uniqueDrivers.sort())
    setLoading(false)
  }

  useEffect(() => {
    if (!tenantId) return
    loadData()
    const interval = setInterval(loadData, 15000) // Rafraîchir toutes les 15s
    return () => clearInterval(interval)
  }, [tenantId])

  const handleApprove = async (id: string) => {
    if (!tenantId) return
    setApprovingIds((prev) => new Set([...prev, id]))
    const success = await approveCourierCollection(id, tenantId)
    if (success) {
      setUnverified((prev) => prev.filter((c) => c.id !== id))
      await loadData()
    }
    setApprovingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleApproveDriver = async () => {
    if (!tenantId || !selectedDriver) return
    setApprovingIds((prev) => new Set([...prev, selectedDriver]))
    const success = await approveCourierCollectionsByDriver(tenantId, selectedDriver)
    if (success) {
      await loadData()
      setSelectedDriver("")
    }
    setApprovingIds((prev) => {
      const next = new Set(prev)
      next.delete(selectedDriver)
      return next
    })
  }

  const paymentMethodLabels: Record<string, string> = {
    cash: "Espèces",
    card: "Carte",
    bank_transfer: "Virement",
    check: "Chèque",
    cod_courier: "Contre-remboursement",
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("fr-TN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestion des encaissements livreurs</h1>
        <p className="text-muted-foreground">Approuvez et validez les montants reçus par les livreurs</p>
      </div>

      {/* Statistiques */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">En attente de validation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{summary.unverifiedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.unverifiedTotal.toLocaleString("fr-TN")} TND
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Déjà validés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.verifiedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.verifiedTotal.toLocaleString("fr-TN")} TND
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Livreurs actifs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{drivers.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {Object.keys(summary.byCourier || {}).length} avec encaissements
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total général</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(summary.unverifiedTotal + summary.verifiedTotal).toLocaleString("fr-TN")} TND
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.unverifiedCount + summary.verifiedCount} encaissements
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="unverified" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unverified" className="relative">
            En attente
            {unverified.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {unverified.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="summary">Résumé par livreur</TabsTrigger>
        </TabsList>

        <TabsContent value="unverified" className="space-y-4">
          {/* Filtres et actions */}
          <div className="flex gap-2">
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sélectionner un livreur..." />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver) => (
                  <SelectItem key={driver} value={driver}>
                    {driver}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleApproveDriver}
              disabled={!selectedDriver || approvingIds.has(selectedDriver)}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approuver tout ce livreur
            </Button>
          </div>

          {/* Tableau des encaissements non vérifiés */}
          {unverified.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Livreur</TableHead>
                      <TableHead>Commande</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Date/Heure</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unverified.map((collection) => (
                      <TableRow key={collection.id}>
                        <TableCell className="font-medium">{collection.collectorName}</TableCell>
                        <TableCell className="font-mono text-sm">{collection.orderId}</TableCell>
                        <TableCell className="font-bold">
                          {collection.amount.toLocaleString("fr-TN")} TND
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {paymentMethodLabels[collection.paymentMethod] || collection.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(collection.collectedAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {collection.notes || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(collection.id)}
                            disabled={approvingIds.has(collection.id)}
                          >
                            {approvingIds.has(collection.id) ? "..." : "Approuver"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-3 opacity-50" />
                  <p className="text-muted-foreground">Tous les encaissements ont été validés ✓</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          {summary?.byCourier && Object.keys(summary.byCourier).length > 0 ? (
            <div className="grid gap-4">
              {Object.entries(summary.byCourier).map(([courier, stats]: [string, any]) => (
                <Card key={courier}>
                  <CardHeader>
                    <CardTitle className="text-lg">{courier}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm text-muted-foreground">En attente</span>
                        </div>
                        <div className="text-2xl font-bold text-destructive">
                          {stats.unverifiedTotal.toLocaleString("fr-TN")} TND
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {stats.unverifiedCount} encaissement(s)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-muted-foreground">Validés</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {stats.verifiedTotal.toLocaleString("fr-TN")} TND
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {stats.verifiedCount} encaissement(s)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Aucun encaissement par livreur pour le moment</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
