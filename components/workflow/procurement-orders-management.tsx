"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useBonApprovisionnement } from "@/hooks/use-workflow-data"
import { CheckCircle, Send, XCircle, Loader2 } from "lucide-react"

interface ProcurementOrdersManagementProps {
  tenantId: string
  onValidate?: (bonId: string) => Promise<void>
  onSend?: (bonId: string) => Promise<void>
  onCancel?: (bonId: string) => Promise<void>
}

export function ProcurementOrdersManagement({
  tenantId,
  onValidate,
  onSend,
  onCancel,
}: ProcurementOrdersManagementProps) {
  const { orders, isLoading, refetch } = useBonApprovisionnement(tenantId)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<string | null>(null)

  const statusConfig: Record<string, { label: string; color: string; badge: any }> = {
    draft: { label: "Brouillon", color: "bg-gray-50", badge: "outline" },
    validated: { label: "Validé", color: "bg-blue-50", badge: "default" },
    sent_to_suppliers: { label: "Envoyé", color: "bg-green-50", badge: "default" },
    partially_ordered: { label: "Partiellement Commandé", color: "bg-yellow-50", badge: "outline" },
    fully_ordered: { label: "Complètement Commandé", color: "bg-green-100", badge: "default" },
    cancelled: { label: "Annulé", color: "bg-red-50", badge: "destructive" },
  }

  const priorityColors: Record<string, string> = {
    low: "bg-blue-100 text-blue-800",
    normal: "bg-gray-100 text-gray-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  }

  const handleAction = async (bonId: string, action: "validate" | "send" | "cancel") => {
    setLoadingId(bonId)
    setActionType(action)

    try {
      if (action === "validate" && onValidate) await onValidate(bonId)
      if (action === "send" && onSend) await onSend(bonId)
      if (action === "cancel" && onCancel) await onCancel(bonId)
      refetch()
    } catch (error) {
      console.error(`Error during ${action}:`, error)
    } finally {
      setLoadingId(null)
      setActionType(null)
    }
  }

  const ordersByStatus = {
    draft: orders.filter(o => o.status === "draft"),
    validated: orders.filter(o => o.status === "validated"),
    sent: orders.filter(o =>
      o.status === "sent_to_suppliers" || o.status === "partially_ordered" || o.status === "fully_ordered"
    ),
    cancelled: orders.filter(o => o.status === "cancelled"),
  }

  const renderOrdersTable = (statusOrders: any[], showActions: boolean) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Référence</TableHead>
            <TableHead>Articles</TableHead>
            <TableHead>Total Estimé</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Créé le</TableHead>
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {statusOrders.map(order => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-sm">{order.reference}</TableCell>
              <TableCell>{order.total_items}</TableCell>
              <TableCell className="font-medium">
                {Number(order.estimated_total || 0).toLocaleString("fr-TN")} TND
              </TableCell>
              <TableCell>
                <Badge className={priorityColors[order.priority]}>
                  {order.priority}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(order.created_at).toLocaleDateString("fr-TN")}
              </TableCell>
              {showActions && (
                <TableCell className="space-x-1">
                  {order.status === "draft" && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAction(order.id, "validate")}
                        disabled={loadingId === order.id}
                      >
                        {loadingId === order.id && actionType === "validate" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(order.id, "cancel")}
                        disabled={loadingId === order.id}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {order.status === "validated" && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleAction(order.id, "send")}
                      disabled={loadingId === order.id}
                    >
                      {loadingId === order.id && actionType === "send" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <Tabs defaultValue="draft" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="draft">
          Brouillons ({ordersByStatus.draft.length})
        </TabsTrigger>
        <TabsTrigger value="validated">
          Validés ({ordersByStatus.validated.length})
        </TabsTrigger>
        <TabsTrigger value="sent">
          Envoyés ({ordersByStatus.sent.length})
        </TabsTrigger>
        <TabsTrigger value="cancelled">
          Annulés ({ordersByStatus.cancelled.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="draft">
        <Card>
          <CardHeader>
            <CardTitle>Bons d'Approvisionnement - Brouillons</CardTitle>
            <CardDescription>En attente de validation</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersByStatus.draft.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucun brouillon</div>
            ) : (
              renderOrdersTable(ordersByStatus.draft, true)
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="validated">
        <Card>
          <CardHeader>
            <CardTitle>Bons d'Approvisionnement - Validés</CardTitle>
            <CardDescription>Prêts à être envoyés aux fournisseurs</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersByStatus.validated.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucun bon validé</div>
            ) : (
              renderOrdersTable(ordersByStatus.validated, true)
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sent">
        <Card>
          <CardHeader>
            <CardTitle>Bons d'Approvisionnement - Envoyés</CardTitle>
            <CardDescription>Commandes en cours</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersByStatus.sent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucun bon envoyé</div>
            ) : (
              renderOrdersTable(ordersByStatus.sent, false)
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="cancelled">
        <Card>
          <CardHeader>
            <CardTitle>Bons d'Approvisionnement - Annulés</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersByStatus.cancelled.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucun bon annulé</div>
            ) : (
              renderOrdersTable(ordersByStatus.cancelled, false)
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
