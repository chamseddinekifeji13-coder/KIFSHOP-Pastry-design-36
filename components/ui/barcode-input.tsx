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
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<any>(null)
  const animFrameRef = useRef<number | null>(null)

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
    setInitializing(false)
  }, [])

  const startScanning = useCallback(async () => {
    if (!("BarcodeDetector" in window)) {
      toast.info("Le scan camera n'est pas supporte sur ce navigateur.")
      return
    }

    setInitializing(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      })

      streamRef.current = stream

      // Wait a tick for the video element to mount
      await new Promise((r) => setTimeout(r, 100))

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      detectorRef.current = new (window as any).BarcodeDetector({
        formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"],
      })

      setScanning(true)
      setInitializing(false)

      const detect = async () => {
        if (!videoRef.current || !detectorRef.current || videoRef.current.readyState !== 4) {
          animFrameRef.current = requestAnimationFrame(detect)
          return
        }

        try {
          const barcodes = await detectorRef.current.detect(videoRef.current)
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue
            onChange(code)
            toast.success(`Code-barres detecte : ${code}`)
            stopCamera()
            return
          }
        } catch {
          // detection failed, keep trying
        }

        animFrameRef.current = requestAnimationFrame(detect)
      }

      animFrameRef.current = requestAnimationFrame(detect)
    } catch (err: any) {
      setInitializing(false)
      if (err.name === "NotAllowedError") {
        toast.error("Acces camera refuse. Veuillez autoriser la camera dans les parametres.")
      } else {
        toast.info("Camera non disponible.")
      }
    }
  }, [onChange, stopCamera])

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
      </div>

      {/* Camera preview */}
      {(scanning || initializing) && (
        <div className="relative rounded-lg overflow-hidden border bg-black aspect-video max-h-36">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-24 border-2 border-primary/70 rounded-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-pulse" />
              </div>
            </div>
          )}
          {initializing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center">
                <Loader2 className="h-5 w-5 animate-spin text-white mx-auto mb-1" />
                <p className="text-[11px] text-white/70">Initialisation camera...</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-1 left-1 right-1 flex justify-center">
            <span className="text-[10px] text-white/60 bg-black/40 rounded px-2 py-0.5">
              <ScanBarcode className="h-3 w-3 inline mr-1" />
              Placez le code-barres dans le cadre
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
