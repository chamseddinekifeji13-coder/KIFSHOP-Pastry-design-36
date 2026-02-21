"use client"

import { useState, useEffect } from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Don't show if user already dismissed or app is installed
    if (typeof window === "undefined") return
    const alreadyDismissed = localStorage.getItem("kifshop-install-dismissed")
    if (alreadyDismissed) return
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show prompt after 30s of usage
      setTimeout(() => setShow(true), 30000)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setShow(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShow(false)
    setDismissed(true)
    localStorage.setItem("kifshop-install-dismissed", Date.now().toString())
  }

  if (!show || dismissed || !deferredPrompt) return null

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
