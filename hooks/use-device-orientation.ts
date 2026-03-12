"use client"

import { useEffect, useState } from "react"

interface OrientationState {
  isPortrait: boolean
  isLandscape: boolean
  angle: number
}

export function useDeviceOrientation(): OrientationState {
  const [orientation, setOrientation] = useState<OrientationState>({
    isPortrait: true,
    isLandscape: false,
    angle: 0,
  })

  useEffect(() => {
    const handleOrientationChange = () => {
      const isPortrait = window.innerHeight > window.innerWidth
      const angle = (window.screen as any).orientation?.angle || 0

      setOrientation({
        isPortrait,
        isLandscape: !isPortrait,
        angle,
      })
    }

    // Initial check
    handleOrientationChange()

    // Listen for changes
    window.addEventListener("orientationchange", handleOrientationChange)
    window.addEventListener("resize", handleOrientationChange)

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange)
      window.removeEventListener("resize", handleOrientationChange)
    }
  }, [])

  return orientation
}

// For adaptive layout in POS
export const ORIENTATION_CLASSES = {
  portraitLayout: "grid-cols-1 md:grid-cols-4",
  landscapeLayout: "grid-cols-2 lg:grid-cols-6",
  portraitCart: "w-full md:w-80",
  landscapeCart: "w-96",
}
