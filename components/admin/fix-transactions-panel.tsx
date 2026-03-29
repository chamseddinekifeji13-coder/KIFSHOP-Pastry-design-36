"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"

export function FixTransactionsPanel() {
  const [isFixing, setIsFixing] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    error?: string
  } | null>(null)

  const handleFix = async () => {
    setIsFixing(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/fix-transactions', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setResult({
          success: false,
          message: 'Erreur lors de la réparation',
          error: data.error
        })
      } else {
        setResult({
          success: true,
          message: data.message
        })
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: 'Erreur',
        error: err.message
      })
    } finally {
      setIsFixing(false)
    }
  }

  return (
    <Card className="p-6 bg-red-50 border-red-200">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Erreur de paiement détectée</h3>
            <p className="text-sm text-red-800 mt-1">
              La table transactions a une contrainte invalide qui empêche les paiements.
            </p>
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-red-200 text-sm font-mono text-red-700">
          transactions_created_by_fkey constraint error
        </div>

        <p className="text-sm text-red-900">
          Cliquez sur le bouton ci-dessous pour réparer automatiquement la table:
        </p>

        <Button
          onClick={handleFix}
          disabled={isFixing}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          {isFixing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Réparation en cours...
            </>
          ) : (
            'Réparer la table transactions'
          )}
        </Button>

        {result && (
          <div className={`p-3 rounded flex items-start gap-2 ${
            result.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="text-sm">
              <p className={result.success ? 'text-green-800 font-semibold' : 'text-red-800 font-semibold'}>
                {result.message}
              </p>
              {result.error && (
                <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                  {result.error}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
