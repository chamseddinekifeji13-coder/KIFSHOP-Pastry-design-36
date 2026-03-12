"use client"

import { useState, useEffect } from "react"
import { Printer, Usb, CheckCircle, XCircle, Settings, RefreshCw, DoorOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ThermalPrinter, getPrinter } from "@/lib/thermal-printer"

interface PrinterSettingsProps {
  onPrinterConnected?: (connected: boolean) => void
}

export function PrinterSettings({ onPrinterConnected }: PrinterSettingsProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; vendorId: number; productId: number } | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    // Check WebUSB support
    setIsSupported(ThermalPrinter.isSupported())
    
    // Check if already connected
    const printer = getPrinter()
    if (printer.isConnected()) {
      setIsConnected(true)
      setDeviceInfo(printer.getDeviceInfo())
    }
  }, [])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const printer = getPrinter()
      await printer.connect()
      setIsConnected(true)
      setDeviceInfo(printer.getDeviceInfo())
      onPrinterConnected?.(true)
      toast.success("Imprimante connectee avec succes!")
    } catch (error: any) {
      toast.error(error.message || "Erreur de connexion")
      setIsConnected(false)
      onPrinterConnected?.(false)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const printer = getPrinter()
      await printer.disconnect()
      setIsConnected(false)
      setDeviceInfo(null)
      onPrinterConnected?.(false)
      toast.info("Imprimante deconnectee")
    } catch (error: any) {
      toast.error("Erreur de deconnexion")
    }
  }

  const handleTestPrint = async () => {
    setIsTesting(true)
    try {
      const printer = getPrinter()
      if (!printer.isConnected()) {
        throw new Error("Imprimante non connectee")
      }
      
      await printer.initialize()
      await printer.printLarge("TEST KIFSHOP")
      await printer.printCentered("--------------------")
      await printer.printText("Imprimante configuree!")
      await printer.printText(`Date: ${new Date().toLocaleString("fr-TN")}`)
      await printer.printCentered("--------------------")
      await printer.printCentered("Test reussi!")
      await printer.cutPaper()
      
      toast.success("Test d'impression reussi!")
    } catch (error: any) {
      toast.error(error.message || "Erreur d'impression")
    } finally {
      setIsTesting(false)
    }
  }

  const handleTestDrawer = async () => {
    try {
      const printer = getPrinter()
      if (!printer.isConnected()) {
        throw new Error("Imprimante non connectee")
      }
      
      await printer.openDrawer()
      toast.success("Tiroir-caisse ouvert!")
    } catch (error: any) {
      toast.error(error.message || "Erreur ouverture tiroir")
    }
  }

  if (!isSupported) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
            <XCircle className="h-4 w-4" />
            WebUSB non supporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-orange-600">
            Utilisez Google Chrome ou Microsoft Edge pour connecter l'imprimante USB.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Printer className="h-4 w-4" />
          {isConnected ? (
            <Badge variant="default" className="bg-emerald-500">Connectee</Badge>
          ) : (
            <span>Imprimante</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration Imprimante
          </DialogTitle>
          <DialogDescription>
            Connectez votre imprimante thermique USB pour imprimer les tickets et ouvrir le tiroir-caisse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection Status */}
          <Card className={isConnected ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isConnected ? "bg-emerald-100" : "bg-slate-100"}`}>
                    {isConnected ? (
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Usb className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {isConnected ? deviceInfo?.name || "Imprimante USB" : "Non connectee"}
                    </p>
                    {isConnected && deviceInfo && (
                      <p className="text-xs text-muted-foreground">
                        VID: {deviceInfo.vendorId.toString(16).toUpperCase()} | PID: {deviceInfo.productId.toString(16).toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
                
                {isConnected ? (
                  <Button variant="outline" size="sm" onClick={handleDisconnect}>
                    Deconnecter
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="gap-2"
                  >
                    {isConnecting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Usb className="h-4 w-4" />
                    )}
                    Connecter
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Test Buttons */}
          {isConnected && (
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={handleTestPrint}
                disabled={isTesting}
                className="gap-2"
              >
                {isTesting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                Test impression
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTestDrawer}
                className="gap-2"
              >
                <DoorOpen className="h-4 w-4" />
                Ouvrir tiroir
              </Button>
            </div>
          )}

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <h4 className="font-medium text-sm text-blue-800 mb-2">Instructions:</h4>
              <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                <li>Connectez l'imprimante USB a votre caisse</li>
                <li>Cliquez sur "Connecter" ci-dessus</li>
                <li>Selectionnez l'imprimante dans la liste</li>
                <li>Testez l'impression et le tiroir</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
