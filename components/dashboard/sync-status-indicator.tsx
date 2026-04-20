"use client"

import { useEffect, useState } from "react"
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useTransactions, useRawMaterials, useOrders } from "@/hooks/use-tenant-data"

export function SyncStatusIndicator() {
  const { isLoading: txLoading, error: txError } = useTransactions()
  const { isLoading: rmLoading, error: rmError } = useRawMaterials()
  const { isLoading: ordLoading, error: ordError } = useOrders()
  
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Update last sync time when data loads
  useEffect(() => {
    if (!txLoading && !rmLoading && !ordLoading) {
      setLastSync(new Date())
      setIsLoading(false)
    } else {
      setIsLoading(true)
    }
  }, [txLoading, rmLoading, ordLoading])

  const hasError = txError || rmError || ordError
  const isSync = !isLoading && !hasError

  const formatLastSync = (date: Date | null) => {
    if (!date) return "Jamais"
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diff < 10) return "À l'instant"
    if (diff < 60) return `Il y a ${diff}s`
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}min`
    return date.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })
  }

  const getStatusText = () => {
    if (isLoading) return "Synchronisation..."
    if (hasError) return "Erreur de synchro"
    return "Données à jour"
  }

  const getStatusColor = () => {
    if (isLoading) return "text-blue-600"
    if (hasError) return "text-red-600"
    return "text-green-600"
  }

  const getErrorMessages = () => {
    const errors = []
    if (txError) errors.push(`Transactions: ${txError.message}`)
    if (rmError) errors.push(`Matières premières: ${rmError.message}`)
    if (ordError) errors.push(`Commandes: ${ordError.message}`)
    return errors
  }

  return (
    <div className={`rounded-lg border p-3 ${isSync ? 'bg-green-50 border-green-200' : hasError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          {isLoading ? (
            <Loader2 className={`w-4 h-4 animate-spin ${getStatusColor()}`} />
          ) : hasError ? (
            <AlertCircle className={`w-4 h-4 ${getStatusColor()}`} />
          ) : (
            <CheckCircle2 className={`w-4 h-4 ${getStatusColor()}`} />
          )}
          
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${getStatusColor()}`}>
              {getStatusText()}
            </p>
            <p className="text-xs text-gray-600">
              Dernier sync: {formatLastSync(lastSync)}
            </p>
            
            {/* Afficher les erreurs si présentes */}
            {hasError && getErrorMessages().length > 0 && (
              <div className="mt-1 text-xs text-red-700 space-y-1">
                {getErrorMessages().map((msg, i) => (
                  <p key={i}>• {msg}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
