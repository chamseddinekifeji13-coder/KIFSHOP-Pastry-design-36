'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Mail, Phone, MapPin, Calendar, DollarSign, Package } from 'lucide-react'

interface PurchaseOrderItem {
  id: string
  itemName: string
  quantity: number
  unit: string
  unitPrice: number
  estimatedTotal: number
}

interface PurchaseOrder {
  id: string
  reference: string
  supplierId: string
  supplierName: string
  supplierEmail?: string
  supplierPhone?: string
  status: 'draft' | 'sent' | 'confirmed' | 'partial_received' | 'received' | 'cancelled'
  totalAmount: number
  items: PurchaseOrderItem[]
  expectedDeliveryDate?: string
  notes?: string
  createdAt: string
  sentAt?: string
  receivedAt?: string
}

interface PurchaseOrderManagementProps {
  tenantId: string
}

function getStatusBadge(status: PurchaseOrder['status']) {
  const config: Record<PurchaseOrder['status'], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: 'Brouillon', variant: 'outline' },
    sent: { label: 'Envoyée', variant: 'default' },
    confirmed: { label: 'Confirmée', variant: 'secondary' },
    partial_received: { label: 'Partiellement reçue', variant: 'secondary' },
    received: { label: 'Reçue', variant: 'default' },
    cancelled: { label: 'Annulée', variant: 'destructive' },
  }
  const { label, variant } = config[status] || { label: status, variant: 'outline' as const }
  return <Badge variant={variant}>{label}</Badge>
}

export function PurchaseOrderManagement({ tenantId }: PurchaseOrderManagementProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewOrder, setShowNewOrder] = useState(false)

  // Récupérer les commandes
  const { data: ordersData, isLoading, mutate } = useSWR(
    `/api/purchase-orders?tenantId=${tenantId}`,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch orders')
      return res.json()
    },
    { revalidateOnFocus: false }
  )

  const purchaseOrders: PurchaseOrder[] = ordersData?.orders || []

  const filteredOrders = purchaseOrders.filter((order) => {
    const matchesSearch = order.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.reference.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSupplier = !selectedSupplier || order.supplierId === selectedSupplier
    return matchesSearch && matchesSupplier
  })

  const suppliers = Array.from(
    new Map(purchaseOrders.map((o) => [o.supplierId, o])).values()
  )

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'outline',
      sent: 'secondary',
      confirmed: 'default',
      partial_received: 'secondary',
      received: 'default',
      cancelled: 'destructive',
    }
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      sent: 'Envoyée',
      confirmed: 'Confirmée',
      partial_received: 'Partiellement reçue',
      received: 'Reçue',
      cancelled: 'Annulée',
    }
    return (
      <Badge variant={variants[status] as any}>
        {labels[status] || status}
      </Badge>
    )
  }

  const statusCounts = {
    draft: filteredOrders.filter(o => o.status === 'draft').length,
    sent: filteredOrders.filter(o => o.status === 'sent').length,
    confirmed: filteredOrders.filter(o => o.status === 'confirmed').length,
    received: filteredOrders.filter(o => o.status === 'received').length,
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Commandes Fournisseurs</h2>
          <p className="text-gray-600 mt-1">Gestion des achats auprès des fournisseurs</p>
        </div>
        <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle Commande
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer une Nouvelle Commande</DialogTitle>
              <DialogDescription>
                Créez une commande d'achat manuelle pour un fournisseur
              </DialogDescription>
            </DialogHeader>
            <NewPurchaseOrderForm tenantId={tenantId} onSuccess={() => {
              setShowNewOrder(false)
              mutate()
            }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-600">{statusCounts.draft}</div>
            <p className="text-sm text-gray-600 mt-1">Brouillons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.sent}</div>
            <p className="text-sm text-gray-600 mt-1">Envoyées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.confirmed}</div>
            <p className="text-sm text-gray-600 mt-1">Confirmées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{statusCounts.received}</div>
            <p className="text-sm text-gray-600 mt-1">Reçues</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-200">
              <Input
                placeholder="Rechercher par fournisseur ou numéro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedSupplier || 'all'} onValueChange={(v) => setSelectedSupplier(v === 'all' ? null : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tous les fournisseurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les fournisseurs</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.supplierId} value={supplier.supplierId}>
                    {supplier.supplierName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des commandes */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              Chargement des commandes...
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              Aucune commande trouvée
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <PurchaseOrderCard key={order.id} order={order} onUpdate={mutate} />
          ))
        )}
      </div>
    </div>
  )
}

interface NewPurchaseOrderFormProps {
  tenantId: string
  onSuccess: () => void
}

function NewPurchaseOrderForm({ tenantId, onSuccess }: NewPurchaseOrderFormProps) {
  const [supplierName, setSupplierName] = useState('')
  const [items, setItems] = useState([{ name: '', quantity: 1, unitPrice: 0 }])
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: 1, unitPrice: 0 }])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          supplierName,
          items,
          deliveryDate,
          notes,
        }),
      })
      if (response.ok) {
        onSuccess()
      }
    } catch (err) {
      console.error('Error creating purchase order:', err)
    } finally {
      setLoading(false)
    }
  }

  const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Fournisseur</label>
        <Input
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          placeholder="Nom du fournisseur"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Articles</label>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Nom de l'article"
                value={item.name}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[index].name = e.target.value
                  setItems(newItems)
                }}
              />
              <Input
                type="number"
                placeholder="Qté"
                value={item.quantity}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[index].quantity = Number(e.target.value)
                  setItems(newItems)
                }}
                className="w-20"
              />
              <Input
                type="number"
                placeholder="Prix"
                value={item.unitPrice}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[index].unitPrice = Number(e.target.value)
                  setItems(newItems)
                }}
                className="w-24"
              />
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={handleAddItem}>
          + Ajouter un article
        </Button>
      </div>

      <div>
        <label className="text-sm font-medium">Date de livraison prévue</label>
        <Input
          type="date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Notes</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Remarques..." />
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-lg font-semibold">
          Total: {total.toLocaleString('fr-TN')} TND
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Création...' : 'Créer la Commande'}
        </Button>
      </div>
    </form>
  )
}

interface PurchaseOrderCardProps {
  order: PurchaseOrder
  onUpdate: () => void
}

function PurchaseOrderCard({ order, onUpdate }: PurchaseOrderCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{order.reference}</h3>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-sm text-gray-600">{order.supplierName}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-purple-600">
              {order.totalAmount.toLocaleString('fr-TN')} TND
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(order.createdAt).toLocaleDateString('fr-TN')}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Détails du fournisseur */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {order.supplierEmail && (
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="h-4 w-4" />
              {order.supplierEmail}
            </div>
          )}
          {order.supplierPhone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4" />
              {order.supplierPhone}
            </div>
          )}
          {order.expectedDeliveryDate && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              {new Date(order.expectedDeliveryDate).toLocaleDateString('fr-TN')}
            </div>
          )}
        </div>

        {/* Articles */}
        {showDetails && (
          <div className="pt-3 border-t space-y-2">
            <p className="font-medium text-sm">{order.items.length} article(s)</p>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                <span>{item.itemName}</span>
                <span className="text-gray-600">
                  {item.quantity} × {item.unitPrice} = {item.estimatedTotal} TND
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Boutons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Masquer détails' : 'Voir détails'}
          </Button>
          {order.status === 'draft' && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => {
              // TODO: Implémenter l'envoi au fournisseur
            }}>
              Envoyer
            </Button>
          )}
          {order.status === 'sent' && (
            <Button size="sm" variant="outline" onClick={() => {
              // TODO: Implémenter le suivi
            }}>
              Suivre
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
