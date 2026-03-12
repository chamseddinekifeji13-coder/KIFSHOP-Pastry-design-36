"use client"

import { useState } from "react"
import { Monitor, Tablet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TreasuryPosView } from "./treasury-pos-view"
import { TreasuryDesktopView } from "./treasury-desktop-view"

export function TreasuryView() {
  // Default to POS mode for cash register usage
  const [viewMode, setViewMode] = useState<"pos" | "desktop">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("treasury-view-mode")
      if (saved) return saved as "pos" | "desktop"
    }
    return "pos" // Default to POS mode
  })

  const toggleViewMode = () => {
    const newMode = viewMode === "pos" ? "desktop" : "pos"
    setViewMode(newMode)
    localStorage.setItem("treasury-view-mode", newMode)
  }

  // POS mode: no floating button, it's now inside the POS header
  if (viewMode === "pos") {
    return <TreasuryPosView />
  }
  }

  return (
    <div className="relative">
      {/* View Mode Toggle for desktop */}
      <div className="absolute top-0 right-0 z-10">
        <Button
          variant="default"
          size="sm"
          onClick={toggleViewMode}
          className="gap-2"
        >
          <Tablet className="h-4 w-4" />
          <span>Mode Caisse</span>
        </Button>
      </div>
      <TreasuryDesktopView />
    </div>
  )
}
