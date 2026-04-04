"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Edit, CheckCircle2, AlertCircle, Loader2, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import {
  fetchProviderCredentials,
  createProviderCredentials,
  updateProviderCredentials,
  deleteProviderCredentials,
  setDefaultProvider,
  testProviderConnection,
  type DeliveryProviderCredentials,
} from "@/lib/delivery/provider-credentials-actions"
import { DeliveryProviderCode } from "@/lib/delivery/types"

const PROVIDERS: Array<{ code: DeliveryProviderCode; name: string; description: string }> = [
  {
    code: "aramex",
    name: "Aramex",
    description: "International courier service with API integration",
  },
  {
    code: "first_delivery",
    name: "First Delivery",
    description: "Local Tunisia delivery service",
  },
  {
    code: "best_delivery",
    name: "Best Delivery",
    description: "Local Tunisia delivery service",
  },
]

export function DeliveryProviderCredentialsSettings() {
  const { currentTenant } = useTenant()
  const [credentials, setCredentials] = useState<DeliveryProviderCredentials[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCode, setEditingCode] = useState<DeliveryProviderCode | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Form state
  const [selectedProvider, setSelectedProvider] = useState<DeliveryProviderCode>("best_delivery")
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountPin, setAccountPin] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [extraConfig, setExtraConfig] = useState<Record<string, string>>({})
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    if (currentTenant?.id) {
      loadCredentials()
    }
  }, [currentTenant?.id])

  const loadCredentials = async () => {
    if (!currentTenant?.id) return
    setLoading(true)
    try {
      const data = await fetchProviderCredentials(currentTenant.id)
      setCredentials(data || [])
    } catch (error) {
      toast.error("Error loading provider credentials")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedProvider("best_delivery")
    setApiKey("")
    setApiSecret("")
    setAccountNumber("")
    setAccountPin("")
    setBaseUrl("")
    setExtraConfig({})
    setIsEnabled(false)
    setEditingCode(null)
  }

  const openDialog = (providerCode?: DeliveryProviderCode) => {
    if (providerCode) {
      const existing = credentials.find((c) => c.provider_code === providerCode)
      if (existing) {
        setEditingCode(providerCode)
        setSelectedProvider(providerCode)
        setApiKey(existing.api_key || "")
        setApiSecret(existing.api_secret || "")
        setAccountNumber(existing.account_number || "")
        setAccountPin(existing.account_pin || "")
        setBaseUrl(existing.base_url || "")
        setExtraConfig(existing.extra_config || {})
        setIsEnabled(existing.is_enabled)
      }
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!currentTenant?.id || !apiKey.trim()) {
      toast.error("API Key is required")
      return
    }

    setSaving(true)
    try {
      if (editingCode) {
        const result = await updateProviderCredentials(currentTenant.id, editingCode, {
          api_key: apiKey,
          api_secret: apiSecret || undefined,
          account_number: accountNumber || undefined,
          account_pin: accountPin || undefined,
          base_url: baseUrl || undefined,
          extra_config: Object.keys(extraConfig).length > 0 ? extraConfig : undefined,
          is_enabled: isEnabled,
        })
        if (result) {
          toast.success("Credentials updated")
        } else {
          toast.error("Error updating credentials")
        }
      } else {
        const result = await createProviderCredentials(currentTenant.id, {
          provider_code: selectedProvider,
          provider_name: PROVIDERS.find((p) => p.code === selectedProvider)?.name || selectedProvider,
          api_key: apiKey,
          api_secret: apiSecret || undefined,
          account_number: accountNumber || undefined,
          account_pin: accountPin || undefined,
          base_url: baseUrl || undefined,
          extra_config: Object.keys(extraConfig).length > 0 ? extraConfig : undefined,
          is_enabled: isEnabled,
          is_default: false,
        })
        if (result) {
          toast.success("Credentials saved")
        } else {
          toast.error("Error saving credentials")
        }
      }
      setDialogOpen(false)
      resetForm()
      loadCredentials()
    } catch (error) {
      toast.error("Error saving credentials")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (providerCode: DeliveryProviderCode) => {
    if (!currentTenant?.id) return
    if (!confirm(`Delete credentials for ${providerCode}?`)) return

    try {
      const result = await deleteProviderCredentials(currentTenant.id, providerCode)
      if (result) {
        toast.success("Credentials deleted")
        loadCredentials()
      } else {
        toast.error("Error deleting credentials")
      }
    } catch (error) {
      toast.error("Error deleting credentials")
    }
  }

  const handleSetDefault = async (providerCode: DeliveryProviderCode) => {
    if (!currentTenant?.id) return

    try {
      const result = await setDefaultProvider(currentTenant.id, providerCode)
      if (result) {
        toast.success("Default provider set")
        loadCredentials()
      } else {
        toast.error("Error setting default provider")
      }
    } catch (error) {
      toast.error("Error setting default provider")
    }
  }

  const handleTestConnection = async (providerCode: DeliveryProviderCode) => {
    if (!currentTenant?.id) return

    setTesting(providerCode)
    try {
      const result = await testProviderConnection(currentTenant.id, providerCode)
      if (result.success) {
        toast.success("Connection successful!")
      } else {
        toast.error(result.message || "Connection test failed")
      }
    } catch (error) {
      toast.error("Error testing connection")
    } finally {
      setTesting(null)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Delivery Provider API Configuration</CardTitle>
            <CardDescription>Configure API credentials for your delivery providers (Aramex, First Delivery, Best Delivery)</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingCode ? "Edit Provider" : "Add Delivery Provider"}</DialogTitle>
                <DialogDescription>Configure API credentials for your delivery provider</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {!editingCode && (
                  <div className="space-y-3">
                    <Label>Select Provider</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PROVIDERS.map((provider) => (
                        <button
                          key={provider.code}
                          onClick={() => setSelectedProvider(provider.code)}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            selectedProvider === provider.code
                              ? "border-primary bg-primary/10"
                              : "border-input hover:border-primary/50"
                          }`}
                        >
                          <div className="font-medium text-sm">{provider.name}</div>
                          <div className="text-xs text-muted-foreground">{provider.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key *</Label>
                    <Input
                      id="api-key"
                      placeholder="Enter your API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      type="password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api-secret">API Secret</Label>
                    <Input
                      id="api-secret"
                      placeholder="Enter your API secret"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      type="password"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="account-number">Account Number</Label>
                      <Input
                        id="account-number"
                        placeholder="e.g., Aramex account #"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="account-pin">Account PIN</Label>
                      <Input
                        id="account-pin"
                        placeholder="Account PIN"
                        value={accountPin}
                        onChange={(e) => setAccountPin(e.target.value)}
                        type="password"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="base-url">Base URL (Optional)</Label>
                    <Input
                      id="base-url"
                      placeholder="https://api.provider.com"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="enabled">Enable this provider</Label>
                    <Switch
                      id="enabled"
                      checked={isEnabled}
                      onCheckedChange={setIsEnabled}
                    />
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Make sure your API credentials are valid before enabling. You can test the connection after saving.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving || !apiKey.trim()}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingCode ? "Update" : "Add"} Provider
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {credentials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No provider credentials configured yet</p>
            <p className="text-sm mt-1">Click &quot;Add Provider&quot; to configure your first delivery provider</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((cred) => (
                  <TableRow key={cred.provider_code}>
                    <TableCell className="font-medium">{cred.provider_name}</TableCell>
                    <TableCell>
                      {cred.is_enabled ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700">
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">•••••</span>
                        <button
                          onClick={() => copyToClipboard(cred.api_key || "", `key-${cred.id}`)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          {copied === `key-${cred.id}` ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cred.is_default ? (
                        <Badge>Default</Badge>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(cred.provider_code as DeliveryProviderCode)}
                          className="text-sm text-primary hover:underline"
                        >
                          Set as default
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestConnection(cred.provider_code as DeliveryProviderCode)}
                          disabled={testing === cred.provider_code || !cred.is_enabled}
                        >
                          {testing === cred.provider_code ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Test"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog(cred.provider_code as DeliveryProviderCode)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(cred.provider_code as DeliveryProviderCode)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
