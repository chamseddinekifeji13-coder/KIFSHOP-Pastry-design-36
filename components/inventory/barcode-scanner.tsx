"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Camera, X, ScanBarcode, Loader2, CheckCircle2, AlertCircle, Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface BarcodeScanResult {
  id: string
  name: string
  type: "mp" | "pf"
  current_stock: number
  unit: string
  barcode: string
}

interface BarcodeScannerProps {
  tenantId: string
  onProductFound: (product: BarcodeScanResult) => void
  onClose: () => void
}

export function BarcodeScanner({ tenantId, onProductFound, onClose }: BarcodeScannerProps) {
  const [mode, setMode] = useState<"camera" | "manual">("camera")
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [looking, setLooking] = useState(false)
  const [lastResult, setLastResult] = useState<{ found: boolean; name?: string } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<any>(null)
  const animFrameRef = useRef<number | null>(null)

  const lookupBarcode = useCallback(async (code: string) => {
    if (!code.trim() || looking) return
    setLooking(true)
    setLastResult(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc("find_product_by_barcode", {
        p_tenant_id: tenantId,
        p_barcode: code.trim(),
      })

      if (error) {
        toast.error("Erreur lors de la recherche")
        setLastResult({ found: false })
        return
      }

      if (data?.error === "not_found") {
        toast.warning(`Aucun produit trouve pour le code: ${code}`)
        setLastResult({ found: false })
        return
      }

      const product = data as BarcodeScanResult
      setLastResult({ found: true, name: product.name })
      toast.success(`${product.name} trouve!`)
      onProductFound(product)
    } catch {
      toast.error("Erreur inattendue")
      setLastResult({ found: false })
    } finally {
      setLooking(false)
    }
  }, [tenantId, looking, onProductFound])

  // Camera scanning using BarcodeDetector API
  const startCameraScanning = useCallback(async () => {
    try {
      // Check if BarcodeDetector is available
      if (!("BarcodeDetector" in window)) {
        toast.info("Camera non supportee sur ce navigateur. Utilisez la saisie manuelle.")
        setMode("manual")
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      detectorRef.current = new (window as any).BarcodeDetector({
        formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"],
      })

      setScanning(true)

      const detect = async () => {
        if (!videoRef.current || !detectorRef.current || videoRef.current.readyState !== 4) {
          animFrameRef.current = requestAnimationFrame(detect)
          return
        }

        try {
          const barcodes = await detectorRef.current.detect(videoRef.current)
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue
            // Stop scanning while we look up
            stopCamera()
            await lookupBarcode(code)
            return
          }
        } catch {
          // Detection failed, keep trying
        }

        animFrameRef.current = requestAnimationFrame(detect)
      }

      animFrameRef.current = requestAnimationFrame(detect)
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Acces camera refuse. Veuillez autoriser la camera.")
      } else {
        toast.info("Camera non disponible. Utilisez la saisie manuelle.")
      }
      setMode("manual")
    }
  }, [lookupBarcode])

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }, [])

  useEffect(() => {
    if (mode === "camera") {
      startCameraScanning()
    }
    return () => {
      stopCamera()
    }
  }, [mode, startCameraScanning, stopCamera])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      lookupBarcode(manualCode.trim())
      setManualCode("")
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-muted/50 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <ScanBarcode className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Scanner un code-barres</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={mode === "camera" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs rounded-lg"
            onClick={() => setMode("camera")}
          >
            <Camera className="mr-1 h-3 w-3" /> Camera
          </Button>
          <Button
            variant={mode === "manual" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs rounded-lg"
            onClick={() => { stopCamera(); setMode("manual") }}
          >
            <Keyboard className="mr-1 h-3 w-3" /> Manuel
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { stopCamera(); onClose() }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Camera view */}
      {mode === "camera" && (
        <div className="relative bg-black aspect-video max-h-48">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            crossOrigin="anonymous"
          />
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-32 border-2 border-primary/70 rounded-lg">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/80 animate-[scan_2s_ease-in-out_infinite]" />
              </div>
            </div>
          )}
          {!scanning && !looking && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin text-white mx-auto mb-2" />
                <p className="text-xs text-white/70">Initialisation de la camera...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual input */}
      {mode === "manual" && (
        <form onSubmit={handleManualSubmit} className="flex gap-2 p-4">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Tapez ou scannez le code-barres..."
            className="flex-1 bg-muted/50 border-0"
            autoFocus
          />
          <Button type="submit" size="sm" disabled={!manualCode.trim() || looking} className="rounded-lg">
            {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechercher"}
          </Button>
        </form>
      )}

      {/* Result feedback */}
      {(looking || lastResult) && (
        <div className={`flex items-center gap-2 px-4 py-2.5 text-sm border-t ${
          looking ? "bg-muted/30" : lastResult?.found ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
        }`}>
          {looking && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Recherche en cours...</>}
          {!looking && lastResult?.found && <><CheckCircle2 className="h-3.5 w-3.5" /> {lastResult.name} - ajoute a l{"'"}inventaire</>}
          {!looking && lastResult && !lastResult.found && <><AlertCircle className="h-3.5 w-3.5" /> Produit non trouve. Verifiez le code ou ajoutez-le manuellement.</>}
        </div>
      )}
    </div>
  )
}
