"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { ScanBarcode, Camera, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface BarcodeInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function BarcodeInput({ value, onChange, placeholder = "Ex: 6191234567890", className }: BarcodeInputProps) {
  const [scanning, setScanning] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [cameraSupported, setCameraSupported] = useState(false)
  const scannerRef = useRef<any>(null)
  const containerId = useRef(`barcode-reader-${Math.random().toString(36).slice(2, 9)}`).current

  // Check if camera is available (works on all browsers)
  useEffect(() => {
    setCameraSupported(
      typeof window !== "undefined" &&
      "mediaDevices" in navigator &&
      !!navigator.mediaDevices?.getUserMedia
    )
  }, [])

  const stopCamera = useCallback(async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState()
        // state 2 = scanning, state 3 = paused
        if (state === 2 || state === 3) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
        scannerRef.current = null
      }
    } catch {
      // ignore cleanup errors
    }
    setScanning(false)
    setInitializing(false)
  }, [])

  const startScanning = useCallback(async () => {
    if (!cameraSupported) {
      toast.info("La camera n'est pas disponible sur ce navigateur.")
      return
    }

    setInitializing(true)

    try {
      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import("html5-qrcode")

      // Clean up any previous scanner
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop()
          scannerRef.current.clear()
        } catch {
          // ignore
        }
      }

      const scanner = new Html5Qrcode(containerId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 100 },
          aspectRatio: 1.777,
        },
        (decodedText: string) => {
          // Successfully scanned
          onChange(decodedText)
          toast.success(`Code detecte : ${decodedText}`)
          stopCamera()
        },
        () => {
          // Scan frame - no match yet, keep trying
        }
      )

      setScanning(true)
      setInitializing(false)
    } catch (err: any) {
      setInitializing(false)
      setScanning(false)
      if (err?.message?.includes("NotAllowedError") || err?.name === "NotAllowedError") {
        toast.error("Acces camera refuse. Autorisez la camera dans les parametres.")
      } else {
        toast.error("Impossible de demarrer la camera.")
      }
    }
  }, [cameraSupported, containerId, onChange, stopCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
        />
        {cameraSupported && (
          <Button
            type="button"
            variant={scanning ? "destructive" : "outline"}
            size="icon"
            className="shrink-0"
            onClick={() => {
              if (scanning || initializing) {
                stopCamera()
              } else {
                startScanning()
              }
            }}
            title={scanning ? "Arreter le scan" : "Scanner avec la camera"}
          >
            {initializing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : scanning ? (
              <X className="h-4 w-4" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Camera preview container - html5-qrcode renders into this div */}
      <div
        id={containerId}
        className={scanning || initializing ? "rounded-lg overflow-hidden border" : "hidden"}
      />

      {initializing && (
        <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">Initialisation de la camera...</span>
        </div>
      )}

      {scanning && (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground justify-center">
          <ScanBarcode className="h-3 w-3" />
          Placez le code-barres dans le cadre
        </p>
      )}
    </div>
  )
}
