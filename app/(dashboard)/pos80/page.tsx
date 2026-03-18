'use client'

import { useEffect, useState } from 'react'
import { Loader2, Settings, Activity, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Link from 'next/link'
import { getActiveProfile } from '@/lib/active-profile'
import { getPOS80Config, getPOS80SyncLogs } from '@/lib/pos80/actions'

export default function POS80Page() {
  const [profile, setProfile] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)
  const [recentSync, setRecentSync] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    async function load() {
      try {
        const p = await getActiveProfile()
        if (p) {
          setProfile(p)
          const cfg = await getPOS80Config(p.tenantId)
          setConfig(cfg)

          if (cfg && cfg.is_active) {
            const logs = await getPOS80SyncLogs(p.tenantId, 1, 7)
            if (logs.length > 0) {
              setRecentSync(logs[0])
            }
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [mounted])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Intégration POS80</h1>
        <p className="text-muted-foreground mt-2">
          Synchronisez vos transactions de caisse POS80 directement dans votre système
        </p>
      </div>

      {!config || !config.is_active ? (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-900" />
          <AlertTitle className="text-yellow-900">Configuration requise</AlertTitle>
          <AlertDescription className="text-yellow-800">
            Veuillez configurer votre connexion POS80 pour commencer la synchronisation.
            <Link href="/pos80/config">
              <Button variant="link" className="ml-2 h-auto p-0 text-yellow-800 underline">
                Configurer maintenant
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-900" />
          <AlertTitle className="text-green-900">Configuration active</AlertTitle>
          <AlertDescription className="text-green-800">
            Votre connexion POS80 est configurée et active. La synchronisation s'exécute automatiquement toutes les 5 minutes.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </CardTitle>
            <CardDescription>Gérer vos paramètres de connexion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {config ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Merchant ID</p>
                  <p className="font-medium">{config.merchant_id}</p>
                </div>
                {config.terminal_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">Terminal ID</p>
                    <p className="font-medium">{config.terminal_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Type d'authentification</p>
                  <p className="font-medium capitalize">{config.auth_type}</p>
                </div>
                {config.last_tested_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Dernier test</p>
                    <div className="flex items-center gap-2">
                      {config.test_status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm">
                        {new Date(config.last_tested_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Non configuré</p>
            )}
            <Link href="/pos80/config" className="block">
              <Button className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Configurer / Modifier
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Monitoring Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Monitoring
            </CardTitle>
            <CardDescription>État de la synchronisation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentSync ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Dernier statut</p>
                  <div className="flex items-center gap-2 mt-1">
                    {recentSync.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <Badge variant={recentSync.status === 'success' ? 'default' : 'destructive'}>
                      {recentSync.status === 'success' ? 'Succès' : 'Erreur'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transactions importées</p>
                  <p className="font-medium text-lg">{recentSync.transactions_created}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Revenu importé</p>
                  <p className="font-medium text-lg">{recentSync.revenue_created.toFixed(2)} TND</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune synchronisation enregistrée</p>
            )}
            <Link href="/pos80/monitoring" className="block">
              <Button className="w-full" variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                Voir le détail
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Link href="/pos80/config" className="flex-1">
            <Button className="w-full" variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Paramètres
            </Button>
          </Link>
          <Link href="/pos80/monitoring" className="flex-1">
            <Button className="w-full" variant="outline">
              <Activity className="mr-2 h-4 w-4" />
              Historique
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Documentation */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Besoin d'aide?</AlertTitle>
        <AlertDescription>
          Consultez la documentation POS80 ou contactez le support technique pour toute assistance concernant
          l'intégration.
        </AlertDescription>
      </Alert>
    </div>
  )
}
