"use client"

import { useState, useMemo } from "react"
import {
  Search, Phone, User, Star, AlertTriangle,
  Download, Loader2, ChevronRight, Filter,
  TrendingUp, Ban, Trash2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTenant } from "@/lib/tenant-context"
import { useClients } from "@/hooks/use-tenant-data"
import { updateClient, deleteClient, type Client } from "@/lib/clients/actions"
import { toast } from "sonner"
import { exportToCSV, formatDateForCSV, formatAmountForCSV } from "@/lib/csv-export"
import { ClientDetailDrawer } from "./client-detail-drawer"

const statusConfig: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  normal: { label: "Normal", color: "bg-muted text-muted-foreground", icon: User },
  vip: { label: "VIP", color: "bg-emerald-100 text-emerald-700", icon: Star },
  warning: { label: "Attention", color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  blacklisted: { label: "Blackliste", color: "bg-red-100 text-red-700", icon: Ban },
}

export function ClientsView() {
  const { currentTenant } = useTenant()
  const { data: clients = [], isLoading, mutate } = useClients()
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showDeleteNoPhoneDialog, setShowDeleteNoPhoneDialog] = useState(false)
  const [isDeletingNoPhone, setIsDeletingNoPhone] = useState(false)

  // Memoized statistics
  const stats = useMemo(() => ({
    total: clients.length,
    vip: clients.filter((c) => c.status === "vip").length,
    warning: clients.filter((c) => c.status === "warning").length,
    blacklisted: clients.filter((c) => c.status === "blacklisted").length,
    totalRevenue: clients.reduce((sum, c) => sum + (c.totalSpent ?? 0), 0),
  }), [clients])

  // Memoized clients without phone
  const clientsWithoutPhone = useMemo(() =>
    clients.filter((c) => !c.phone?.trim()), [clients]
  )

  // Memoized filtered clients
  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase()
    return clients.filter((c) => {
      const matchSearch = !search ||
        (c.name || "").toLowerCase().includes(searchLower) ||
        c.phone?.includes(search)
      const matchStatus = filterStatus === "all" || c.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [clients, search, filterStatus])

  const handleStatusChange = async (clientId: string, newStatus: string) => {
    try {
      const ok = await updateClient(clientId, { status: newStatus })
      if (ok) {
        toast.success("Statut mis a jour")
        mutate()
      } else {
        toast.error("Erreur de mise a jour")
      }
    } catch (error) {
      console.error("Status change error:", error)
      toast.error("Erreur reseau lors de la mise a jour")
    }
  }

  const handleDelete = async (clientId: string) => {
    try {
      const ok = await deleteClient(clientId)
      if (ok) {
        toast.success("Client supprime")
        mutate()
      } else {
        toast.error("Erreur de suppression")
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Erreur reseau lors de la suppression")
    }
  }

  const handleExport = () => {
    setIsExporting(true)
    try {
      exportToCSV({
        filename: "clients",
        headers: ["Nom", "Telephone", "Statut", "Commandes", "Total depense", "Retours", "Date creation"],
        data: filtered.map((c) => [
          c.name || "Sans nom",
          c.phone,
          statusConfig[c.status]?.label || c.status,
          c.totalOrders,
          formatAmountForCSV(c.totalSpent),
          c.returnCount,
          formatDateForCSV(c.createdAt),
        ]),
      })
      toast.success("Export CSV termine")
    } catch {
      toast.error("Erreur d'export")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteClientsWithoutPhone = async () => {
    setIsDeletingNoPhone(true)
    try {
      const response = await fetch("/api/clients/delete-without-phone", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Ensure error is always a string to avoid React #310
        const errMsg = typeof errorData.error === "string" ? errorData.error : "Erreur lors de la suppression"
        toast.error(errMsg)
        return
      }

      const result = await response.json()
      if (result.success) {
        toast.success(`${result.deleted || clientsWithoutPhone.length} clients sans telephone supprimes`)
        mutate()
        setShowDeleteNoPhoneDialog(false)
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Une erreur est survenue")
    } finally {
      setIsDeletingNoPhone(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Base Clients</h1>
          <p className="text-muted-foreground">
            {stats.total} clients enregistres
          </p>
        </div>
        <div className="flex gap-2">
          {clientsWithoutPhone.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteNoPhoneDialog(true)}
              size="sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer {clientsWithoutPhone.length} sans tel.
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                <Star className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.vip}</p>
                <p className="text-xs text-muted-foreground">VIP</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.warning}</p>
                <p className="text-xs text-muted-foreground">Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
                <Ban className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.blacklisted}</p>
                <p className="text-xs text-muted-foreground">Blacklistes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalRevenue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">CA Total (TND)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou telephone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="warning">Attention</SelectItem>
            <SelectItem value="blacklisted">Blackliste</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Aucun client trouve</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Les clients seront ajoutes automatiquement via les commandes rapides
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => {
            const cfg = statusConfig[client.status] || statusConfig.normal
            const StatusIcon = cfg.icon
            return (
              <Card
                key={client.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedClient(client)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      client.status === "vip" ? "bg-emerald-100 text-emerald-700" :
                      client.status === "blacklisted" ? "bg-red-100 text-red-700" :
                      client.status === "warning" ? "bg-amber-100 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {client.name ? client.name.charAt(0).toUpperCase() : <Phone className="h-4 w-4" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{client.name || "Client sans nom"}</p>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3 mr-0.5" />
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-semibold">{client.totalOrders}</p>
                        <p className="text-[10px] text-muted-foreground">Cmd</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{(client.totalSpent ?? 0).toFixed(0)}</p>
                        <p className="text-[10px] text-muted-foreground">TND</p>
                      </div>
                      <div className="text-center">
                        <p className={`font-semibold ${client.returnCount > 0 ? "text-red-600" : ""}`}>
                          {client.returnCount}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Retours</p>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Client Detail Drawer */}
      <ClientDetailDrawer
        client={selectedClient}
        open={!!selectedClient}
        onOpenChange={(open) => { if (!open) setSelectedClient(null) }}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        onUpdated={() => mutate()}
      />

      {/* Delete Clients Without Phone Dialog */}
      <AlertDialog open={showDeleteNoPhoneDialog} onOpenChange={setShowDeleteNoPhoneDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer les clients sans numero de telephone?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera de facon permanente {clientsWithoutPhone.length} clients qui n'ont pas de numero de telephone. Cette action ne peut pas etre annulee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-destructive">
              ⚠️ {clientsWithoutPhone.length} client{clientsWithoutPhone.length > 1 ? "s" : ""} seront supprimes
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClientsWithoutPhone}
              disabled={isDeletingNoPhone}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingNoPhone ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression en cours...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Oui, supprimer
                </>
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
