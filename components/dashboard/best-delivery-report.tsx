"use client"

import { useState, useMemo } from "react"
import {
  Truck, Package, CheckCircle2, XCircle, RotateCcw, Clock,
  TrendingUp, TrendingDown, Download, RefreshCw, Eye,
  Search, Filter, Calendar, BarChart3, Loader2, Upload, Trash2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDeliveryShipments } from "@/hooks/use-tenant-data"
import {
  calculateDeliveryStats, calculateDeliveryTrends,
  updateShipmentStatusWithFullSync, exportDeliveryReport,
  bulkSyncReturns, bulkSyncDelivered,
  type DeliveryShipment, type DeliveryStatus,
} from "@/lib/delivery/actions"
import { useTenant } from "@/lib/tenant-context"
import { exportToCSV } from "@/lib/csv-export"
import { toast } from "sonner"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts"
import { DeliveryImportDialog } from "./delivery-import-dialog"

const statusConfig: Record<DeliveryStatus, { label: string; color: string; icon: typeof Truck; bgClass: string }> = {
  pending: { label: "En attente", color: "#6b7280", icon: Clock, bgClass: "bg-gray-100 text-gray-800" },
  sent: { label: "Envoyee", color: "#3b82f6", icon: Package, bgClass: "bg-blue-100 text-blue-800" },
  in_transit: { label: "En transit", color: "#f59e0b", icon: Truck, bgClass: "bg-amber-100 text-amber-800" },
  delivered: { label: "Livree", color: "#10b981", icon: CheckCircle2, bgClass: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Echouee", color: "#ef4444", icon: XCircle, bgClass: "bg-red-100 text-red-800" },
  returned: { label: "Retour", color: "#8b5cf6", icon: RotateCcw, bgClass: "bg-violet-100 text-violet-800" },
}

const CHART_COLORS = ["#10b981", "#8b5cf6", "#ef4444", "#f59e0b", "#3b82f6", "#6b7280"]

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function BestDeliveryReport() {
  const { currentTenant } = useTenant()
  const { data: shipments = [], isLoading, mutate } = useDeliveryShipments()

  const [selectedTab, setSelectedTab] = useState("overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [selectedShipment, setSelectedShipment] = useState<DeliveryShipment | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<DeliveryStatus>("delivered")
  const [statusNotes, setStatusNotes] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [deleteNoPhoneOpen, setDeleteNoPhoneOpen] = useState(false)
  const [isDeletingNoPhone, setIsDeletingNoPhone] = useState(false)

  // Shipments without phone number
  const shipmentsWithoutPhone = useMemo(() => {
    const result = shipments.filter((s) => !s.customerPhone || s.customerPhone.trim() === "")
    console.log("[v0] shipmentsWithoutPhone count:", result.length, "from total:", shipments.length)
    console.log("[v0] sample without phone:", result.slice(0, 3))
    return result
  }, [shipments])

  const handleDeleteWithoutPhone = async () => {
    if (!currentTenant?.id) return
    setIsDeletingNoPhone(true)
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { error, count } = await supabase
        .from("best_delivery_shipments")
        .delete({ count: "exact" })
        .eq("tenant_id", currentTenant.id)
        .or("customer_phone.is.null,customer_phone.eq.")
      if (error) throw error
      toast.success(`${count ?? shipmentsWithoutPhone.length} expedition(s) sans telephone supprimee(s)`)
      mutate()
      setDeleteNoPhoneOpen(false)
    } catch (err) {
      console.error("[v0] delete without phone error:", err)
      toast.error("Erreur lors de la suppression")
    } finally {
      setIsDeletingNoPhone(false)
    }
  }

  // Calculate statistics
  const stats = useMemo(() => calculateDeliveryStats(shipments), [shipments])
  const trends = useMemo(() => calculateDeliveryTrends(shipments), [shipments])

  // Filter shipments
  const filteredShipments = useMemo(() => {
    let filtered = [...shipments]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.customerName.toLowerCase().includes(query) ||
          s.customerPhone?.toLowerCase().includes(query) ||
          s.trackingNumber?.toLowerCase().includes(query) ||
          s.orderNumber?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter)
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date()
      const filterDate = new Date()
      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0)
          break
        case "week":
          filterDate.setDate(now.getDate() - 7)
          break
        case "month":
          filterDate.setMonth(now.getMonth() - 1)
          break
      }
      filtered = filtered.filter((s) => new Date(s.createdAt) >= filterDate)
    }

    return filtered
  }, [shipments, searchQuery, statusFilter, dateFilter])

  // Pie chart data
  const pieData = useMemo(() => {
    return [
      { name: "Livree", value: stats.delivered, color: "#10b981" },
      { name: "Retour", value: stats.returned, color: "#8b5cf6" },
      { name: "Echouee", value: stats.failed, color: "#ef4444" },
      { name: "En transit", value: stats.inTransit, color: "#f59e0b" },
      { name: "Envoyee", value: stats.sent, color: "#3b82f6" },
      { name: "En attente", value: stats.pending, color: "#6b7280" },
    ].filter((d) => d.value > 0)
  }, [stats])

  const handleUpdateStatus = async () => {
    if (!selectedShipment || isUpdating) return
    setIsUpdating(true)

    const result = await updateShipmentStatusWithFullSync(
      selectedShipment.id,
      currentTenant.id,
      newStatus,
      statusNotes || undefined
    )
    
    if (result.success) {
      if (newStatus === "returned" && result.clientSynced) {
        toast.success("Statut mis a jour + Compteur retour incremente", {
          description: `Retour enregistre pour ${result.clientName || selectedShipment.customerName}`,
        })
      } else if (newStatus === "delivered" && result.clientSynced) {
        toast.success("Statut mis a jour + Compteur livraison incremente", {
          description: `Livraison enregistree pour ${result.clientName || selectedShipment.customerName}`,
        })
      } else if ((newStatus === "returned" || newStatus === "delivered") && !result.clientSynced) {
        toast.warning("Statut mis a jour", {
          description: "Attention: Le compteur client n'a pas pu etre mis a jour (client non trouve)",
        })
      } else {
        toast.success("Statut mis a jour", {
          description: `Expedition -> ${statusConfig[newStatus].label}`,
        })
      }
      mutate()
      setStatusDialogOpen(false)
      setSelectedShipment(null)
    } else {
      toast.error("Erreur lors de la mise a jour")
    }
    setIsUpdating(false)
  }

  const handleBulkSync = async () => {
    setIsSyncing(true)
    
    // Sync both returns and deliveries
    const [returnsResult, deliveredResult] = await Promise.all([
      bulkSyncReturns(currentTenant.id),
      bulkSyncDelivered(currentTenant.id),
    ])
    
    const totalSynced = returnsResult.synced + deliveredResult.synced
    const totalProcessed = returnsResult.total + deliveredResult.total
    
    if (totalProcessed === 0) {
      toast.info("Aucune expedition a synchroniser")
    } else {
      toast.success(`Synchronisation terminee`, {
        description: `${deliveredResult.synced} livraisons et ${returnsResult.synced} retours synchronises`,
      })
      mutate()
    }
    setIsSyncing(false)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const { headers, data } = await exportDeliveryReport(currentTenant.id)
      exportToCSV({ filename: "rapport-livraisons", headers, data: data as string[][] })
      toast.success("Rapport exporte avec succes")
    } catch {
      toast.error("Erreur lors de l'export")
    } finally {
      setIsExporting(false)
    }
  }

  const openStatusDialog = (shipment: DeliveryShipment) => {
    setSelectedShipment(shipment)
    setNewStatus(shipment.status)
    setStatusNotes("")
    setStatusDialogOpen(true)
  }

  const openDetails = (shipment: DeliveryShipment) => {
    setSelectedShipment(shipment)
    setDetailsOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Rapport Best Delivery</h2>
          <p className="text-sm text-muted-foreground">
            Suivi des expeditions et performances de livraison
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => mutate()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button
            variant="outline"
            onClick={handleBulkSync}
            disabled={isSyncing || (stats.returned === 0 && stats.delivered === 0)}
            title="Synchroniser les livraisons et retours avec les compteurs clients"
          >
            {isSyncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Sync Clients
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importer CSV
          </Button>
          {shipmentsWithoutPhone.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setDeleteNoPhoneOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer sans tel. ({shipmentsWithoutPhone.length})
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exporter
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expeditions</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {stats.pending} en attente
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.inTransit} en transit
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taux de Livraison</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {stats.deliveryRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.delivered} livrees sur {stats.delivered + stats.returned + stats.failed} terminees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taux de Retour</CardTitle>
            <RotateCcw className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-600">
              {stats.returnRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.returned} retours enregistres
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taux d{"'"}Echec</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.failureRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.failed} echecs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Vue d{"'"}ensemble
          </TabsTrigger>
          <TabsTrigger value="shipments">
            <Truck className="mr-2 h-4 w-4" />
            Expeditions
            <Badge variant="secondary" className="ml-2">
              {filteredShipments.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tendances (30 derniers jours)</CardTitle>
                <CardDescription>
                  Evolution des livraisons, retours et echecs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => new Date(v).toLocaleDateString("fr-TN", { day: "2-digit", month: "2-digit" })}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <Tooltip
                        labelFormatter={(v) => formatDate(v as string)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="delivered"
                        name="Livrees"
                        stackId="1"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="returned"
                        name="Retours"
                        stackId="1"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="failed"
                        name="Echecs"
                        stackId="1"
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Repartition des statuts</CardTitle>
                <CardDescription>
                  Distribution actuelle des expeditions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resume par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {Object.entries(statusConfig).map(([key, config]) => {
                  const count = shipments.filter((s) => s.status === key).length
                  const Icon = config.icon
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: config.color }} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground">{config.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipments Tab */}
        <TabsContent value="shipments" className="mt-4 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label htmlFor="search" className="sr-only">Rechercher</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Rechercher par client, telephone, N° suivi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Calendar className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Periode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toute la periode</SelectItem>
                      <SelectItem value="today">Aujourd{"'"}hui</SelectItem>
                      <SelectItem value="week">7 derniers jours</SelectItem>
                      <SelectItem value="month">30 derniers jours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipments Table */}
          {filteredShipments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Truck className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">Aucune expedition trouvee</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery || statusFilter !== "all" || dateFilter !== "all"
                    ? "Essayez d'ajuster vos filtres"
                    : "Les expeditions apparaitront ici"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Telephone</TableHead>
                      <TableHead>N° Commande</TableHead>
                      <TableHead>N° Suivi</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShipments.map((shipment) => {
                      const config = statusConfig[shipment.status]
                      const Icon = config.icon
                      return (
                        <TableRow key={shipment.id}>
                          <TableCell>
                            <p className="font-medium">{shipment.customerName}</p>
                          </TableCell>
                          <TableCell>
                            {shipment.customerPhone ? (
                              <a 
                                href={`tel:${shipment.customerPhone}`}
                                className="font-mono text-sm text-primary hover:underline"
                              >
                                {shipment.customerPhone}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">
                              {shipment.orderNumber || shipment.orderId.substring(0, 8)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {shipment.trackingNumber ? (
                              <span className="font-mono text-sm">
                                {shipment.trackingNumber}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={config.bgClass}>
                              <Icon className="mr-1 h-3 w-3" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(shipment.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDetails(shipment)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openStatusDialog(shipment)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Details de l{"'"}expedition</SheetTitle>
            <SheetDescription>
              Informations completes sur l{"'"}expedition
            </SheetDescription>
          </SheetHeader>
          {selectedShipment && (
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Statut</Label>
                  <div className="mt-1">
                    <Badge className={statusConfig[selectedShipment.status].bgClass}>
                      {statusConfig[selectedShipment.status].label}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">N° Commande</Label>
                    <p className="font-mono">
                      {selectedShipment.orderNumber || selectedShipment.orderId.substring(0, 8)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">N° Suivi</Label>
                    <p className="font-mono">
                      {selectedShipment.trackingNumber || "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Client</Label>
                  <p className="font-medium">{selectedShipment.customerName}</p>
                  {selectedShipment.customerPhone && (
                    <p className="text-sm text-muted-foreground">
                      {selectedShipment.customerPhone}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-muted-foreground">Adresse</Label>
                  <p>{selectedShipment.customerAddress}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p>{selectedShipment.deliveryType || "Standard"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date export</Label>
                    <p>{formatDateTime(selectedShipment.exportedAt)}</p>
                  </div>
                </div>

                {selectedShipment.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm">{selectedShipment.notes}</p>
                  </div>
                )}

                {selectedShipment.errorMessage && (
                  <div>
                    <Label className="text-muted-foreground text-red-500">Erreur</Label>
                    <p className="text-sm text-red-600">{selectedShipment.errorMessage}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    setDetailsOpen(false)
                    openStatusDialog(selectedShipment)
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Changer le statut
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mettre a jour le statut</DialogTitle>
            <DialogDescription>
              Expedition pour {selectedShipment?.customerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nouveau statut</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as DeliveryStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" style={{ color: config.color }} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {newStatus === "returned" && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                <div className="flex items-start gap-2">
                  <RotateCcw className="h-4 w-4 text-violet-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-violet-800">
                      Synchronisation automatique - Retour
                    </p>
                    <p className="text-xs text-violet-600 mt-0.5">
                      Le compteur de retours du client sera automatiquement incremente. 
                      Si le client atteint 3 retours, son statut passera en {"\""}warning{"\""}.
                      A partir de 5 retours, il sera {"\""}blackliste{"\""}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {newStatus === "delivered" && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">
                      Synchronisation automatique - Livraison
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Le compteur de livraisons reussies du client sera automatiquement incremente.
                      Le total des commandes et le montant depense seront mis a jour.
                      A partir de 10 livraisons reussies, le client passera en statut {"\""}VIP{"\""}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea
                placeholder="Ajouter des notes sur cette mise a jour..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating}>
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <DeliveryImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={() => mutate()}
      />

      {/* Delete Without Phone Confirmation */}
      <AlertDialog open={deleteNoPhoneOpen} onOpenChange={setDeleteNoPhoneOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer les expeditions sans telephone ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera definitivement <strong>{shipmentsWithoutPhone.length} expedition(s)</strong> dont le numero de telephone est vide. Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteWithoutPhone}
            disabled={isDeletingNoPhone}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeletingNoPhone ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Oui, supprimer
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
