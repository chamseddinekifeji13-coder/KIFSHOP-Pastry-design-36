'use client'

import { useEffect, useState } from 'react'
import { FileText, Plus, RefreshCw, Loader2, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProcurementOrdersManagement } from '@/components/workflow/procurement-orders-management'
import { useWorkflowData } from '@/hooks/use-workflow-data'
import { useToast } from '@/components/ui/use-toast'

export default function ProcurementOrdersPage() {
  const { toast } = useToast()
  const { procurementOrders, stats, loading, error, refetch } = useWorkflowData()
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (error) {
      toast({
        title: 'Erreur',
        description: error,
        variant: 'destructive',
      })
    }
  }, [error, toast])

  const handleRefresh = async () => {
    const success = await refetch()
    if (success) {
      toast({
        title: 'Succès',
        description: 'Commandes mises à jour',
      })
    }
  }

  const filteredOrders = procurementOrders.filter(order => {
    if (activeTab === 'all') return true
    return order.status === activeTab
  })

  const statusConfig: Record<string, { label: string; color: string }> = {
    'DRAFT': { label: 'Brouillon', color: 'text-gray-600' },
    'VALIDATED': { label: 'Validé', color: 'text-blue-600' },
    'SENT': { label: 'Envoyé', color: 'text-green-600' },
    'CANCELLED': { label: 'Annulé', color: 'text-red-600' },
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-500" />
              Bons d'Approvisionnement
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos commandes auprès des fournisseurs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualiser
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau bon
            </Button>
          </div>
        </div>

        {/* Stats Tabs */}
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList>
            <TabsTrigger value="all">
              Tous ({procurementOrders.length})
            </TabsTrigger>
            <TabsTrigger value="DRAFT">
              Brouillons ({stats?.draft || 0})
            </TabsTrigger>
            <TabsTrigger value="VALIDATED">
              Validés ({stats?.validated || 0})
            </TabsTrigger>
            <TabsTrigger value="SENT">
              Envoyés ({stats?.sent || 0})
            </TabsTrigger>
            <TabsTrigger value="CANCELLED">
              Annulés ({stats?.cancelled || 0})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Main Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {activeTab === 'all' ? 'Aucun bon' : `Aucun bon ${statusConfig[activeTab]?.label.toLowerCase()}`}
              </h3>
              <p className="text-muted-foreground">
                {activeTab === 'all' 
                  ? 'Créez un nouveau bon d\'approvisionnement'
                  : 'Aucune commande dans ce statut'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ProcurementOrdersManagement orders={filteredOrders} onRefresh={handleRefresh} />
        )}
      </div>
    </div>
  )
}
