"use client"

import { useState, useEffect, useRef } from "react"
import { WifiOff } from "lucide-react"

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handlersSetRef = useRef(false)
  const isVerifyingRef = useRef(false)

  const verifyConnectivity = async (): Promise<boolean> => {
    if (isVerifyingRef.current) return true
    isVerifyingRef.current = true

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`/api/health?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      isVerifyingRef.current = false
      return response.ok || response.status === 304
    } catch {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        
        const fallbackResponse = await fetch(`/manifest.json?t=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        isVerifyingRef.current = false
        return fallbackResponse.ok
      } catch {
        isVerifyingRef.current = false
        return false
      }
    }
  }

  useEffect(() => {
    // Only setup once
    if (handlersSetRef.current) return
    handlersSetRef.current = true

    let mounted = true
    let intervalId: NodeJS.Timeout | null = null

    const handleOffline = async () => {
      const isActuallyOffline = !(await verifyConnectivity())
      if (isActuallyOffline && mounted) {
        if (timerRef.current) clearTimeout(timerRef.current)
        setIsOffline(true)
        setShow(true)
      }
    }

    const handleOnline = () => {
      if (mounted) {
        setIsOffline(false)
        timerRef.current = setTimeout(() => setShow(false), 3000)
      }
    }

    // Initial check
    verifyConnectivity().then(isConnected => {
      if (mounted && !isConnected && !navigator.onLine) {
        setIsOffline(true)
        setShow(true)
      }
    })

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    // Periodic check every 30s
    intervalId = setInterval(async () => {
      if (!mounted) return
      const isConnected = await verifyConnectivity()
      if (isConnected && mounted) setIsOffline(false)
    }, 30000)

    return () => {
      mounted = false
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
      if (intervalId) clearInterval(intervalId)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!show) return null

  return (
    <div className={`fixed bottom-4 right-4 z-[60] flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-300 shadow-md ${
      isOffline
        ? "bg-amber-100 text-amber-800 border border-amber-200"
        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
    }`}>
      {isOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Mode hors ligne actif</span>
        </>
      ) : (
        <span>Connexion rétablie</span>
      )}
    </div>
  )
}
