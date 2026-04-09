"use client"

import { useEffect } from "react"

function getOrientation(): "portrait" | "landscape" {
  if (typeof window === "undefined") return "portrait"
  return window.innerWidth > window.innerHeight ? "landscape" : "portrait"
}

export function OrientationSync() {
  useEffect(() => {
    const applyViewportMetrics = () => {
      const orientation = getOrientation()
      const vw = window.innerWidth
      const vh = window.innerHeight

      document.documentElement.setAttribute("data-orientation", orientation)
      document.documentElement.style.setProperty("--app-vw", `${vw}px`)
      document.documentElement.style.setProperty("--app-vh", `${vh}px`)
    }

    const handleOrientationOrResize = () => {
      applyViewportMetrics()
      // Some mobile browsers need a manual resize event after rotation.
      setTimeout(() => window.dispatchEvent(new Event("resize")), 50)
    }

    applyViewportMetrics()
    window.addEventListener("orientationchange", handleOrientationOrResize)
    window.addEventListener("resize", handleOrientationOrResize)
    window.visualViewport?.addEventListener("resize", handleOrientationOrResize)

    return () => {
      window.removeEventListener("orientationchange", handleOrientationOrResize)
      window.removeEventListener("resize", handleOrientationOrResize)
      window.visualViewport?.removeEventListener("resize", handleOrientationOrResize)
    }
  }, [])

  return null
}
