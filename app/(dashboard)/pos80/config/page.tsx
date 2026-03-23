'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2, AlertCircle, CheckCircle, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'

interface POS80ConfigDB {
  id: number
  tenant_id: string
  api_url: string
  api_key: string
  merchant_id: string
  terminal_id: string | null
  auth_type: 'bearer' | 'basic' | 'api_key'
  is_active: boolean
  last_tested_at: string | null
  test_status: string | null
  test_error_message: string | null
  created_by: string | null
}

export default function POS80ConfigPage() {
  const [profile, setProfile] = useState<any>(null)
  const [config, setConfig] = useState<POS80ConfigDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showApiKey, setShowApiKey] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; responseTime?: number } | null>(
    null
  )
  const [testLoading, setTestLoading] = useState(false)

  const [formData, setFormData] = useState({
    api_url: '',
    api_key: '',
    merchant_id: '',
    terminal_id: '',
    auth_type: 'bearer' as 'bearer' | 'basic' | 'api_key',
    is_active: true,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    async function load() {
      try {
        const sessionRes = await fetch('/api/session', { cache: 'no-store' })
        if (!sessionRes.ok) throw new Error('Session non disponible')
        const p = await sessionRes.json()
        if (p) {
          setProfile(p)
          const cfgRes = await fetch(`/api/pos80/config?tenantId=${encodeURIComponent(p.tenantId)}`, { cache: 'no-store' })
          const cfg = cfgRes.ok ? await cfgRes.json() : null
          if (cfg) {
            setConfig(cfg)
            setFormData({
              api_url: cfg.api_url,
              api_key: cfg.api_key,
              merchant_id: cfg.merchant_id,
              terminal_id: cfg.terminal_id || '',
              auth_type: cfg.auth_type,
              is_active: cfg.is_active,
            })
          }
        }
      } catch (error) {
        console.error('Error loading config:', error)
        toast.error('Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [mounted])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleSelectChange(name: string, value: string) {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleSaveConfig() {
    if (!profile) {
      toast.error('Profil non trouvé')
      return
    }

    if (!formData.api_url || !formData.api_key || !formData.merchant_id) {
      toast.error('Veuillez remplir tous les champs requis')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/pos80/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: profile.tenantId,
            api_url: formData.api_url,
            api_key: formData.api_key,
            merchant_id: formData.merchant_id,
            terminal_id: formData.terminal_id || null,
            auth_type: formData.auth_type,
            is_active: formData.is_active,
          }),
        })
        if (!res.ok) throw new Error('Echec de sauvegarde')
        const saved = await res.json()
        setConfig(saved)
        setFormData({
          api_url: formData.api_url,
          api_key: formData.api_key,
          merchant_id: formData.merchant_id,
          terminal_id: formData.terminal_id || '',
          auth_type: formData.auth_type,
          is_active: formData.is_active,
        })
        toast.success('Configuration sauvegardée')
        setTestResult(null)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
      }
    })
  }

  function handleTestConnection() {
    if (!profile) {
      toast.error('Profil non trouvé')
      return
    }

    setTestLoading(true)
    startTransition(async () => {
      try {
        const response = await fetch('/api/pos80/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: profile.tenantId }),
        })
        if (!response.ok) throw new Error('Test de connexion impossible')
        const result = await response.json()
        setTestResult(result)
        if (result.success) {
          toast.success('Connexion réussie!')
        } else {
          toast.error(`Erreur: ${result.message}`)
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erreur lors du test')
        setTestResult({
          success: false,
          message: error instanceof Error ? error.message : 'Erreur',
        })
      } finally {
        setTestLoading(false)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuration POS80</h1>
        <p className="text-muted-foreground mt-2">
          Configurez votre connexion à l'API POS80 pour synchroniser automatiquement vos recettes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paramètres de connexion API</CardTitle>
          <CardDescription>
            Entrez vos identifiants d'accès POS80. Ces informations sont chiffrées et stockées de manière sécurisée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">URL de l'API POS80 *</Label>
              <Input
                id="api-url"
                name="api_url"
                placeholder="https://api.pos80.com/v1"
                value={formData.api_url}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchant-id">Merchant ID *</Label>
              <Input
                id="merchant-id"
                name="merchant_id"
                placeholder="Votre Merchant ID"
                value={formData.merchant_id}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terminal-id">Terminal ID (optionnel)</Label>
              <Input
                id="terminal-id"
                name="terminal_id"
                placeholder="Terminal ID (si applicable)"
                value={formData.terminal_id}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-type">Type d'authentification *</Label>
              <Select value={formData.auth_type} onValueChange={(value) => handleSelectChange('auth_type', value)}>
                <SelectTrigger id="auth-type">
                  <SelectValue placeholder="Sélectionnez le type d'auth" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="api-key" className="flex items-center gap-2">
                Clé API / Token *
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </Label>
              <Input
                id="api-key"
                name="api_key"
                type={showApiKey ? 'text' : 'password'}
                placeholder="Entrez votre clé API ou token"
                value={formData.api_key}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Test Result Alert */}
          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>{testResult.success ? 'Connexion réussie' : 'Erreur de connexion'}</AlertTitle>
              <AlertDescription>
                {testResult.message}
                {testResult.responseTime && <p className="text-xs mt-1">Temps de réponse: {testResult.responseTime}ms</p>}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleTestConnection} variant="outline" disabled={testLoading || isPending}>
              {testLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Test en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tester la connexion
                </>
              )}
            </Button>

            <Button onClick={handleSaveConfig} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                'Sauvegarder la configuration'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Comment obtenir vos identifiants POS80?</AlertTitle>
        <AlertDescription>
          Consultez la documentation POS80 ou contactez votre administrateur pour obtenir l'URL de l'API, le Merchant ID
          et la clé d'accès. Une fois configuré, la synchronisation commencera automatiquement toutes les 5 minutes.
        </AlertDescription>
      </Alert>
    </div>
  )
}
