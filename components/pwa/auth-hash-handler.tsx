"use client"

import { useEffect } from "react"

/**
 * AuthHashHandler Component
 * Handles auth hash fragments from URL for PWA and redirect flows
 * Works in conjunction with page.tsx root page handling
 */
export function AuthHashHandler() {
  useEffect(() => {
    // This component doesn't render anything - it just handles auth flows
    // The actual routing is done in page.tsx using useEffect
    // This prevents hydration mismatches by not rendering UI during SSR
  }, [])

  return null
}
