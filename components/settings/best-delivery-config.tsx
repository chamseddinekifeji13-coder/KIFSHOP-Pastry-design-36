import { useState } from "react"
import { Loader2, CheckCircle2, AlertCircle, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { useTenant } from "@/lib/tenant-context"
import { getBestDeliveryConfig, saveBestDeliveryConfig, testBestDeliveryConnection, type BestDeliveryConfig } from "@/lib/deliveries/best-delivery"
import { toast } from "sonner"

export function BestDeliveryConfigDrawer() {
  const { currentTenant } = useTenant()
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [apiUrl, setApiUrl] = useState("https://api.best-delivery.net")
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle")

  // Charger la configuration existante
  const loadConfig = async () => {
    try {
      const config = await getBestDeliveryConfig(currentTenant.id)
      if (config) {
        setApiKey(config.apiKey)
        setApiSecret(config.apiSecret)
        setApiUrl(config.apiUrl)
        setIsActive(config.isActive)
      }
    } catch (error) {
      console.error("Error loading Best Delivery config:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Charger au montage
  useState(() => {
    loadConfig()
  }, [currentTenant.id])

  const handleSave = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast.error("Veuillez remplir tous les champs requis")
      return
    }

    setIsSaving(true)
    try {
      const success = await saveBestDeliveryConfig(currentTenant.id, {
        apiKey,
        apiSecret,
        apiUrl,
        isActive,
      })

      if (success) {
        toast.success("Configuration Best Delivery sauvegardée")
      } else {
        toast.error("Erreur lors de la sauvegarde")
      }
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde")
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast.error("Veuillez d'abord remplir les champs")
      return
    }

    setIsTestingConnection(true)
    setConnectionStatus("idle")

    try {
      const config: BestDeliveryConfig = {
        tenantId: currentTenant.id,
        apiKey,
        apiSecret,
        apiUrl,
        isActive: true,
      }

      const isConnected = await testBestDeliveryConnection(config)

      if (isConnected) {
        setConnectionStatus("success")
        toast.success("Connexion établie avec succès!")
      } else {
        setConnectionStatus("error")
        toast.error("Impossible de se connecter à Best Delivery")
      }
    } catch (error) {
      setConnectionStatus("error")
      toast.error(`Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
    } finally {
      setIsTestingConnection(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-600" />
          <div>
            <CardTitle>Best Delivery</CardTitle>
            <CardDescription>Configurez l'intégration avec Best Delivery pour exporter vos commandes</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm">État de l'intégration</p>
            <p className="text-xs text-gray-600">{isActive ? "Activée" : "Désactivée"}</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <Label htmlFor="apiKey">Clé API</Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="Votre clé API Best Delivery"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-gray-500">Obtenue depuis le dashboard Best Delivery</p>
        </div>

        {/* API Secret */}
        <div className="space-y-2">
          <Label htmlFor="apiSecret">Secret API</Label>
          <Input
            id="apiSecret"
            type="password"
            placeholder="Votre secret API Best Delivery"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
          />
          <p className="text-xs text-gray-500">Secret d'authentification fourni par Best Delivery</p>
        </div>

        {/* API URL */}
        <div className="space-y-2">
          <Label htmlFor="apiUrl">URL de l'API</Label>
          <Input
            id="apiUrl"
            placeholder="https://api.best-delivery.net"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
          />
          <p className="text-xs text-gray-500">URL de base de l'API Best Delivery</p>
        </div>

        {/* Connection Status */}
        {connectionStatus === "success" && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Connexion établie avec succès
            </AlertDescription>
          </Alert>
        )}

        {connectionStatus === "error" && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Impossible de se connecter. Vérifiez vos credentials.
            </AlertDescription>
          </Alert>
        )}

        {/* Info */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            <p className="font-medium mb-1">Comment obtenir vos credentials?</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Accédez à votre compte Best Delivery</li>
              <li>Allez dans Paramètres &gt; Intégrations API</li>
              <li>Copiez votre Clé API et Secret API</li>
              <li>Collez-les ici et testez la connexion</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTestingConnection || !apiKey.trim() || !apiSecret.trim()}
            className="flex-1"
          >
            {isTestingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tester la connexion
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
