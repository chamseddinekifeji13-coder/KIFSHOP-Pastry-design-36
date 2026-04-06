"use client"

import { useState, useEffect } from "react"
import { Archive, Clock, Play, BarChart3, Loader2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface ArchiveStats {
  totalArchived: number
  lastRun: string | null
  nextRun: string | null
}

export function ArchiveSettings() {
  const [archiveDays, setArchiveDays] = useState(14)
  const [isArchiving, setIsArchiving] = useState(false)
  const [stats, setStats] = useState<ArchiveStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // Load saved configuration on mount
  useEffect(() => {
    const savedDays = localStorage.getItem('archive-days')
    if (savedDays) {
      setArchiveDays(Number(savedDays))
    }
    loadStats()
  }, [])

  // Save configuration when changed
  const handleDaysChange = (days: number) => {
    setArchiveDays(days)
    localStorage.setItem('archive-days', days.toString())
  }

  const handleManualArchive = async () => {
    setIsArchiving(true)
    try {
      const response = await fetch(`/api/cron/archive-orders?days=${archiveDays}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        toast.success(`✅ ${result.archived} commandes archivées avec succès`)
        // Refresh stats after successful archive
        loadStats()
      } else {
        throw new Error(result.error || 'Erreur lors de l\'archivage')
      }
    } catch (error) {
      console.error('Archive error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'archivage')
    } finally {
      setIsArchiving(false)
    }
  }

  const loadStats = async () => {
    setIsLoadingStats(true)
    try {
      const response = await fetch('/api/archive/stats')

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques')
      }

      const result = await response.json()

      if (result.success === false) {
        throw new Error(result.error || 'Erreur inconnue')
      }

      setStats(result)
    } catch (error) {
      console.error('Error loading stats:', error)
      toast.error('Erreur lors du chargement des statistiques')
      // Set default stats on error
      setStats({
        totalArchived: 0,
        lastRun: null,
        nextRun: null
      })
    } finally {
      setIsLoadingStats(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Configuration */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Période d'archivage (jours)
        </Label>
        <Input
          type="number"
          min="1"
          max="365"
          value={archiveDays}
          onChange={(e) => handleDaysChange(Number(e.target.value))}
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">
          Les commandes terminées (livrées/vendues ou annulées) plus anciennes que cette période seront archivées automatiquement
        </p>
      </div>

      {/* Manual Archive Button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleManualArchive}
          disabled={isArchiving}
          className="gap-2"
        >
          {isArchiving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Archiver maintenant
        </Button>
        <p className="text-xs text-muted-foreground">
          Lance un archivage manuel avec la période configurée ({archiveDays} jours)
        </p>
      </div>

      {/* Statistics */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <CardTitle className="text-sm">Statistiques d'archivage</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Historique des opérations d'archivage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingStats ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span>Total archivé:</span>
                <Badge variant="secondary">{stats?.totalArchived || 0}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Dernière exécution:</span>
                <span className="text-muted-foreground">
                  {stats?.lastRun ? new Date(stats.lastRun).toLocaleDateString('fr-FR') : 'Jamais'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Prochaine exécution:</span>
                <span className="text-muted-foreground">
                  {stats?.nextRun ? new Date(stats.nextRun).toLocaleDateString('fr-FR') : 'Non planifiée'}
                </span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  💡 L'archivage automatique s'exécute quotidiennement via cron job
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}