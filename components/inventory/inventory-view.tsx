"use client"

import { useState } from "react"
import { Plus, ClipboardCheck, Calendar, AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useInventorySessions, useRawMaterials, useFinishedProducts } from "@/hooks/use-tenant-data"
import { NewInventoryDrawer } from "./new-inventory-drawer"

export function InventoryView() {
  const { data: sessions, isLoading: sessLoading, mutate: mutateSessions } = useInventorySessions()
  const { data: rawMaterials, isLoading: rmLoading } = useRawMaterials()
  const { data: finishedProducts, isLoading: fpLoading } = useFinishedProducts()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isLoading = sessLoading || rmLoading || fpLoading
  const allSessions = sessions || []
  const allRM = rawMaterials || []
  const allFP = finishedProducts || []

  const totalItems = allRM.length + allFP.length
  const lastSession = allSessions[0]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "en-cours": return <Badge variant="outline" className="gap-1 border-warning text-warning"><Clock className="h-3 w-3" />En cours</Badge>
      case "termine": return <Badge variant="outline" className="gap-1 border-primary text-primary"><CheckCircle2 className="h-3 w-3" />Termine</Badge>
      case "valide": return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Valide</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventaire</h1>
          <p className="text-muted-foreground">Effectuez des comptages physiques et comparez avec le stock theorique</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouvel inventaire</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Articles a inventorier</CardTitle><ClipboardCheck className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent>{isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <><div className="text-2xl font-bold">{totalItems}</div><p className="text-xs text-muted-foreground">{allRM.length} MP + {allFP.length} PF</p></>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Dernier inventaire</CardTitle><Calendar className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent>{isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <><div className="text-2xl font-bold">{lastSession ? new Date(lastSession.createdAt).toLocaleDateString("fr-TN", { day: "2-digit", month: "short" }) : "-"}</div><p className="text-xs text-muted-foreground">{lastSession ? `${lastSession.itemsCount} articles comptes` : "Aucun inventaire"}</p></>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ecarts detectes</CardTitle><AlertTriangle className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent>{isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <><div className="text-2xl font-bold text-destructive">{lastSession?.discrepancies || 0}</div><p className="text-xs text-muted-foreground">lors du dernier inventaire</p></>}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Historique des inventaires</CardTitle><CardDescription>Liste des sessions d{"'"}inventaire effectuees</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : allSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Aucun inventaire</h3>
              <p className="text-sm text-muted-foreground">Commencez par creer votre premier inventaire</p>
              <Button className="mt-4" onClick={() => setDrawerOpen(true)}><Plus className="mr-2 h-4 w-4" />Creer un inventaire</Button>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-center">Articles</TableHead><TableHead className="text-center">Ecarts</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
              <TableBody>
                {allSessions.map(session => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{new Date(session.createdAt).toLocaleDateString("fr-TN", { day: "2-digit", month: "long", year: "numeric" })}</TableCell>
                    <TableCell className="text-center">{session.itemsCount}</TableCell>
                    <TableCell className="text-center">{session.discrepancies > 0 ? <span className="text-destructive font-medium">{session.discrepancies}</span> : <span className="text-primary">0</span>}</TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Apercu du stock actuel</CardTitle><CardDescription>Stock theorique base sur les mouvements enregistres</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (allRM.length === 0 && allFP.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun article en stock</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Article</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Quantite</TableHead><TableHead>Unite</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
              <TableBody>
                {allRM.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><Badge variant="outline">MP</Badge></TableCell>
                    <TableCell className="text-right">{item.currentStock}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.currentStock <= item.minStock && item.minStock > 0 ? <Badge variant="destructive">Critique</Badge> : <Badge variant="secondary">OK</Badge>}</TableCell>
                  </TableRow>
                ))}
                {allFP.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><Badge variant="outline">PF</Badge></TableCell>
                    <TableCell className="text-right">{item.currentStock}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell><Badge variant="secondary">OK</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewInventoryDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSuccess={() => { mutateSessions() }} />
    </div>
  )
}
