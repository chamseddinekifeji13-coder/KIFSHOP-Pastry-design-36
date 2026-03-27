"use client"

import { useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"

// Helper to safely extract error message as string
function getErrorMessage(error: unknown): string {
  if (!error) return "Erreur inattendue"
  if (typeof error === "string") return error
  if (error instanceof Error) {
    return error.message || "Erreur inattendue"
  }
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>
    if (typeof e.message === "string") return e.message
    if (typeof e.error === "string") return e.error
    try {
      return JSON.stringify(error)
    } catch {
      return "Erreur inattendue"
    }
  }
  return String(error)
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Safely extract the error message to avoid React #310
  const errorMessage = useMemo(() => getErrorMessage(error), [error])

  useEffect(() => {
    console.error("[KIFSHOP] App error:", error)
  }, [error])

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-xl font-bold text-foreground">
          Une erreur est survenue
        </h2>
        <p className="text-sm text-muted-foreground">
          {errorMessage}
        </p>
        {typeof error?.digest === "string" && error.digest && (
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
