"use client"

import { useState, useEffect } from "react"
import { Printer, Usb, CheckCircle, XCircle, Settings, RefreshCw, DoorOpen, Wifi, Monitor, Zap } from "lucide-react"
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
import { getQZTrayService, type QZState } from "@/lib/qz-tray-service"

interface PrinterSettingsProps {
  onPrinterConnected?: (connected: boolean) => void
}

export function PrinterSettings({ onPrinterConnected }: PrinterSettingsProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [printerMode, setPrinterMode] = useState<"usb" | "network" | "windows" | "qz-tray">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("printer-mode") as "usb" | "network" | "windows" | "qz-tray" | "bridge"
      // Migrate old "bridge" mode to "qz-tray"
      if (saved === "bridge") return "qz-tray"
      return saved || "qz-tray"
    }
    return "qz-tray"
  })
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; vendorId: number; productId: number } | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // QZ Tray state
  const [qzState, setQzState] = useState<QZState>({
    connected: false,
    printers: [],
    selectedPrinter: null,
    version: null,
  })
  const [isCheckingQZ, setIsCheckingQZ] = useState(false)
  const [selectedQZPrinter, setSelectedQZPrinter] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("qz-printer-name") || ""
    }
    return ""
  })

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

    // Subscribe to QZ Tray state changes
    const qzService = getQZTrayService()
    const unsubscribe = qzService.subscribe(setQzState)

    // Auto-check QZ Tray if in qz-tray mode
    const savedMode = localStorage.getItem("printer-mode") || "qz-tray"
    if (savedMode === "qz-tray" || savedMode === "bridge") {
      checkQZTrayStatus()
    }

    // If QZ Tray was active, mark as connected
    if ((savedMode === "qz-tray" || savedMode === "bridge") && localStorage.getItem("qz-printer-name")) {
      setIsConnected(true)
    }
    if ((savedMode === "windows" || savedMode === "network") && localStorage.getItem("printer-mode") === savedMode) {
      setIsConnected(true)
    }

    return () => unsubscribe()
  }, [])

  // ──── QZ Tray mode ────────────────────────────────────────

  const checkQZTrayStatus = async () => {
    setIsCheckingQZ(true)
    console.log("[v0] Starting QZ Tray check...")
    try {
      const qzService = getQZTrayService()
      console.log("[v0] QZ Service initialized")
      
      const connected = await qzService.connect()
      console.log("[v0] QZ Tray connection result:", connected)
      
      if (connected) {
        const state = qzService.getState()
        console.log("[v0] QZ State after connect:", state)
        setQzState(state)
        toast.success(`QZ Tray connecté! ${state.printers.length} imprimante(s) trouvée(s)`)
      } else {
        console.log("[v0] QZ Tray connection failed")
        toast.error(
          "QZ Tray non disponible",
          {
            description: "1. Téléchargez QZ Tray depuis qz.io/download\n2. Installez et lancez l'application\n3. Cliquez à nouveau sur Vérifier",
            duration: 8000,
          }
        )
      }
    } catch (error: any) {
      console.error("[v0] QZ Tray check error:", error)
      const errorMsg = error?.message || "Impossible de se connecter"
      
      if (errorMsg.includes("n'est pas lancé") || errorMsg.includes("not running")) {
        toast.error(
          "QZ Tray n'est pas démarré",
          {
            description: "Lancez QZ Tray depuis le menu Démarrer Windows, puis cliquez sur Vérifier",
            duration: 6000,
          }
        )
      } else if (errorMsg.includes("Timeout") || errorMsg.includes("timeout")) {
        toast.error(
          "QZ Tray ne répond pas",
          {
            description: "Vérifiez que QZ Tray est lancé (icône dans la barre des tâches)",
            duration: 6000,
          }
        )
      } else {
        toast.error("Erreur: " + errorMsg)
      }
    } finally {
      setIsCheckingQZ(false)
    }
  }

  const handleSaveQZSettings = () => {
    if (!selectedQZPrinter) {
      toast.error("Veuillez sélectionner une imprimante")
      return
    }
    const qzService = getQZTrayService()
    qzService.selectPrinter(selectedQZPrinter)
    localStorage.setItem("printer-mode", "qz-tray")
    setPrinterMode("qz-tray")
    setIsConnected(true)
    onPrinterConnected?.(true)
    toast.success(`Imprimante "${selectedQZPrinter}" configurée via QZ Tray!`)
    setDialogOpen(false)
  }

  const handleTestQZPrint = async () => {
    const printerName = selectedQZPrinter || localStorage.getItem("qz-printer-name")
    if (!printerName) {
      toast.error("Sélectionnez d'abord une imprimante")
      return
    }
    setIsTesting(true)
    try {
      const qzService = getQZTrayService()
      if (!qzService.isConnected()) {
        await qzService.connect()
      }
      qzService.selectPrinter(printerName)
      await qzService.testPrint()
      toast.success("Test d'impression envoyé à " + printerName)
    } catch (e: any) {
      toast.error("Erreur: " + e.message)
    } finally {
      setIsTesting(false)
    }
  }

  const handleTestQZDrawer = async () => {
    const printerName = selectedQZPrinter || localStorage.getItem("qz-printer-name")
    if (!printerName) {
      toast.error("Sélectionnez d'abord une imprimante")
      return
    }
    try {
      const qzService = getQZTrayService()
      if (!qzService.isConnected()) {
        await qzService.connect()
      }
      qzService.selectPrinter(printerName)
      await qzService.openDrawer()
      toast.success("Tiroir-caisse ouvert!")
    } catch (e: any) {
      toast.error("Erreur: " + e.message)
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
    localStorage.setItem("printer-mode", "network")
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
          setPrinterMode(v as "usb" | "network" | "windows" | "qz-tray")
          localStorage.setItem("printer-mode", v)
          if (v === "qz-tray") checkQZTrayStatus()
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="qz-tray" className="gap-1 text-xs">
              <Zap className="h-3.5 w-3.5" />
              QZ Tray
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

          {/* ══ QZ TRAY MODE (RECOMMENDED) ══════════════════════════════ */}
          <TabsContent value="qz-tray" className="space-y-3 mt-3">
            <Card className={qzState.connected ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${qzState.connected ? "bg-emerald-100" : "bg-amber-100"}`}>
                      {qzState.connected
                        ? <CheckCircle className="h-5 w-5 text-emerald-600" />
                        : <XCircle className="h-5 w-5 text-amber-600" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {qzState.connected ? "QZ Tray Connecté" : "QZ Tray Non Disponible"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {qzState.connected && qzState.version ? `Version ${qzState.version}` : "localhost:8181"}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={checkQZTrayStatus}
                    disabled={isCheckingQZ}
                    className="gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isCheckingQZ ? "animate-spin" : ""}`} />
                    Vérifier
                  </Button>
                </div>
              </CardContent>
            </Card>

            {qzState.connected && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Sélectionner l&apos;imprimante POS80</Label>
                  <select
                    title="Sélectionner l'imprimante"
                    aria-label="Sélectionner l'imprimante"
                    value={selectedQZPrinter}
                    onChange={(e) => setSelectedQZPrinter(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  >
                    <option value="">-- Choisir une imprimante --</option>
                    {qzState.printers.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <Button onClick={handleSaveQZSettings} className="w-full gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Utiliser cette imprimante
                </Button>

                {selectedQZPrinter && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={handleTestQZPrint} disabled={isTesting} className="gap-1.5 text-xs">
                      {isTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                      Test impression
                    </Button>
                    <Button variant="outline" onClick={handleTestQZDrawer} className="gap-1.5 text-xs">
                      <DoorOpen className="h-3.5 w-3.5" />
                      Ouvrir tiroir
                    </Button>
                  </div>
                )}
              </>
            )}

            {isCheckingQZ && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                    <div>
                      <p className="font-medium text-sm text-blue-800">Recherche de QZ Tray...</p>
                      <p className="text-xs text-blue-600">Vérification des ports 8181, 8282, 8383, 8484</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!qzState.connected && !isCheckingQZ && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4 space-y-3">
                  <h4 className="font-semibold text-sm text-blue-800">
                    Mode recommandé pour POS80
                  </h4>
                  <p className="text-xs text-blue-700">
                    QZ Tray est une application gratuite qui permet l&apos;impression directe sur imprimante thermique
                    sans popup, avec ouverture automatique du tiroir-caisse.
                  </p>
                  
                  <div className="bg-white/70 rounded-lg p-3 space-y-2">
                    <p className="font-semibold text-xs text-blue-800">Installation (une seule fois):</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-blue-700 ml-1">
                      <li>
                        <a href="https://qz.io/download/" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-blue-900">
                          Téléchargez QZ Tray
                        </a> (gratuit)
                      </li>
                      <li>Installez l&apos;application sur votre PC (clic droit → Administrateur)</li>
                      <li>Lancez QZ Tray depuis le <strong>menu Démarrer</strong></li>
                      <li>Une icône apparaîtra dans la <strong>barre des tâches</strong></li>
                      <li>Cliquez sur <strong>Vérifier</strong> ci-dessus</li>
                    </ol>
                  </div>
                  
                  <div className="flex gap-2">
                    <a
                      href="https://qz.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Zap className="h-4 w-4" />
                      Télécharger QZ Tray
                    </a>
                  </div>
                  
                  <p className="text-xs text-blue-600 text-center">
                    QZ Tray est déjà installé? Lancez-le depuis le menu Démarrer puis cliquez Vérifier
                  </p>
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
                      <p className="text-xs text-muted-foreground text-amber-600">Tiroir-caisse non supporté</p>
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
                  Ce mode affiche une fenêtre popup à chaque vente pour sélectionner l&apos;imprimante.
                  Le <strong>tiroir-caisse ne s&apos;ouvre pas</strong> automatiquement. Utilisez le mode <strong>QZ Tray</strong> pour un fonctionnement complet.
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
