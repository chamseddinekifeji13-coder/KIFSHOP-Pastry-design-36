"use client"

import { useState } from "react"
import { AlertTriangle, AlertCircle, Info, Zap, Plus, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useStockAlerts } from "@/hooks/use-workflow-data"
import { useToast } from "@/components/ui/use-toast"

interface StockAlertsPanelProps {
  tenantId: string
  onConvertAlert?: (alertId: string) => Promise<void>
}

export function StockAlertsPanel({ tenantId, onConvertAlert }: StockAlertsPanelProps) {
  const { alerts, isLoading, refetch } = useStockAlerts(tenantId)
  const { toast } = useToast()
  const [convertingId, setConvertingId] = useState<string | null>(null)

  const severityConfig = {
    critical: {
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      badge: "destructive",
    },
    warning: {
      icon: AlertCircle,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      badge: "outline",
    },
    info: {
      icon: Info,
      color: "text-blue-600",
      bg: "bg-blue-50",
      badge: "secondary",
    },
  }

  const handleConvertAlert = async (alertId: string) => {
    if (!onConvertAlert) return
    
    setConvertingId(alertId)
    try {
      await onConvertAlert(alertId)
      toast({ title: "Succès", description: "Alerte convertie en bon d'approvisionnement" })
      refetch()
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la conversion",
        variant: "destructive",
      })
    } finally {
      setConvertingId(null)
    }
  }

  const alertsByStatus = {
    critical: alerts.filter(a => a.severity === "critical" && a.status === "pending"),
    warning: alerts.filter(a => a.severity === "warning" && a.status === "pending"),
    info: alerts.filter(a => a.severity === "info" && a.status === "pending"),
    converted: alerts.filter(a => a.status === "converted"),
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{alertsByStatus.critical.length}</div>
            <p className="text-xs text-muted-foreground">Critiques</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{alertsByStatus.warning.length}</div>
            <p className="text-xs text-muted-foreground">Avertissements</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{alertsByStatus.info.length}</div>
            <p className="text-xs text-muted-foreground">Info</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{alertsByStatus.converted.length}</div>
            <p className="text-xs text-muted-foreground">Converties</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Zap className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Aucune alerte stock</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Alertes Stock Détails</CardTitle>
            <CardDescription>Gestion des seuils minimums</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stock Actuel</TableHead>
                    <TableHead>Min</TableHead>
                    <TableHead>Sévérité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts
                    .filter(a => a.status === "pending")
                    .map(alert => {
                      const config = severityConfig[alert.severity]
                      const Icon = config.icon

                      return (
                        <TableRow key={alert.id} className={config.bg}>
                          <TableCell className="font-medium">{alert.item_name}</TableCell>
                          <TableCell className="text-xs capitalize">{alert.item_type}</TableCell>
                          <TableCell>{alert.current_stock} {alert.item_unit}</TableCell>
                          <TableCell>{alert.min_stock} {alert.item_unit}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Icon className={`h-4 w-4 ${config.color}`} />
                              <Badge variant={config.badge as any} className="capitalize">
                                {alert.severity}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{alert.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleConvertAlert(alert.id)}
                              disabled={convertingId === alert.id}
                            >
                              {convertingId === alert.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Créer Bon
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
