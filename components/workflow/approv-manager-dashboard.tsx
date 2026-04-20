'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, XCircle, Clock, Send, Edit2, Trash2 } from 'lucide-react'
import {
  validateBonApprovisionnement,
  createPurchaseOrdersFromBonApprov,
  fetchBonsApprovisionnement,
  cancelBonApprovisionnement,
} from '@/lib/workflow/actions'

interface BonApprovItem {
  id: string
  itemName: string
  itemUnit: string
  requestedQuantity: number
  validatedQuantity?: number
  estimatedUnitPrice?: number
  assignedSupplier?: string
  status: string
}

interface BonApprov {
  id: string
  reference: string
  status: 'draft' | 'validated' | 'sent_to_suppliers' | 'partially_ordered' | 'fully_ordered' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  totalItems: number
  estimatedTotal: number
  createdAt: string
  validatedAt?: string
  items: BonApprovItem[]
}

interface ApprovManagerDashboardProps {
  tenantId: string
}

function getPriorityColor(priority: string): "default" | "secondary" | "destructive" | "outline" {
  switch (priority) {
    case 'urgent': return 'destructive'
    case 'high': return 'default'
    case 'normal': return 'secondary'
    case 'low': return 'outline'
    default: return 'secondary'
  }
}

export function ApprovManagerDashboard({ tenantId }: ApprovManagerDashboardProps) {
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Récupérer les bons d'approvisionnement
  const { data: bonsData, isLoading, error, mutate } = useSWR(
    `/api/bons-approvisionnement?tenantId=${tenantId}`,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch bons')
      return res.json()
    },
    { revalidateOnFocus: false }
  )

  const bons: BonApprov[] = bonsData?.bons || []

  const handleValidateBon = async (bonId: string) => {
    setValidatingId(bonId)
    try {
      // TODO: Implémenter l'interface de validation
      const result = await validateBonApprovisionnement(bonId, tenantId, [])
      if (result) {
        mutate()
      }
    } catch (err) {
      console.error('Error validating bon:', err)
    } finally {
      setValidatingId(null)
    }
  }

  const handleSendToSuppliers = async (bonId: string) => {
    setSendingId(bonId)
    try {
      const result = await createPurchaseOrdersFromBonApprov(bonId, tenantId)
      if (result) {
        mutate()
        alert(`${result.length} commande(s) fournisseur créée(s)`)
      }
    } catch (err) {
      console.error('Error sending to suppliers:', err)
      alert('Erreur lors de la création des commandes')
    } finally {
      setSendingId(null)
    }
  }

  const handleCancelBon = async (bonId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce bon ?')) return
    setCancelingId(bonId)
    try {
      const result = await cancelBonApprovisionnement(bonId, tenantId, 'Annulation par responsable appro')
      if (result) {
        mutate()
      }
    } catch (err) {
      console.error('Error canceling bon:', err)
    } finally {
      setCancelingId(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive'
      case 'high':
        return 'secondary'
      case 'normal':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'draft':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'sent_to_suppliers':
        return <Send className="h-4 w-4 text-blue-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      validated: 'Validé',
      sent_to_suppliers: 'Envoyé aux fournisseurs',
      partially_ordered: 'Partiellement commandé',
      fully_ordered: 'Complètement commandé',
      cancelled: 'Annulé',
    }
    return labels[status] || status
  }

  const draftBons = bons.filter(b => b.status === 'draft')
  const validatedBons = bons.filter(b => b.status === 'validated')
  const sentBons = bons.filter(b => ['sent_to_suppliers', 'partially_ordered', 'fully_ordered'].includes(b.status))

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Brouillons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">{draftBons.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Validés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{validatedBons.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Envoyés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{sentBons.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Estimé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {(bons.reduce((sum, b) => sum + b.estimatedTotal, 0)).toLocaleString('fr-TN')} TND
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets par statut */}
      <Tabs defaultValue="draft" className="space-y-4">
        <TabsList>
          <TabsTrigger value="draft">Brouillons ({draftBons.length})</TabsTrigger>
          <TabsTrigger value="validated">Validés ({validatedBons.length})</TabsTrigger>
          <TabsTrigger value="sent">Envoyés ({sentBons.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="draft" className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">Chargement...</CardContent>
            </Card>
          ) : draftBons.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">Aucun bon en brouillon</CardContent>
            </Card>
          ) : (
            draftBons.map((bon) => (
              <BonApprovCard
                key={bon.id}
                bon={bon}
                onValidate={() => handleValidateBon(bon.id)}
                onSend={() => handleSendToSuppliers(bon.id)}
                onCancel={() => handleCancelBon(bon.id)}
                isProcessing={validatingId === bon.id || sendingId === bon.id || cancelingId === bon.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="validated" className="space-y-3">
          {validatedBons.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">Aucun bon validé</CardContent>
            </Card>
          ) : (
            validatedBons.map((bon) => (
              <BonApprovCard
                key={bon.id}
                bon={bon}
                onValidate={() => handleValidateBon(bon.id)}
                onSend={() => handleSendToSuppliers(bon.id)}
                onCancel={() => handleCancelBon(bon.id)}
                isProcessing={sendingId === bon.id || cancelingId === bon.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-3">
          {sentBons.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">Aucun bon envoyé</CardContent>
            </Card>
          ) : (
            sentBons.map((bon) => (
              <BonApprovCard key={bon.id} bon={bon} isProcessing={false} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface BonApprovCardProps {
  bon: BonApprov
  onValidate?: () => void
  onSend?: () => void
  onCancel?: () => void
  isProcessing?: boolean
}

function BonApprovCard({ bon, onValidate, onSend, onCancel, isProcessing }: BonApprovCardProps) {
  const canValidate = bon.status === 'draft'
  const canSend = bon.status === 'validated'
  const canCancel = bon.status !== 'cancelled' && bon.status !== 'sent_to_suppliers'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{bon.reference}</h3>
              <Badge variant={getPriorityColor(bon.priority)}>
                {bon.priority.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              {bon.totalItems} article(s) | Estimé: {bon.estimatedTotal.toLocaleString('fr-TN')} TND
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            {bon.status === 'draft' ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
            {bon.status === 'draft' ? 'Brouillon' : bon.status === 'validated' ? 'Validé' : 'Envoyé'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Détail des articles */}
        <div className="space-y-2">
          {bon.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between text-sm p-2 bg-gray-50 rounded">
              <div>
                <p className="font-medium">{item.itemName}</p>
                <p className="text-gray-600">
                  Qté: {item.validatedQuantity || item.requestedQuantity} {item.itemUnit}
                  {item.estimatedUnitPrice && ` @ ${item.estimatedUnitPrice} TND`}
                </p>
                {item.assignedSupplier && (
                  <p className="text-gray-600">Fournisseur: {item.assignedSupplier}</p>
                )}
              </div>
              <Badge variant="outline">{item.status}</Badge>
            </div>
          ))}
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-2 pt-2">
          {canValidate && (
            <Button
              onClick={onValidate}
              disabled={isProcessing}
              size="sm"
              variant="default"
            >
              {isProcessing ? 'Validation...' : 'Valider'}
            </Button>
          )}
          {canSend && (
            <Button
              onClick={onSend}
              disabled={isProcessing}
              size="sm"
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? 'Envoi...' : 'Envoyer aux Fournisseurs'}
            </Button>
          )}
          {canCancel && (
            <Button
              onClick={onCancel}
              disabled={isProcessing}
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {isProcessing ? 'Annulation...' : 'Annuler'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
