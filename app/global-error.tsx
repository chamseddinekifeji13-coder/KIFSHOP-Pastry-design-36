"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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
            {error.message || "Une erreur inattendue est survenue"}
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
