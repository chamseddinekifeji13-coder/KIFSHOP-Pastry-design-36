"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

// Keep the deferred prompt outside React state so it survives re-renders
// and route changes. The browser fires `beforeinstallprompt` only once per
// page load; if the component re-mounts we'd lose it otherwise.
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null

const DISMISS_KEY = "kifshop-install-dismissed"
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000 // re-ask after 3 days

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const ts = Number(raw)
    if (Number.isNaN(ts)) return false
    return Date.now() - ts < DISMISS_DURATION_MS
  } catch {
    return false
  }
}

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [hasPrompt, setHasPrompt] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show banner after a short delay (5s instead of 30s)
  const scheduleShow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShow(true), 5000)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    // Already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return

    // If the global prompt was captured before mount (e.g. route change)
    if (globalDeferredPrompt && !isDismissed()) {
      setHasPrompt(true)
      scheduleShow()
    }

    const handler = (e: Event) => {
      e.preventDefault()
      globalDeferredPrompt = e as BeforeInstallPromptEvent
      setHasPrompt(true)
      if (!isDismissed()) {
        scheduleShow()
      }
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [scheduleShow])

  const handleInstall = async () => {
    if (!globalDeferredPrompt) return
    try {
      await globalDeferredPrompt.prompt()
      const { outcome } = await globalDeferredPrompt.userChoice
      if (outcome === "accepted") {
        setShow(false)
      }
    } catch {
      // prompt() can throw if called twice
    }
    globalDeferredPrompt = null
    setHasPrompt(false)
  }

  const handleDismiss = () => {
    setShow(false)
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString())
    } catch {
      // storage full — ignore
    }
  }

  if (!show || !hasPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm animate-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#4A7C59]/10">
            <Download className="h-5 w-5 text-[#4A7C59]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Installer KIFSHOP</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {"Accedez a KIFSHOP depuis votre ecran d'accueil, meme hors connexion."}
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="h-8 bg-[#4A7C59] hover:bg-[#3D6B4A] text-xs" onClick={handleInstall}>
                Installer
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={handleDismiss}>
                Plus tard
              </Button>
            </div>
          </div>
          <button onClick={handleDismiss} className="shrink-0 p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground transition-colors" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
