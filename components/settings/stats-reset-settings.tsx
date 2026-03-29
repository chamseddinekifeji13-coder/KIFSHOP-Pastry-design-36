import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { RotateCcw, Check } from "lucide-react"
import { useTenant } from "@/lib/tenant-context"
import { resetSellerStats, clearStatsReset, getStatsResetDate } from "@/lib/settings/stats-actions"
import { toast } from "sonner"
import { useEffect } from "react"

export function StatsResetSettings() {
  const { currentTenant } = useTenant()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetDate, setResetDate] = useState<Date | null>(null)
  const [checking, setChecking] = useState(true)

  // Check if stats have been reset
  useEffect(() => {
    if (currentTenant?.id) {
      checkResetDate()
    }
  }, [currentTenant?.id])

  const checkResetDate = async () => {
    if (!currentTenant?.id) {
      setChecking(false)
      return
    }
    try {
      const date = await getStatsResetDate(currentTenant.id)
      setResetDate(date)
    } catch (error) {
      console.error("Error checking reset date:", error)
    } finally {
      setChecking(false)
    }
  }

  const handleResetStats = async () => {
    setLoading(true)
    try {
      const result = await resetSellerStats(currentTenant.id)
      if (result.success) {
        toast.success("Stats réinitialisées", {
          description: "Les statistiques des vendeurs ont été réinitialisées. Seules les données après cette date seront comptabilisées.",
        })
        await checkResetDate()
      } else {
        toast.error("Erreur", { description: result.error })
      }
    } catch (error) {
      toast.error("Erreur lors de la réinitialisation")
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  const handleClearReset = async () => {
    setLoading(true)
    try {
      const result = await clearStatsReset(currentTenant.id)
      if (result.success) {
        toast.success("Historique restauré", {
          description: "Les statistiques incluent maintenant tout l'historique.",
        })
        await checkResetDate()
      } else {
        toast.error("Erreur", { description: result.error })
      }
    } catch (error) {
      toast.error("Erreur lors de la restauration")
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return null
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-orange-600" />
          Réinitialiser les stats
        </CardTitle>
        <CardDescription>
          Mettez les compteurs des vendeurs à zéro pour une nouvelle période
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {resetDate ? (
            <div className="flex items-center gap-2 rounded-lg bg-white p-3">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Stats réinitialisées le</p>
                <p className="text-xs text-gray-600">
                  {new Date(resetDate).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              Aucune réinitialisation active. Toutes les données historiques sont comptabilisées.
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!resetDate ? (
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Réinitialiser maintenant
            </Button>
          ) : (
            <Button
              onClick={handleClearReset}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              Restaurer l'historique
            </Button>
          )}
        </div>

        <p className="text-xs text-gray-600">
          {resetDate
            ? "À partir de la réinitialisation, seules les commandes créées après cette date sont comptabilisées."
            : "Une réinitialisation met à zéro tous les compteurs et les redémarre à partir de maintenant."}
        </p>
      </CardContent>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser les stats ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr ? Cela va mettre à zéro tous les compteurs des vendeurs (confirmations, retours, CA). Seules les données après cette date seront comptabilisées. Cette action ne supprime pas les données, elle les archive simplement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={handleResetStats} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
            {loading ? "Réinitialisation..." : "Réinitialiser"}
          </AlertDialogAction>
          <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
