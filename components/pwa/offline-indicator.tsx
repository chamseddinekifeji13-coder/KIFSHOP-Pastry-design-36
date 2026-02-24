"use client"

import { useState, useEffect, useRef } from "react"
import { WifiOff } from "lucide-react"

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleOffline = () => {
      // Clear any pending "hide banner" timer so it doesn't fire while offline
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setIsOffline(true)
      setShow(true)
    }
    const handleOnline = () => {
      setIsOffline(false)
      // Keep showing the "back online" message for 3s, then hide
      timerRef.current = setTimeout(() => setShow(false), 3000)
    }

    // Check initial state
    if (!navigator.onLine) {
      setIsOffline(true)
      setShow(true)
    }

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)
    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  if (!show) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-colors duration-300 ${
      isOffline
        ? "bg-amber-500 text-white"
        : "bg-emerald-500 text-white"
    }`}>
      {isOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>{"Vous \u00eates hors connexion \u2014 Mode offline actif"}</span>
        </>
      ) : (
        <span>{"Connexion r\u00e9tablie"}</span>
      )}
    </div>
  )
}
