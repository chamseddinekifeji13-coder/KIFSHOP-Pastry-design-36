"use client"

import { useState, useEffect } from "react"
import { Printer, Usb, CheckCircle, XCircle, Settings, RefreshCw, DoorOpen, Wifi, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const [printerMode, setPrinterMode] = useState<"usb" | "network" | "windows">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("printer-mode") as "usb" | "network" | "windows") || "windows"
    }
    return "windows"
  })
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; vendorId: number; productId: number } | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  
  // Network printer settings
  const [printerIp, setPrinterIp] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("printer-ip") || ""
    }
    return ""
  })
  const [printerPort, setPrinterPort] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("printer-port") || "9100"
    }
    return "9100"
  })

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

  const handleConnect = async (showAll: boolean = false) => {
    setIsConnecting(true)
    try {
      const printer = getPrinter()
      await printer.connect(showAll)
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

      await printer.testPrint()
      toast.success("Ticket de test imprime!")
    } catch (error: any) {
      toast.error(error.message || "Erreur impression test")
    } finally {
      setIsTesting(false)
    }
  }

  const handleSaveNetworkSettings = async () => {
    if (!printerIp) {
      toast.error("Veuillez entrer l'adresse IP de l'imprimante")
      return
    }
    
    localStorage.setItem("printer-ip", printerIp)
    localStorage.setItem("printer-port", printerPort)
    setPrinterMode("network")
    setIsConnected(true)
    onPrinterConnected?.(true)
    toast.success("Imprimante reseau configuree!")
    setDialogOpen(false)
  }

  const handleTestNetworkPrinter = async () => {
    if (!printerIp) {
      toast.error("Veuillez entrer l'adresse IP de l'imprimante")
      return
    }
    
    setIsTesting(true)
    try {
      const response = await fetch("/api/treasury/esc-pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_print",
          printerIp,
          printerPort: parseInt(printerPort)
        })
      })
      
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erreur connexion imprimante reseau")
      }
      
      if (data.mode === "demo") {
        toast.info(data.message)
      } else {
        toast.success("Ticket de test envoye a l'imprimante!")
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur test imprimante reseau")
    } finally {
      setIsTesting(false)
    }
  }
  
  const handleOpenNetworkDrawer = async () => {
    if (!printerIp) {
      toast.error("Veuillez entrer l'adresse IP de l'imprimante")
      return
    }
    
    try {
      const response = await fetch("/api/treasury/esc-pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "open_drawer",
          printerIp,
          printerPort: parseInt(printerPort)
        })
      })
      
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erreur ouverture tiroir")
      }
      
      if (data.mode === "demo") {
        toast.info(data.message)
      } else {
        toast.success("Tiroir-caisse ouvert!")
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur ouverture tiroir reseau")
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

  // Windows/System printing mode handlers
  const handleSetWindowsMode = () => {
    localStorage.setItem("printer-mode", "windows")
    setPrinterMode("windows")
    setIsConnected(true)
    onPrinterConnected?.(true)
    toast.success("Mode impression Windows active! Votre imprimante POS80 sera utilisee via le systeme.")
    setDialogOpen(false)
  }

  const handleTestWindowsPrint = () => {
    // Create a test receipt in a new window for printing
    const printWindow = window.open("", "_blank", "width=300,height=400")
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenetre d'impression. Verifiez les popups.")
      return
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Impression</title>
        <style>
          @page { 
            size: 80mm auto; 
            margin: 0; 
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            margin: 0;
            padding: 5mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .separator { border-top: 1px dashed #000; margin: 5px 0; }
          h1 { font-size: 16px; margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="separator"></div>
          <h1 class="bold">KIFSHOP PASTRY</h1>
          <p>Test Imprimante POS80</p>
          <div class="separator"></div>
          <p>Date: ${new Date().toLocaleString("fr-TN")}</p>
          <div class="separator"></div>
          <p class="bold">Imprimante configuree avec succes!</p>
          <p>Mode: Windows/Driver POS80</p>
          <div class="separator"></div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
    toast.success("Fenetre d'impression ouverte - selectionnez votre POS80")
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
          {/* Tabs for Windows vs USB vs Network */}
          <Tabs value={printerMode} onValueChange={(v) => {
            setPrinterMode(v as "usb" | "network" | "windows")
            localStorage.setItem("printer-mode", v)
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="windows" className="gap-1 text-xs">
                <Monitor className="h-4 w-4" />
                Windows
              </TabsTrigger>
              <TabsTrigger value="usb" className="gap-1 text-xs">
                <Usb className="h-4 w-4" />
                USB
              </TabsTrigger>
              <TabsTrigger value="network" className="gap-1 text-xs">
                <Wifi className="h-4 w-4" />
                Reseau
              </TabsTrigger>
            </TabsList>

            {/* Windows Mode Tab - RECOMMENDED for POS80 with driver */}
            <TabsContent value="windows" className="space-y-4">
              {/* Windows Mode Status */}
              <Card className={printerMode === "windows" && isConnected ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${printerMode === "windows" && isConnected ? "bg-emerald-100" : "bg-slate-100"}`}>
                        {printerMode === "windows" && isConnected ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Monitor className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {printerMode === "windows" && isConnected ? "POS80 via Windows" : "Non configure"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Utilise le driver Windows installe
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={handleSetWindowsMode}
                      variant={printerMode === "windows" && isConnected ? "outline" : "default"}
                      className="gap-2"
                    >
                      <Monitor className="h-4 w-4" />
                      {printerMode === "windows" && isConnected ? "Reconfigurer" : "Activer"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Test Button Windows */}
              {printerMode === "windows" && isConnected && (
                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleTestWindowsPrint}
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Test impression POS80
                  </Button>
                </div>
              )}

              {/* Windows Instructions */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <h4 className="font-medium text-sm text-green-800 mb-2">Mode Windows (Recommande pour POS80)</h4>
                  <p className="text-xs text-green-700 mb-3">
                    Ce mode utilise le driver Windows de votre imprimante POS80 deja installe (v5.1.1.43).
                  </p>
                  <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
                    <li>Cliquez "Activer" pour utiliser ce mode</li>
                    <li>Lors de l'impression, selectionnez "POS80" dans la liste</li>
                    <li>Definissez POS80 comme imprimante par defaut Windows pour impression automatique</li>
                  </ol>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <h4 className="font-medium text-sm text-blue-800 mb-2">Configurer POS80 par defaut:</h4>
                  <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Ouvrez "Parametres Windows" &gt; "Peripheriques" &gt; "Imprimantes"</li>
                    <li>Cliquez sur votre imprimante POS80</li>
                    <li>Cliquez "Gerer" puis "Definir par defaut"</li>
                    <li>Les tickets s'imprimeront automatiquement sur POS80</li>
                  </ol>
                </CardContent>
              </Card>

              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-4">
                  <h4 className="font-medium text-sm text-amber-800 mb-2">Note sur le tiroir-caisse:</h4>
                  <p className="text-xs text-amber-700">
                    Le tiroir-caisse ne peut pas etre ouvert via le mode Windows. Pour ouvrir le tiroir automatiquement, configurez votre imprimante en mode "Reseau" si elle supporte le reseau, ou utilisez le bouton physique.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* USB Mode Tab */}
            <TabsContent value="usb" className="space-y-4">
              {/* Connection Status */}
              <Card className={isConnected && printerMode === "usb" ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isConnected && printerMode === "usb" ? "bg-emerald-100" : "bg-slate-100"}`}>
                        {isConnected && printerMode === "usb" ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Usb className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {isConnected && printerMode === "usb" ? deviceInfo?.name || "Imprimante USB" : "Non connectee"}
                        </p>
                        {isConnected && printerMode === "usb" && deviceInfo && (
                          <p className="text-xs text-muted-foreground">
                            VID: {deviceInfo.vendorId.toString(16).toUpperCase()} | PID: {deviceInfo.productId.toString(16).toUpperCase()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {isConnected && printerMode === "usb" ? (
                      <Button variant="outline" size="sm" onClick={handleDisconnect}>
                        Deconnecter
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleConnect(false)}
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
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Test Buttons USB */}
              {isConnected && printerMode === "usb" && (
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

              {/* Show All USB Devices Option */}
              {!isConnected && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-4">
                    <h4 className="font-medium text-sm text-amber-800 mb-2">Imprimante POS80 non detectee?</h4>
                    <p className="text-xs text-amber-700 mb-3">
                      Si votre imprimante POS80 n'apparait pas, cliquez ci-dessous pour afficher TOUS les peripheriques USB:
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleConnect(true)}
                      disabled={isConnecting}
                      className="w-full gap-2 border-amber-300 hover:bg-amber-100"
                    >
                      {isConnecting ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Usb className="h-4 w-4" />
                      )}
                      Afficher tous les peripheriques USB
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* USB Instructions */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <h4 className="font-medium text-sm text-blue-800 mb-2">Instructions USB:</h4>
                  <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Connectez l'imprimante USB a votre caisse</li>
                    <li>Cliquez sur "Connecter" ci-dessus</li>
                    <li>Si l'imprimante n'apparait pas, cliquez "Afficher tous les peripheriques USB"</li>
                    <li>Selectionnez votre imprimante POS80 dans la liste</li>
                    <li>Testez l'impression et le tiroir</li>
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Network Mode Tab */}
            <TabsContent value="network" className="space-y-4">
              {/* Network Connection Status */}
              <Card className={isConnected && printerMode === "network" ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isConnected && printerMode === "network" ? "bg-emerald-100" : "bg-slate-100"}`}>
                        {isConnected && printerMode === "network" ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Wifi className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {isConnected && printerMode === "network" ? `${printerIp}:${printerPort}` : "Non configuree"}
                        </p>
                        {isConnected && printerMode === "network" && (
                          <p className="text-xs text-muted-foreground">
                            Imprimante reseau
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Network Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Configuration reseau</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="printer-ip" className="text-xs">Adresse IP imprimante</Label>
                    <Input
                      id="printer-ip"
                      placeholder="192.168.1.100"
                      value={printerIp}
                      onChange={(e) => setPrinterIp(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="printer-port" className="text-xs">Port (par defaut: 9100)</Label>
                    <Input
                      id="printer-port"
                      placeholder="9100"
                      value={printerPort}
                      onChange={(e) => setPrinterPort(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveNetworkSettings}
                    className="w-full gap-2"
                  >
                    <Wifi className="h-4 w-4" />
                    Sauvegarder et Connecter
                  </Button>
                </CardContent>
              </Card>

              {/* Test Buttons Network */}
              {isConnected && printerMode === "network" && (
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleTestNetworkPrinter}
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
                    onClick={handleOpenNetworkDrawer}
                    className="gap-2"
                  >
                    <DoorOpen className="h-4 w-4" />
                    Ouvrir tiroir
                  </Button>
                </div>
              )}

              {/* Network Instructions */}
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-4">
                  <h4 className="font-medium text-sm text-amber-800 mb-2">Configuration reseau:</h4>
                  <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
                    <li>Trouvez l'adresse IP de votre imprimante POS80</li>
                    <li>Entrez l'IP et le port (normalement 9100)</li>
                    <li>Cliquez "Sauvegarder et Connecter"</li>
                    <li>Testez l'impression</li>
                  </ol>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <h4 className="font-medium text-sm text-green-800 mb-2">Comment trouver l'IP de l'imprimante POS80?</h4>
                  <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
                    <li>Imprimez un ticket de statut depuis le menu de l'imprimante</li>
                    <li>L'IP s'affiche en bas du ticket</li>
                    <li>Ou vérifiez dans le manuel/configuration reseau du caisse</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
