"use client"

import { useState } from "react"
import { Plus, Search, Users, MessageCircle, Phone, Globe, Instagram, Filter, Loader2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useTenant } from "@/lib/tenant-context"
import { useProspects } from "@/hooks/use-tenant-data"
import { updateProspectStatus, deleteProspect, type Prospect } from "@/lib/prospects/actions"
import { toast } from "sonner"
import { NewProspectDrawer } from "./new-prospect-drawer"
import { ProspectDetailDrawer } from "./prospect-detail-drawer"
import { useI18n } from "@/lib/i18n/context"

const sourceIcons: Record<string, typeof MessageCircle> = {
  instagram: Instagram, tiktok: Globe, whatsapp: MessageCircle,
  messenger: MessageCircle, facebook: Globe, phone: Phone, autre: Users,
}
const sourceLabels: Record<string, string> = {
  instagram: "Instagram", tiktok: "TikTok", whatsapp: "WhatsApp",
  messenger: "Messenger", facebook: "Facebook", phone: "Telephone", autre: "Autre",
}
const sourceColors: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-700", tiktok: "bg-gray-100 text-gray-800",
  whatsapp: "bg-green-100 text-green-700", messenger: "bg-blue-100 text-blue-700",
  facebook: "bg-indigo-100 text-indigo-700", phone: "bg-orange-100 text-orange-700",
  autre: "bg-gray-100 text-gray-700",
}
const statusLabels: Record<string, string> = {
  nouveau: "Nouveau", contacte: "Contacte", "en-discussion": "En discussion",
  converti: "Converti", perdu: "Perdu",
}
const statusColors: Record<string, string> = {
  nouveau: "bg-blue-100 text-blue-700", contacte: "bg-amber-100 text-amber-700",
  "en-discussion": "bg-purple-100 text-purple-700", converti: "bg-green-100 text-green-700",
  perdu: "bg-red-100 text-red-700",
}

export function ProspectsView() {
  const { t } = useI18n()
  const { currentTenant } = useTenant()
  const { data: prospects = [], isLoading, mutate } = useProspects()
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterSource, setFilterSource] = useState<string>("all")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)

  const filtered = prospects.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.phone || "").includes(search)
    const matchStatus = filterStatus === "all" || p.status === filterStatus
    const matchSource = filterSource === "all" || p.source === filterSource
    return matchSearch && matchStatus && matchSource
  })

  const stats = {
    total: prospects.length,
    nouveau: prospects.filter(p => p.status === "nouveau").length,
    contacte: prospects.filter(p => p.status === "contacte" || p.status === "en-discussion").length,
    converti: prospects.filter(p => p.status === "converti").length,
    perdu: prospects.filter(p => p.status === "perdu").length,
  }
  const conversionRate = stats.total > 0 ? Math.round((stats.converti / stats.total) * 100) : 0

  const handleQuickStatus = async (id: string, status: Prospect["status"]) => {
    const ok = await updateProspectStatus(id, status)
    if (ok) { toast.success(`Statut mis a jour: ${statusLabels[status]}`); mutate() }
    else toast.error("Erreur de mise a jour")
  }

  const handleDelete = async (id: string) => {
    const ok = await deleteProspect(id)
    if (ok) { toast.success("Prospect supprime"); mutate() }
    else toast.error("Erreur de suppression")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("prospects.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("prospects.subtitle")}</p>
        </div>
        <Button className="bg-[#4A7C59] hover:bg-[#3d6b4a] text-white" onClick={() => setDrawerOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau prospect
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">A contacter</p>
            <p className="text-2xl font-bold mt-1">{stats.nouveau}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">En cours</p>
            <p className="text-2xl font-bold mt-1">{stats.contacte}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Convertis</p>
            <p className="text-2xl font-bold mt-1">{stats.converti}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#D4A373]">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Taux conversion</p>
            <p className="text-2xl font-bold mt-1">{conversionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom ou telephone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Tabs value={filterStatus} onValueChange={setFilterStatus}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-3">Tous</TabsTrigger>
            <TabsTrigger value="nouveau" className="text-xs px-3">Nouveaux</TabsTrigger>
            <TabsTrigger value="contacte" className="text-xs px-3">Contactes</TabsTrigger>
            <TabsTrigger value="en-discussion" className="text-xs px-3">En discussion</TabsTrigger>
            <TabsTrigger value="converti" className="text-xs px-3">Convertis</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* List */}
      {filtered.length === 0 && prospects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4A7C59]/10 mb-4">
              <UserPlus className="h-8 w-8 text-[#4A7C59]" />
            </div>
            <h3 className="text-lg font-semibold">Aucun prospect</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
              Ajoutez vos contacts des reseaux sociaux pour les suivre et les convertir en clients
            </p>
            <Button className="mt-6 bg-[#4A7C59] hover:bg-[#3d6b4a] text-white" onClick={() => setDrawerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un prospect
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Filter className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Aucun prospect ne correspond aux filtres</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((prospect) => {
            const SourceIcon = sourceIcons[prospect.source] || Users
            const hasReminder = prospect.reminderAt && !prospect.reminderDismissed && new Date(prospect.reminderAt) <= new Date()
            return (
              <Card
                key={prospect.id}
                className={`cursor-pointer transition-all hover:shadow-md ${hasReminder ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}
                onClick={() => setSelectedProspect(prospect)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Avatar / Source Icon */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${sourceColors[prospect.source] || "bg-gray-100 text-gray-700"}`}>
                    <SourceIcon className="h-5 w-5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{prospect.name}</p>
                      {hasReminder && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] animate-pulse">
                          Rappel
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      {prospect.phone && <span>{prospect.phone}</span>}
                      <span>{sourceLabels[prospect.source] || prospect.source}</span>
                      <span>{new Date(prospect.createdAt).toLocaleDateString("fr-TN")}</span>
                    </div>
                    {prospect.message && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">{prospect.message}</p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <Badge className={`shrink-0 text-[11px] ${statusColors[prospect.status] || ""}`}>
                    {statusLabels[prospect.status] || prospect.status}
                  </Badge>

                  {/* Quick Actions */}
                  <div className="hidden sm:flex gap-1 shrink-0">
                    {prospect.status === "nouveau" && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={(e) => { e.stopPropagation(); handleQuickStatus(prospect.id, "contacte") }}>
                        Contacte
                      </Button>
                    )}
                    {(prospect.status === "contacte" || prospect.status === "en-discussion") && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); handleQuickStatus(prospect.id, "converti") }}>
                        Converti
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Drawers */}
      <NewProspectDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSuccess={() => mutate()} />
      {selectedProspect && (
        <ProspectDetailDrawer
          prospect={selectedProspect}
          open={!!selectedProspect}
          onOpenChange={(open) => { if (!open) setSelectedProspect(null) }}
          onUpdate={() => mutate()}
          onDelete={() => { handleDelete(selectedProspect.id); setSelectedProspect(null) }}
        />
      )}
    </div>
  )
}
