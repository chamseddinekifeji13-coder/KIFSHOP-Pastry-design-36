"use client"

import { useEffect, useCallback } from "react"
import { toast } from "sonner"

const SW_BUILD = process.env.NEXT_PUBLIC_SW_BUILD || "dev-local"
const SW_SCRIPT_URL = `/sw.js?build=${encodeURIComponent(SW_BUILD)}`

export function ServiceWorkerRegister() {
  const onUpdate = useCallback((reg: ServiceWorkerRegistration) => {
    const waiting = reg.waiting
    if (!waiting) return

    toast("Mise a jour en cours...", {
      description: "KIFSHOP se met a jour automatiquement.",
      duration: 3000,
    })

    waiting.postMessage({ type: "SKIP_WAITING" })
  }, [])

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    let intervalId: ReturnType<typeof setInterval> | null = null

    const registerSW = async () => {
      try {
        const expectedSwUrl = new URL(SW_SCRIPT_URL, window.location.origin).toString()

        // Recovery step: unregister stale service workers so clients can migrate
        // even when an old script is stuck behind intermediary caches.
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || ""
          const isKifshopSw = scriptUrl.includes("/sw.js")
          let isStaleKifshopSw = false

          if (isKifshopSw) {
            try {
              const parsed = new URL(scriptUrl)
              const buildInRegistration = parsed.searchParams.get("build")
              // Consider stale when build is missing/mismatched, or URL differs from current target URL.
              isStaleKifshopSw = buildInRegistration !== SW_BUILD || scriptUrl !== expectedSwUrl
            } catch {
              isStaleKifshopSw = true
            }
          }

          if (isStaleKifshopSw) {
            await registration.unregister()
          }
        }

        const reg = await navigator.serviceWorker.register(SW_SCRIPT_URL, {
          updateViaCache: "none",
          scope: "/"
        })

        if (reg.waiting) {
          onUpdate(reg)
          return
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              onUpdate(reg)
            }
          })
        })

        intervalId = setInterval(() => {
          reg.update().catch(() => {})
        }, 30 * 1000)

        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            reg.update().catch(() => {})
          }
        }
        document.addEventListener("visibilitychange", handleVisibilityChange)

      } catch (err) {
        // Service Worker registration failures are not critical
        // The app continues to function normally without PWA capabilities
        if (process.env.NODE_ENV === "development") {
          console.log("[SW] Registration info:", err)
        }
      }
    }

    registerSW()

    let refreshing = false
    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

    return () => {
      if (intervalId) clearInterval(intervalId)
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
    }
  }, [onUpdate])

  return null
}
