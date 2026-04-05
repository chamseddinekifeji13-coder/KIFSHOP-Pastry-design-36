"use client"

import { useState, useEffect } from "react"
import { Loader2, Truck, CheckCircle2, AlertCircle, Package } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTenant } from "@/lib/tenant-context"
import { toast } from "sonner"

type DeliveryProviderCode = "aramex" | "first_delivery" | "best_delivery"

interface ProviderInfo {
  code: DeliveryProviderCode
  name: string
  description: string
  is_enabled: boolean
  is_default: boolean
}

const AVAILABLE_PROVIDERS: ProviderInfo[] = [
  {
    code: "best_delivery",
    name: "Best Delivery",
    description: "Service de livraison local tunisien",
    is_enabled: true,
    is_default: true,
  },
  {
    code: "aramex",
    name: "Aramex",
    description: "Livraison internationale",
    is_enabled: false,
    is_default: false,
  },
  {
    code: "first_delivery",
    name: "First Delivery",
    description: "Service express local",
    is_enabled: false,
    is_default: false,
  },
]

interface SendToDeliveryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: DeliveryOrder | null
  onSuccess?: () => void
}

interface DeliveryOrderItem {
  name: string
  quantity: number
  price: number
  product_name?: string
  unit_price?: number
}

interface DeliveryOrder {
  id: string
  order_number?: string
  client_name: string
  client_phone: string
  delivery_address?: string
  delivery_city?: string
  delivery_postal_code?: string
  total: number
  notes?: string
  items: DeliveryOrderItem[]
}

export function SendToDeliveryDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: SendToDeliveryDialogProps) {
  const { currentTenant } = useTenant()
  const [loading, setLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<DeliveryProviderCode>("best_delivery")
  const [providers, setProviders] = useState<ProviderInfo[]>(AVAILABLE_PROVIDERS)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    trackingNumber?: string
  } | null>(null)

  // Form fields for delivery details
  const [customerPhone, setCustomerPhone] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [deliveryNotes, setDeliveryNotes] = useState("")
  const [codAmount, setCodAmount] = useState("")

  // Reset form when dialog opens with new order
  useEffect(() => {
    if (open && order) {
      setCustomerPhone(order.client_phone || "")
      setDeliveryAddress(order.delivery_address || "")
      setDeliveryNotes(order.notes || "")
      setCodAmount(order.total?.toString() || "0")
      setResult(null)
      
      // Load enabled providers from credentials
      loadProviders()
    }
  }, [open, order])

  const loadProviders = async () => {
    if (!currentTenant?.id) return
    
    try {
      const response = await fetch(`/api/delivery/providers?tenant_id=${currentTenant.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.providers && data.providers.length > 0) {
          setProviders(data.providers)
          // Set default provider
          const defaultProvider = data.providers.find((p: ProviderInfo) => p.is_default)
          if (defaultProvider) {
            setSelectedProvider(defaultProvider.code)
          }
        }
      }
    } catch (error) {
      console.log("[v0] Using default providers list")
    }
  }

  const handleSendToDelivery = async () => {
    if (!order || !currentTenant?.id) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/delivery/send-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: order.id,
          customer_name: order.client_name,
          customer_phone: customerPhone,
          customer_address: deliveryAddress,
          city: order.delivery_city || "Tunis",
          postal_code: order.delivery_postal_code || "",
          items: order.items?.map(item => ({
            name: item.product_name || item.name,
            quantity: item.quantity,
            price: item.unit_price || item.price,
          })) || [],
          total_amount: order.total,
          cod_amount: parseFloat(codAmount) || 0,
          notes: deliveryNotes,
          provider_code: selectedProvider,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: data.message || "Commande envoyee avec succes",
          trackingNumber: data.tracking_number,
        })
        toast.success("Commande envoyee au service de livraison")
        onSuccess?.()
      } else {
        setResult({
          success: false,
          message: data.error || "Erreur lors de l'envoi",
        })
        toast.error(data.error || "Erreur lors de l'envoi")
      }
    } catch (error) {
      console.error("[v0] Send to delivery error:", error)
      setResult({
        success: false,
        message: "Erreur de connexion au service de livraison",
      })
      toast.error("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Envoyer au service de livraison
          </DialogTitle>
          <DialogDescription>
            Commande #{order.order_number} - {order.client_name}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-6">
            {result.success ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>{result.message}</strong>
                  {result.trackingNumber && (
                    <div className="mt-2">
                      <span className="text-sm">Numero de suivi: </span>
                      <Badge variant="outline" className="font-mono">
                        {result.trackingNumber}
                      </Badge>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {result.message}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end mt-4">
              <Button onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              {/* Provider Selection */}
              <div className="grid gap-2">
                <Label htmlFor="provider">Service de livraison</Label>
                <Select
                  value={selectedProvider}
                  onValueChange={(v) => setSelectedProvider(v as DeliveryProviderCode)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un service" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem
                        key={provider.code}
                        value={provider.code}
                        disabled={!provider.is_enabled}
                      >
                        <div className="flex items-center gap-2">
                          <span>{provider.name}</span>
                          {provider.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              Par defaut
                            </Badge>
                          )}
                          {!provider.is_enabled && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Non configure
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Order Summary */}
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Package className="h-4 w-4" />
                  Resume de la commande
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Client: {order.client_name}</p>
                  <p>Total: {order.total?.toFixed(3)} TND</p>
                  <p>Articles: {order.items?.length || 0} produit(s)</p>
                </div>
              </div>

              {/* Customer Phone */}
              <div className="grid gap-2">
                <Label htmlFor="phone">Telephone du client</Label>
                <Input
                  id="phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+216 XX XXX XXX"
                />
              </div>

              {/* Delivery Address */}
              <div className="grid gap-2">
                <Label htmlFor="address">Adresse de livraison</Label>
                <Textarea
                  id="address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Adresse complete..."
                  rows={2}
                />
              </div>

              {/* COD Amount */}
              <div className="grid gap-2">
                <Label htmlFor="cod">Montant a encaisser (COD)</Label>
                <Input
                  id="cod"
                  type="number"
                  step="0.001"
                  value={codAmount}
                  onChange={(e) => setCodAmount(e.target.value)}
                  placeholder="0.000"
                />
                <p className="text-xs text-muted-foreground">
                  Laissez 0 si deja paye
                </p>
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="notes">Instructions de livraison</Label>
                <Textarea
                  id="notes"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Instructions speciales..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleSendToDelivery} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Truck className="mr-2 h-4 w-4" />
                    Envoyer
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
