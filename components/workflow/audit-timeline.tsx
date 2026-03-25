'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fetchWorkflowAudit } from '@/lib/workflow/actions'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface AuditLog {
  id: string
  entityType: 'stock_alert' | 'bon_approvisionnement' | 'purchase_order'
  entityId: string
  action: string
  oldStatus?: string
  newStatus?: string
  details?: Record<string, any>
  performedAt: string
  performedBy?: string
}

interface AuditTimelineProps {
  tenantId: string
  entityType?: string
  entityId?: string
}

export function AuditTimeline({ tenantId, entityType, entityId }: AuditTimelineProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAudit = async () => {
      try {
        const data = await fetchWorkflowAudit(tenantId, entityType, entityId)
        setLogs(data)
      } catch (err) {
        console.error('Error loading audit log:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAudit()
  }, [tenantId, entityType, entityId])

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'Créé',
      updated: 'Modifié',
      validated: 'Validé',
      cancelled: 'Annulé',
      converted: 'Converti',
      sent_to_supplier: 'Envoyé au fournisseur',
      ordered: 'Commandé',
      received: 'Reçu',
    }
    return labels[action] || action
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'blue'
      case 'validated':
        return 'green'
      case 'cancelled':
        return 'red'
      case 'ordered':
        return 'purple'
      case 'received':
        return 'emerald'
      default:
        return 'gray'
    }
  }

  const getEntityLabel = (type: string) => {
    const labels: Record<string, string> = {
      stock_alert: 'Alerte Stock',
      bon_approvisionnement: 'Bon Appro',
      purchase_order: 'Commande Fournisseur',
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Chargement de l'historique...
        </CardContent>
      </Card>
    )
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Aucune action enregistrée
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Timeline visuelle */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Actions</CardTitle>
          <CardDescription>
            {entityId ? 'Timeline complète des modifications' : 'Dernières actions du workflow'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {logs.map((log, index) => (
              <div key={log.id} className="flex gap-4 pb-6 relative">
                {/* Ligne de connexion */}
                {index < logs.length - 1 && (
                  <div className="absolute left-6 top-10 bottom-0 w-0.5 bg-gray-200" />
                )}

                {/* Point de la timeline */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border-2 border-white relative z-10 bg-${getActionColor(
                      log.action
                    )}-500`}
                  />
                </div>

                {/* Contenu */}
                <div className="flex-1 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {getActionLabel(log.action)}
                        </span>
                        <Badge variant="outline">{getEntityLabel(log.entityType)}</Badge>
                        {log.newStatus && (
                          <Badge variant="secondary">
                            {log.oldStatus} → {log.newStatus}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDistanceToNow(new Date(log.performedAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                      {log.performedBy && (
                        <p className="text-xs text-gray-500 mt-1">
                          Par: {log.performedBy}
                        </p>
                      )}
                    </div>
                    <time className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.performedAt).toLocaleDateString('fr-TN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>

                  {/* Détails additionnels */}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <details className="mt-2 cursor-pointer">
                      <summary className="text-xs text-blue-600 hover:text-blue-700">
                        Voir les détails
                      </summary>
                      <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {logs.filter(l => l.action === 'created').length}
            </div>
            <p className="text-sm text-gray-600 mt-1">Créations</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {logs.filter(l => l.action === 'validated').length}
            </div>
            <p className="text-sm text-gray-600 mt-1">Validations</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {logs.filter(l => l.action === 'ordered').length}
            </div>
            <p className="text-sm text-gray-600 mt-1">Commandes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {logs.filter(l => l.action === 'cancelled').length}
            </div>
            <p className="text-sm text-gray-600 mt-1">Annulations</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
