"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { WifiOff } from "lucide-react"

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isVerifyingRef = useRef(false)
  const isOfflineRef = useRef(false)

  // Smart connectivity check - actually verifies with a real request
  const verifyConnectivity = async () => {
    if (isVerifyingRef.current) return
    isVerifyingRef.current = true

    try {
      // Use a GET request with a cache-busting parameter for better reliability
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`/api/health?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      isVerifyingRef.current = false

      // If we got a response, we're online
      return response.ok || response.status === 304
    } catch (error) {
      // Network request failed - try a fallback
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

  // Handle offline event with verification
  const handleOffline = useCallback(async () => {
    // Don't immediately mark as offline - verify first
    const isActuallyOffline = !(await verifyConnectivity())

    if (isActuallyOffline) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setIsOffline(true)
      isOfflineRef.current = true
      setShow(true)
    }
  }, [])

  // Handle online event
  const handleOnline = useCallback(() => {
    setIsOffline(false)
    isOfflineRef.current = false
    // Keep showing the "back online" message for 3s, then hide
    timerRef.current = setTimeout(() => setShow(false), 3000)
  }, [])

  useEffect(() => {
    // Initial connectivity check
    const initCheck = async () => {
      const isConnected = await verifyConnectivity()
      if (!isConnected && !navigator.onLine) {
        setIsOffline(true)
        isOfflineRef.current = true
        setShow(true)
      }
    }

    initCheck()

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    // Periodic verification (every 30s) to catch lingering false offline states
    const intervalId = setInterval(async () => {
      if (isOfflineRef.current) {
        const isConnected = await verifyConnectivity()
        if (isConnected) {
          handleOnline()
        }
      }
    }, 30000)

    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
      clearInterval(intervalId)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current)
    }
  }, [handleOffline, handleOnline])

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
          <span>{"Mode hors ligne actif"}</span>
        </>
      ) : (
        <span>{"Connexion rétablie"}</span>
      )}
    </div>
  )
}
