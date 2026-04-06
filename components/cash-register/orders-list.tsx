'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { deleteOrder, fetchOrders } from '@/lib/orders/actions'
import { useTenantStore } from '@/hooks/use-tenant-store'
import { Order } from '@/lib/types'

export function OrdersList() {
  const router = useRouter()
  const { tenantId } = useTenantStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadOrders = async () => {
      if (!tenantId) {
        setError('Tenant ID not found')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await fetchOrders(tenantId)
        // Show only last 10 orders, sorted by date descending
        setOrders(data.slice(0, 10))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders')
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [tenantId])

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette commande?')) {
      return
    }

    try {
      const success = await deleteOrder(id)
      if (success) {
        setOrders(orders.filter(order => order.id !== id))
      } else {
        setError('Erreur lors de la suppression')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('fr-TN')
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      nouveau: { color: 'bg-blue-100 text-blue-800', label: 'Nouveau' },
      'en-prep': { color: 'bg-yellow-100 text-yellow-800', label: 'Préparation' },
      pret: { color: 'bg-purple-100 text-purple-800', label: 'Prêt' },
      'en-livraison': { color: 'bg-orange-100 text-orange-800', label: 'En livraison' },
      livre: { color: 'bg-green-100 text-green-800', label: 'Livré' },
      annule: { color: 'bg-red-100 text-red-800', label: 'Annulé' },
    }
    const mapped = statusMap[status] || { color: 'bg-gray-100 text-gray-800', label: status }
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${mapped.color}`}>
        {mapped.label}
      </span>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commandes Récentes</CardTitle>
        <CardDescription>Liste des 10 dernières commandes</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement des commandes...
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune commande trouvée
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.customerName}</TableCell>
                    <TableCell>{order.items.length} article(s)</TableCell>
                    <TableCell className="font-semibold">{order.total} TND</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(order.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
