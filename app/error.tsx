"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[v0] App error:", error)
  }, [error])

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-xl font-bold text-foreground">
          Une erreur est survenue
        </h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "Erreur inattendue"}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Digest: {error.digest}
          </p>
        )}
        <Button onClick={reset} variant="outline">
          Reessayer
        </Button>
      </div>
    </div>
  )
}
