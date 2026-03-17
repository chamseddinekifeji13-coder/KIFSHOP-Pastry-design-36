"use client"

import { useState, useCallback, useEffect } from "react"
import { Loader2, AlertCircle, CheckCircle2, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"

interface POS80Config {
  id?: number
  tenant_id: string
  api_url: string
  api_key: string
  merchant_id: string
  terminal_id?: string
  is_active: boolean
  last_tested_at?: string
  test_status?: string
  test_error_message?: string
}

export function POS80ConfigDrawer({ tenantId }: { tenantId: string }) {
  const [config, setConfig] = useState<POS80Config>({
    tenant_id: tenantId,
    api_url: '',
    api_key: '',
    merchant_id: '',
    terminal_id: '',
    is_active: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    if (!tenantId) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/pos80/config?tenantId=${tenantId}`)
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }
      
      const data = await res.json()
      if (data && typeof data === 'object' && !data.error) {
        setConfig(data)
      } else if (!data) {
        setConfig(prev => ({ ...prev, tenant_id: tenantId }))
      }
    } catch (err) {
      console.error('[v0] Failed to load POS80 config:', err)
      setError(err instanceof Error ? err.message : 'Failed to load config')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    loadConfig()
  }, [tenantId, loadConfig])

  const handleSave = async () => {
    if (!config.api_url || !config.api_key || !config.merchant_id) {
      toast.error('Remplissez tous les champs obligatoires')
      return
    }

    try {
      setSaving(true)
      setError(null)
      const res = await fetch('/api/pos80/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Save failed')
      }
      
      const saved = await res.json()
      setConfig(saved)
      toast.success('Configuration POS80 sauvegardée')
    } catch (err) {
      console.error('[v0] Failed to save config:', err)
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!config.api_url || !config.api_key) {
      toast.error('URL API et clé requises pour tester')
      return
    }

    try {
      setTesting(true)
      setError(null)
      const res = await fetch('/api/pos80/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, testConnection: true }),
      })

      const result = await res.json()
      
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Test failed')
      }
      
      toast.success('Connexion POS80 établie')
      await loadConfig()
    } catch (err) {
      console.error('[v0] Test failed:', err)
      const msg = err instanceof Error ? err.message : 'Erreur lors du test'
      setError(msg)
      toast.error(msg)
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration POS80</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <CardTitle className="text-base">Intégration POS80</CardTitle>
            <CardDescription>Connectez votre caisse pour synchroniser les ventes</CardDescription>
          </div>
          {config.is_active && (
            <div className="flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Actif
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {config.test_status && !error && (
          <Alert variant={config.test_status === 'success' ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {config.test_status === 'success'
                ? `Dernière connexion: ${new Date(config.last_tested_at || '').toLocaleString('fr-FR')}`
                : config.test_error_message}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api_url">URL de l'API POS80 *</Label>
            <Input
              id="api_url"
              value={config.api_url}
              onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
              placeholder="https://api.pos80.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant_id">ID Commerçant *</Label>
            <Input
              id="merchant_id"
              value={config.merchant_id}
              onChange={(e) => setConfig({ ...config, merchant_id: e.target.value })}
              placeholder="XXXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key">Clé API *</Label>
            <Input
              id="api_key"
              type="password"
              value={config.api_key}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terminal_id">ID Terminal (optionnel)</Label>
            <Input
              id="terminal_id"
              value={config.terminal_id || ''}
              onChange={(e) => setConfig({ ...config, terminal_id: e.target.value })}
              placeholder="Terminal 1"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium text-sm">Synchronisation active</p>
              <p className="text-xs text-muted-foreground">
                Les ventes seront synchronisées automatiquement toutes les 5 min
              </p>
            </div>
            <Switch
              checked={config.is_active}
              onCheckedChange={(v) => setConfig({ ...config, is_active: v })}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleTest}
            disabled={testing || saving}
            variant="outline"
            className="flex-1"
          >
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tester la connexion
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || testing}
            className="flex-1"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
