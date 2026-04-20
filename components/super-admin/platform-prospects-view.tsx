"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Users, TrendingUp, CalendarClock, Sparkles, Phone, Mail, MapPin, GripVertical, LayoutGrid, List } from "lucide-react"
import { fetchPlatformProspects, fetchProspectStats, updatePlatformProspect } from "@/lib/super-admin/prospect-actions"
import {
  type PlatformProspect, type ProspectStatus, type ProspectSource,
  STATUS_LABELS, STATUS_COLORS, SOURCE_LABELS, PIPELINE_ORDER,
} from "@/lib/super-admin/prospect-types"
import { NewProspectDrawer } from "./new-prospect-drawer"
import { ProspectDetailDrawer } from "./prospect-detail-drawer"
import { toast } from "sonner"

const PIPELINE_STATUSES: ProspectStatus[] = ["nouveau", "contacte", "interesse", "demo_planifiee", "negociation"]

export function PlatformProspectsView() {
  const [prospects, setProspects] = useState<PlatformProspect[]>([])
  const [stats, setStats] = useState({ total: 0, byStatus: { nouveau: 0, contacte: 0, interesse: 0, demo_planifiee: 0, negociation: 0, converti: 0, perdu: 0 }, conversionRate: 0, upcomingActions: 0, thisMonth: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCity, setFilterCity] = useState("all")
  const [filterSource, setFilterSource] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [newDrawerOpen, setNewDrawerOpen] = useState(false)
  const [detailProspect, setDetailProspect] = useState<PlatformProspect | null>(null)
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban")

  const loadData = async () => {
    setLoading(true)
    const [p, s] = await Promise.all([fetchPlatformProspects(), fetchProspectStats()])
    setProspects(p)
    setStats(s)
    setDetailProspect((current) => {
      if (!current) return null
      return p.find((item) => item.id === current.id) || current
    })
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const cities = useMemo(() => [...new Set(prospects.map(p => p.city).filter(Boolean))].sort(), [prospects])

  const filtered = useMemo(() => {
    return prospects.filter(p => {
      if (search && !p.businessName.toLowerCase().includes(search.toLowerCase()) && !p.ownerName?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCity !== "all" && p.city !== filterCity) return false
      if (filterSource !== "all" && p.source !== filterSource) return false
      if (filterStatus !== "all" && p.status !== filterStatus) return false
      return true
    })
  }, [prospects, search, filterCity, filterSource, filterStatus])

  const handleStatusChange = async (id: string, status: ProspectStatus): Promise<boolean> => {
    const ok = await updatePlatformProspect(id, { status })
    if (ok) {
      setDetailProspect((current) => (current && current.id === id ? { ...current, status } : current))
      toast.success(`Statut mis a jour: ${STATUS_LABELS[status]}`)
      await loadData()
      return true
    } else {
      toast.error("Erreur lors de la mise a jour")
      return false
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prospection</h1>
          <p className="text-sm text-muted-foreground">Pipeline de prospection de nouvelles patisseries</p>
        </div>
        <Button className="bg-[#4A7C59] hover:bg-[#3d6649] text-white" onClick={() => setNewDrawerOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau prospect
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total prospects", value: stats.total, icon: Users, bg: "bg-blue-50", color: "text-blue-600" },
          { label: "Taux conversion", value: `${stats.conversionRate}%`, icon: TrendingUp, bg: "bg-emerald-50", color: "text-emerald-600" },
          { label: "Relances a venir", value: stats.upcomingActions, icon: CalendarClock, bg: "bg-purple-50", color: "text-purple-600" },
          { label: "Ce mois-ci", value: stats.thisMonth, icon: Sparkles, bg: "bg-amber-50", color: "text-amber-600" },
          { label: "Convertis", value: stats.byStatus.converti, icon: Users, bg: "bg-green-50", color: "text-green-600" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                  <p className="text-lg font-bold leading-tight">{kpi.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + View Toggle */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterCity} onValueChange={setFilterCity}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Ville" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes villes</SelectItem>
                {cities.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes sources</SelectItem>
                {(Object.keys(SOURCE_LABELS) as ProspectSource[]).map(s => <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {(Object.keys(STATUS_LABELS) as ProspectStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center border rounded-lg overflow-hidden ml-auto">
              <Button variant={viewMode === "kanban" ? "default" : "ghost"} size="sm" className={viewMode === "kanban" ? "bg-[#4A7C59] hover:bg-[#3d6649] text-white rounded-none" : "rounded-none"} onClick={() => setViewMode("kanban")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className={viewMode === "table" ? "bg-[#4A7C59] hover:bg-[#3d6649] text-white rounded-none" : "rounded-none"} onClick={() => setViewMode("table")}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : viewMode === "kanban" ? (
        /* Kanban View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
          {PIPELINE_STATUSES.map(status => {
            const items = filtered.filter(p => p.status === status)
            return (
              <div key={status} className="min-w-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Badge>
                  <span className="text-xs text-muted-foreground font-medium">{items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.length === 0 && (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">Aucun prospect</div>
                  )}
                  {items.map(p => (
                    <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailProspect(p)}>
                      <CardContent className="p-3 space-y-1.5">
                        <p className="font-semibold text-sm truncate">{p.businessName}</p>
                        {p.ownerName && <p className="text-xs text-muted-foreground truncate">{p.ownerName}</p>}
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                          {p.city && <span className="text-xs flex items-center gap-0.5 text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{p.city}</span></span>}
                          {p.phone && <span className="text-xs flex items-center gap-0.5 text-muted-foreground"><Phone className="h-3 w-3 shrink-0" /><span className="truncate">{p.phone}</span></span>}
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{SOURCE_LABELS[p.source]}</Badge>
                          {(p.demoScheduledAt || p.nextActionDate) && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <CalendarClock className="h-2.5 w-2.5" />
                              {new Date(p.demoScheduledAt || p.nextActionDate!).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                            </span>
                          )}
                        </div>
                        {(p.demoScheduledAt || p.demoContactPerson) && (
                          <div className="rounded bg-purple-50 px-2 py-1 text-[10px] text-purple-700">
                            {p.demoScheduledAt ? new Date(p.demoScheduledAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Demo planifiee"}
                            {p.demoContactPerson ? ` - ${p.demoContactPerson}` : ""}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {/* Quick status advance button */}
                {items.length > 0 && (
                  <div className="mt-2 text-center">
                    <span className="text-xs text-muted-foreground">{items.length} prospect{items.length > 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
            )
          })}
          {/* Converti + Perdu columns */}
          {(["converti", "perdu"] as ProspectStatus[]).map(status => {
            const items = filtered.filter(p => p.status === status)
            return (
              <div key={status} className="min-w-0 opacity-75">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Badge>
                  <span className="text-xs text-muted-foreground font-medium">{items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.length === 0 && (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">Aucun</div>
                  )}
                  {items.map(p => (
                    <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailProspect(p)}>
                      <CardContent className="p-4">
                        <p className="font-semibold text-sm">{p.businessName}</p>
                        {p.city && <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{p.city}</span>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patisserie</TableHead>
                  <TableHead>Gerant</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Prochaine action</TableHead>
                  <TableHead>Demo planifiee</TableHead>
                  <TableHead>Date creation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Aucun prospect trouve</TableCell></TableRow>
                ) : filtered.map(p => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailProspect(p)}>
                    <TableCell className="font-medium">{p.businessName}</TableCell>
                    <TableCell>{p.ownerName || "-"}</TableCell>
                    <TableCell>{p.city || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {p.phone && <span className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                        {p.email && <span className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{SOURCE_LABELS[p.source]}</Badge></TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.nextAction ? (
                        <div>
                          <p className="text-xs">{p.nextAction}</p>
                          {p.nextActionDate && <p className="text-xs text-muted-foreground">{new Date(p.nextActionDate).toLocaleDateString("fr-FR")}</p>}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {(p.demoScheduledAt || p.demoContactPerson) ? (
                        <div>
                          {p.demoScheduledAt && (
                            <p className="text-xs">{new Date(p.demoScheduledAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                          )}
                          {p.demoContactPerson && <p className="text-xs text-muted-foreground">{p.demoContactPerson}</p>}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Drawers */}
      <NewProspectDrawer open={newDrawerOpen} onOpenChange={setNewDrawerOpen} onCreated={loadData} />
      {detailProspect && (
        <ProspectDetailDrawer
          prospect={detailProspect}
          open={!!detailProspect}
          onOpenChange={(open) => { if (!open) setDetailProspect(null) }}
          onUpdated={loadData}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
