'use client'

import { useEffect, useState } from 'react'
import { Eye, Search, RefreshCw, Loader2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AuditTimeline } from '@/components/workflow/audit-timeline'
import { useWorkflowData } from '@/hooks/use-workflow-data'
import { useToast } from '@/components/ui/use-toast'

export default function TraceabilityPage() {
  const { toast } = useToast()
  const { auditLog, loading, error, refetch } = useWorkflowData()
  const [searchId, setSearchId] = useState('')
  const [filteredLog, setFilteredLog] = useState(auditLog)

  useEffect(() => {
    if (error) {
      toast({
        title: 'Erreur',
        description: error,
        variant: 'destructive',
      })
    }
  }, [error, toast])

  useEffect(() => {
    if (searchId.trim() === '') {
      setFilteredLog(auditLog)
    } else {
      const filtered = auditLog.filter(log => 
        log.id.toLowerCase().includes(searchId.toLowerCase()) ||
        log.entityId.toLowerCase().includes(searchId.toLowerCase())
      )
      setFilteredLog(filtered)
    }
  }, [searchId, auditLog])

  const handleRefresh = async () => {
    const success = await refetch()
    if (success) {
      toast({
        title: 'Succès',
        description: 'Audit trail mis à jour',
      })
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Eye className="h-8 w-8 text-purple-500" />
              Traçabilité Complète
            </h1>
            <p className="text-muted-foreground mt-1">
              Suivi complet de toutes les actions du workflow
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualiser
          </Button>
        </div>

        {/* Search Bar */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Chercher par ID de bon ou d'alerte..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="outline">Chercher</Button>
            </form>
          </CardContent>
        </Card>

        {/* Timeline Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLog.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {searchId ? 'Aucun résultat' : 'Aucun audit'}
              </h3>
              <p className="text-muted-foreground">
                {searchId 
                  ? 'Aucune action trouvée pour cette recherche'
                  : 'Aucune action de workflow enregistrée'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                {filteredLog.length} action{filteredLog.length > 1 ? 's' : ''} enregistrée{filteredLog.length > 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTimeline logs={filteredLog} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
