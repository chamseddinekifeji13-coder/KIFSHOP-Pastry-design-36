"use client"

import { useState } from "react"
import { Monitor, Tablet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TreasuryPosView } from "./treasury-pos-view"
import { TreasuryDesktopView } from "./treasury-desktop-view"

export function TreasuryView() {
  // Detect if touch device or use localStorage preference
  const [viewMode, setViewMode] = useState<"pos" | "desktop">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("treasury-view-mode")
      if (saved) return saved as "pos" | "desktop"
      // Auto-detect touch devices
      return "ontouchstart" in window || navigator.maxTouchPoints > 0 ? "pos" : "desktop"
    }
    return "desktop"
  })

  const toggleViewMode = () => {
    const newMode = viewMode === "pos" ? "desktop" : "pos"
    setViewMode(newMode)
    localStorage.setItem("treasury-view-mode", newMode)
  }

  return (
    <div className="relative">
      {/* View Mode Toggle */}
      <div className="absolute top-0 right-0 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleViewMode}
          className="gap-2"
        >
          {viewMode === "pos" ? (
            <>
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Mode Bureau</span>
            </>
          ) : (
            <>
              <Tablet className="h-4 w-4" />
              <span className="hidden sm:inline">Mode Caisse</span>
            </>
          )}
        </Button>
      </div>

      {/* Render appropriate view */}
      {viewMode === "pos" ? <TreasuryPosView /> : <TreasuryDesktopView />}
    </div>
  )
}
