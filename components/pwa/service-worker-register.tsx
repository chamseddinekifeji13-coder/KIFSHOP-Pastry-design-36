"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"

export function ServiceWorkerRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  const onUpdate = useCallback((reg: ServiceWorkerRegistration) => {
    setWaitingWorker(reg.waiting)
    toast("Nouvelle version disponible", {
      description: "Cliquez pour mettre a jour KIFSHOP",
      duration: Infinity,
      action: {
        label: "Mettre a jour",
        onClick: () => {
          reg.waiting?.postMessage({ type: "SKIP_WAITING" })
          window.location.reload()
        },
      },
    })
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Check for waiting worker on load
      if (reg.waiting) {
        onUpdate(reg)
        return
      }
      // Listen for new worker installing
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            onUpdate(reg)
          }
        })
      })
    })

    // Reload when the new SW takes over
    let refreshing = false
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  }, [onUpdate])

  return null
}
