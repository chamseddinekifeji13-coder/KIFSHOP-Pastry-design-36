"use client"

import { useState, useEffect } from "react"
import { Printer, Usb, CheckCircle, XCircle, Settings, RefreshCw, DoorOpen, Wifi, Monitor, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

const BRIDGE_URL = "http://localhost:7731"

interface PrinterSettingsProps {
  onPrinterConnected?: (connected: boolean) => void
}

export function PrinterSettings({ onPrinterConnected }: PrinterSettingsProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [printerMode, setPrinterMode] = useState<"usb" | "network" | "windows" | "bridge">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("printer-mode") as "usb" | "network" | "windows" | "bridge") || "bridge"
    }
    return "bridge"
  })
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; vendorId: number; productId: number } | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Bridge mode settings
  const [bridgeAvailable, setBridgeAvailable] = useState(false)
  const [bridgePrinters, setBridgePrinters] = useState<string[]>([])
  const [selectedBridgePrinter, setSelectedBridgePrinter] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bridge-printer-name") || ""
    }
    return ""
  })
  const [isCheckingBridge, setIsCheckingBridge] = useState(false)

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
    setIsSupported(ThermalPrinter.isSupported())
    const printer = getPrinter()
    if (printer.isConnected()) {
      setIsConnected(true)
      setDeviceInfo(printer.getDeviceInfo())
    }

    // Auto-check bridge if in bridge mode
    const savedMode = localStorage.getItem("printer-mode") || "bridge"
    if (savedMode === "bridge") {
      checkBridgeStatus()
    }

    // If bridge was active, mark as connected
    if (savedMode === "bridge" && localStorage.getItem("bridge-printer-name")) {
      setIsConnected(true)
    }
    if ((savedMode === "windows" || savedMode === "network") && localStorage.getItem("printer-mode") === savedMode) {
      setIsConnected(true)
    }
  }, [])

  // ──── Bridge mode ────────────────────────────────────────

  const checkBridgeStatus = async () => {
    setIsCheckingBridge(true)
    try {
      const res = await fetch(`${BRIDGE_URL}/health`, { signal: AbortSignal.timeout(2000) })
      if (res.ok) {
        setBridgeAvailable(true)
        // Load printers list
        const printersRes = await fetch(`${BRIDGE_URL}/printers`, { signal: AbortSignal.timeout(3000) })
        if (printersRes.ok) {
          const data = await printersRes.json()
          setBridgePrinters(data.printers || [])
        }
      } else {
        setBridgeAvailable(false)
      }
    } catch {
      setBridgeAvailable(false)
    } finally {
      setIsCheckingBridge(false)
    }
  }

  const handleSaveBridgeSettings = () => {
    if (!selectedBridgePrinter) {
      toast.error("Veuillez sélectionner une imprimante")
      return
    }
    localStorage.setItem("bridge-printer-name", selectedBridgePrinter)
    localStorage.setItem("printer-mode", "bridge")
    setPrinterMode("bridge")
    setIsConnected(true)
    onPrinterConnected?.(true)
    toast.success(`Imprimante "${selectedBridgePrinter}" configurée en mode Bridge!`)
    setDialogOpen(false)
  }

  const handleTestBridgePrint = async () => {
    const printerName = selectedBridgePrinter || localStorage.getItem("bridge-printer-name")
    if (!printerName) {
      toast.error("Sélectionnez d'abord une imprimante")
      return
    }
    setIsTesting(true)
    try {
      const res = await fetch(`${BRIDGE_URL}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_print", printerName }),
        signal: AbortSignal.timeout(8000),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Test d'impression envoyé à " + printerName)
      } else {
        toast.error("Erreur: " + data.error)
      }
    } catch (e: any) {
      toast.error("Bridge non disponible: " + e.message)
    } finally {
      setIsTesting(false)
    }
  }

  const handleTestBridgeDrawer = async () => {
    const printerName = selectedBridgePrinter || localStorage.getItem("bridge-printer-name")
    if (!printerName) {
      toast.error("Sélectionnez d'abord une imprimante")
      return
    }
    try {
      const res = await fetch(`${BRIDGE_URL}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open_drawer", printerName }),
        signal: AbortSignal.timeout(5000),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Tiroir-caisse ouvert!")
      } else {
        toast.error("Erreur: " + data.error)
      }
    } catch (e: any) {
      toast.error("Bridge non disponible: " + e.message)
    }
  }

  // ──── USB WebUSB mode ────────────────────────────────────

  const handleConnect = async (showAll: boolean = false) => {
    setIsConnecting(true)
    try {
      const printer = getPrinter()
      await printer.connect(showAll)
      setIsConnected(true)
      setDeviceInfo(printer.getDeviceInfo())
      onPrinterConnected?.(true)
      toast.success("Imprimante connectée!")
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
      toast.info("Imprimante déconnectée")
    } catch {
      toast.error("Erreur de déconnexion")
    }
  }

  const handleTestPrint = async () => {
    setIsTesting(true)
    try {
      const printer = getPrinter()
      if (!printer.isConnected()) throw new Error("Imprimante non connectée")
      await printer.testPrint()
      toast.success("Ticket de test imprimé!")
    } catch (error: any) {
      toast.error(error.message || "Erreur impression test")
    } finally {
      setIsTesting(false)
    }
  }

  const handleTestDrawer = async () => {
    try {
      const printer = getPrinter()
      if (!printer.isConnected()) throw new Error("Imprimante non connectée")
      await printer.openDrawer()
      toast.success("Tiroir-caisse ouvert!")
    } catch (error: any) {
      toast.error(error.message || "Erreur ouverture tiroir")
    }
  }

  // ──── Network mode ───────────────────────────────────────

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
    toast.success("Imprimante réseau configurée!")
    setDialogOpen(false)
  }

  const handleTestNetworkPrinter = async () => {
    if (!printerIp) { toast.error("Veuillez entrer l'adresse IP"); return }
    setIsTesting(true)
    try {
      const res = await fetch("/api/treasury/esc-pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_print", printerIp, printerPort: parseInt(printerPort) }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Erreur réseau")
      toast.success(data.mode === "demo" ? data.message : "Ticket de test envoyé!")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsTesting(false)
    }
  }

  const handleOpenNetworkDrawer = async () => {
    if (!printerIp) { toast.error("Veuillez entrer l'adresse IP"); return }
    try {
      const res = await fetch("/api/treasury/esc-pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open_drawer", printerIp, printerPort: parseInt(printerPort) }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      toast.success("Tiroir ouvert!")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // ──── Windows mode ───────────────────────────────────────

  const handleSetWindowsMode = () => {
    localStorage.setItem("printer-mode", "windows")
    setPrinterMode("windows")
    setIsConnected(true)
    onPrinterConnected?.(true)
    toast.success("Mode Windows activé!")
    setDialogOpen(false)
  }

  const handleTestWindowsPrint = () => {
    const printWindow = window.open("", "_blank", "width=300,height=400")
    if (!printWindow) { toast.error("Popup bloqué - autorisez les popups"); return }
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Test</title>
      <style>@page{size:80mm auto;margin:0}body{font-family:'Courier New',monospace;font-size:12px;width:80mm;margin:0;padding:5mm}.c{text-align:center}.b{font-weight:bold}.s{border-top:1px dashed #000;margin:5px 0}</style>
      </head><body><div class="c"><div class="s"></div><h2 class="b">KIFSHOP PASTRY</h2><p>Test POS80</p><div class="s"></div>
      <p>Date: ${new Date().toLocaleString("fr-TN")}</p><div class="s"></div><p class="b">Impression OK!</p></div>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}</script>
      </body></html>`)
    printWindow.document.close()
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Printer className="h-4 w-4" />
          {isConnected ? (
            <Badge variant="default" className="bg-emerald-500">Connectée</Badge>
          ) : (
            <span>Imprimante</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration Imprimante POS80
          </DialogTitle>
          <DialogDescription>
            Configurez votre imprimante thermique POS80 et le tiroir-caisse.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={printerMode} onValueChange={(v: string) => {
          setPrinterMode(v as "usb" | "network" | "windows" | "bridge")
          localStorage.setItem("printer-mode", v)
          if (v === "bridge") checkBridgeStatus()
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bridge" className="gap-1 text-xs">
              <Cpu className="h-3.5 w-3.5" />
              Bridge
            </TabsTrigger>
            <TabsTrigger value="windows" className="gap-1 text-xs">
              <Monitor className="h-3.5 w-3.5" />
              Windows
            </TabsTrigger>
            <TabsTrigger value="usb" className="gap-1 text-xs">
              <Usb className="h-3.5 w-3.5" />
              USB
            </TabsTrigger>
            <TabsTrigger value="network" className="gap-1 text-xs">
              <Wifi className="h-3.5 w-3.5" />
              Réseau
            </TabsTrigger>
          </TabsList>

          {/* ══ BRIDGE MODE (RECOMMENDED) ══════════════════════════════ */}
          <TabsContent value="bridge" className="space-y-3 mt-3">
            <Card className={bridgeAvailable ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${bridgeAvailable ? "bg-emerald-100" : "bg-amber-100"}`}>
                      {bridgeAvailable
                        ? <CheckCircle className="h-5 w-5 text-emerald-600" />
                        : <XCircle className="h-5 w-5 text-amber-600" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {bridgeAvailable ? "Bridge Local Actif" : "Bridge Non Disponible"}
                      </p>
                      <p className="text-xs text-muted-foreground">localhost:7731</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={checkBridgeStatus}
                    disabled={isCheckingBridge}
                    className="gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isCheckingBridge ? "animate-spin" : ""}`} />
                    Vérifier
                  </Button>
                </div>
              </CardContent>
            </Card>

            {bridgeAvailable && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Sélectionner l&apos;imprimante POS80</Label>
                  <select
                    value={selectedBridgePrinter}
                    onChange={(e) => setSelectedBridgePrinter(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  >
                    <option value="">-- Choisir une imprimante --</option>
                    {bridgePrinters.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <Button onClick={handleSaveBridgeSettings} className="w-full gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Utiliser cette imprimante
                </Button>

                {selectedBridgePrinter && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={handleTestBridgePrint} disabled={isTesting} className="gap-1.5 text-xs">
                      {isTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                      Test impression
                    </Button>
                    <Button variant="outline" onClick={handleTestBridgeDrawer} className="gap-1.5 text-xs">
                      <DoorOpen className="h-3.5 w-3.5" />
                      Ouvrir tiroir
                    </Button>
                  </div>
                )}
              </>
            )}

            {!bridgeAvailable && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4 space-y-2">
                  <h4 className="font-semibold text-sm text-blue-800">
                    🚀 Mode recommandé pour POS80 avec imprimante intégrée
                  </h4>
                  <p className="text-xs text-blue-700">
                    Le Print Bridge est un petit serveur local qui s'installe UNE SEULE FOIS
                    sur votre caisse et permet l'impression automatique + ouverture du tiroir à chaque vente.
                  </p>
                  <div className="text-xs text-blue-700 space-y-1">
                    <p className="font-medium">Installation (une seule fois):</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li>Ouvrez un terminal dans le dossier <code className="bg-blue-100 px-1 rounded">print-bridge/</code></li>
                      <li>Tapez: <code className="bg-blue-100 px-1 rounded">npm install</code></li>
                      <li>Tapez: <code className="bg-blue-100 px-1 rounded">node server.js</code></li>
                      <li>Ou double-cliquez <code className="bg-blue-100 px-1 rounded">start-bridge.bat</code></li>
                      <li>Revenez ici et cliquez <strong>Vérifier</strong></li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ══ WINDOWS MODE ══════════════════════════════════════════ */}
          <TabsContent value="windows" className="space-y-3 mt-3">
            <Card className={printerMode === "windows" && isConnected ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${printerMode === "windows" && isConnected ? "bg-emerald-100" : "bg-slate-100"}`}>
                      {printerMode === "windows" && isConnected
                        ? <CheckCircle className="h-5 w-5 text-emerald-600" />
                        : <Monitor className="h-5 w-5 text-slate-400" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-sm">Mode Windows (impression via popup)</p>
                      <p className="text-xs text-muted-foreground text-amber-600">⚠ Tiroir-caisse non supporté</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={handleSetWindowsMode} variant={printerMode === "windows" && isConnected ? "outline" : "default"}>
                    {printerMode === "windows" && isConnected ? "Actif" : "Activer"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {printerMode === "windows" && isConnected && (
              <Button variant="outline" onClick={handleTestWindowsPrint} className="w-full gap-2">
                <Printer className="h-4 w-4" />
                Test impression POS80
              </Button>
            )}

            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-3">
                <p className="text-xs text-amber-700">
                  Ce mode affiche une fenêtre popup à chaque vente pour sélectionner l'imprimante.
                  Le <strong>tiroir-caisse ne s'ouvre pas</strong> automatiquement. Utilisez le mode <strong>Bridge</strong> pour un fonctionnement complet.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ USB MODE ══════════════════════════════════════════════ */}
          <TabsContent value="usb" className="space-y-3 mt-3">
            <Card className={isConnected && printerMode === "usb" ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isConnected && printerMode === "usb" ? "bg-emerald-100" : "bg-slate-100"}`}>
                      {isConnected && printerMode === "usb"
                        ? <CheckCircle className="h-5 w-5 text-emerald-600" />
                        : <Usb className="h-5 w-5 text-slate-400" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {isConnected && printerMode === "usb" ? deviceInfo?.name || "Imprimante USB" : "Non connectée"}
                      </p>
                      {isConnected && printerMode === "usb" && deviceInfo && (
                        <p className="text-xs text-muted-foreground">
                          VID: {deviceInfo.vendorId.toString(16).toUpperCase()} | PID: {deviceInfo.productId.toString(16).toUpperCase()}
                        </p>
                      )}
                    </div>
                  </div>
                  {isConnected && printerMode === "usb" ? (
                    <Button variant="outline" size="sm" onClick={handleDisconnect}>Déconnecter</Button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={() => handleConnect(false)} disabled={isConnecting} className="gap-2">
                        {isConnecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Usb className="h-4 w-4" />}
                        Connecter
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {isConnected && printerMode === "usb" && (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleTestPrint} disabled={isTesting} className="gap-2">
                  {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                  Test impression
                </Button>
                <Button variant="outline" onClick={handleTestDrawer} className="gap-2">
                  <DoorOpen className="h-4 w-4" />
                  Ouvrir tiroir
                </Button>
              </div>
            )}

            {!isConnected && (
              <Button variant="outline" size="sm" onClick={() => handleConnect(true)} disabled={isConnecting} className="w-full gap-2 border-amber-300">
                {isConnecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Usb className="h-4 w-4" />}
                Afficher tous les périphériques USB
              </Button>
            )}
          </TabsContent>

          {/* ══ NETWORK MODE ══════════════════════════════════════════ */}
          <TabsContent value="network" className="space-y-3 mt-3">
            <Card>
              <CardHeader><CardTitle className="text-sm">Configuration réseau IP</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="printer-ip" className="text-xs">Adresse IP imprimante</Label>
                  <Input id="printer-ip" placeholder="192.168.1.100" value={printerIp} onChange={(e) => setPrinterIp(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="printer-port" className="text-xs">Port (par défaut: 9100)</Label>
                  <Input id="printer-port" placeholder="9100" value={printerPort} onChange={(e) => setPrinterPort(e.target.value)} className="mt-1" />
                </div>
                <Button onClick={handleSaveNetworkSettings} className="w-full gap-2">
                  <Wifi className="h-4 w-4" />
                  Sauvegarder
                </Button>
              </CardContent>
            </Card>

            {isConnected && printerMode === "network" && (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleTestNetworkPrinter} disabled={isTesting} className="gap-2">
                  {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                  Test impression
                </Button>
                <Button variant="outline" onClick={handleOpenNetworkDrawer} className="gap-2">
                  <DoorOpen className="h-4 w-4" />
                  Ouvrir tiroir
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
