"use client"

import { useEffect, useMemo } from "react"

// Helper to safely extract error message as string
function getErrorMessage(error: unknown): string {
  if (!error) return "Erreur inattendue"
  if (typeof error === "string") return error
  if (error instanceof Error) return error.message || "Erreur inattendue"
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

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Safely extract the error message to avoid React #310
  const errorMessage = useMemo(() => getErrorMessage(error), [error])

  useEffect(() => {
    console.error("[KIFSHOP] Global error:", error)
  }, [error])

  return (
    <html lang="fr">
      <body className="font-sans m-0 p-8 flex items-center justify-center min-h-screen">
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-bold mb-2">
            Erreur critique
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            {errorMessage}
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 border border-border rounded-md bg-background cursor-pointer hover:bg-muted"
          >
            Reessayer
          </button>
        </div>
      </body>
    </html>
  )
}
