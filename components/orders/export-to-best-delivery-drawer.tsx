import { useState } from "react"
import { Loader2, Truck, AlertCircle, CheckCircle2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useTenant } from "@/lib/tenant-context"
import { createShipmentOnBestDelivery, getBestDeliveryConfig, recordShipmentExport, type Order } from "@/lib/deliveries/best-delivery"
import { toast } from "sonner"

interface ExportToBestDeliveryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
}

export function ExportToBestDeliveryDrawer({ open, onOpenChange, order }: ExportToBestDeliveryDrawerProps) {
  const { currentTenant } = useTenant()
  const [isLoading, setIsLoading] = useState(false)
  const [notes, setNotes] = useState("")
  const [success, setSuccess] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState("")
  const [shipmentId, setShipmentId] = useState("")

  if (!order) return null

  const handleExport = async () => {
    setIsLoading(true)
    try {
      // Récupérer la configuration Best Delivery
      const config = await getBestDeliveryConfig(currentTenant.id)
      if (!config) {
        toast.error("Best Delivery n'est pas configuré. Veuillez configurer l'intégration dans les paramètres.")
        onOpenChange(false)
        return
      }

      if (!config.isActive) {
        toast.error("L'intégration Best Delivery n'est pas activée.")
        return
      }

      // Préparer les données du shipment
      const itemsDescription = order.items.map(item => `${item.name} (x${item.quantity})`).join(", ")

      const shipmentData = {
        recipientName: order.customerName,
        recipientPhone: order.customerPhone,
        recipientAddress: order.customerAddress || "",
        recipientCity: "Tunis", // À adapter selon vos besoins
        itemDescription: itemsDescription,
        itemWeight: 2.5, // À adapter selon vos produits
        itemValue: order.total,
        reference: order.id,
        notes: notes,
      }

      // Créer le shipment
      const result = await createShipmentOnBestDelivery(config, shipmentData)

      if (!result) {
        toast.error("Erreur lors de la création du shipment")
        return
      }

      // Enregistrer l'export
      await recordShipmentExport(currentTenant.id, order.id, result)

      setSuccess(true)
      setTrackingNumber(result.trackingNumber)
      setShipmentId(result.shipmentId)
      toast.success("Commande exportée vers Best Delivery avec succès")
    } catch (error) {
      console.error("[v0] Error exporting to Best Delivery:", error)
      toast.error(`Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copié!")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg p-0 flex flex-col gap-0 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-8 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Exporter vers Best Delivery</h2>
              <p className="text-sm opacity-70">Envoyez cette commande à la plateforme de livraison</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-5">
          {success ? (
            <>
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Commande exportée avec succès vers Best Delivery
                </AlertDescription>
              </Alert>

              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <Label className="text-xs font-semibold text-gray-600">N° Shipment</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input value={shipmentId} readOnly className="bg-white text-sm" />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleCopy(shipmentId)}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-600">N° Suivi</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input value={trackingNumber} readOnly className="bg-white text-sm" />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleCopy(trackingNumber)}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  Vous pouvez suivre votre colis sur le site de Best Delivery avec le numéro de suivi
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <>
              {/* Infos commande */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Détails de la commande</h3>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client:</span>
                    <span className="font-medium">{order.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Téléphone:</span>
                    <span className="font-medium">{order.customerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Adresse:</span>
                    <span className="font-medium text-right">{order.customerAddress || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Articles:</span>
                    <span className="font-medium">{order.items.length}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600 font-medium">Total:</span>
                    <span className="font-bold text-lg">{order.total.toFixed(2)} TND</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notes additionnelles */}
              <div className="space-y-3">
                <Label htmlFor="notes">Notes supplémentaires (optionnel)</Label>
                <Textarea
                  id="notes"
                  placeholder="Ex: Livraison à l'étage 2, appeler avant d'arriver..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none"
                  rows={4}
                />
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  Assurez-vous que l'adresse est complète et correcte avant d'envoyer
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => {
            onOpenChange(false)
            setSuccess(false)
            setNotes("")
            setTrackingNumber("")
            setShipmentId("")
          }}>
            Fermer
          </Button>
          {!success && (
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleExport}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Exporter vers Best Delivery
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
