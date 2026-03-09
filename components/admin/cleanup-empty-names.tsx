"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { AlertTriangle, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function CleanupEmptyNames() {
  const [isLoading, setIsLoading] = useState(false)

  const handleCleanup = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/cleanup-empty-names", {
        method: "POST",
      })
      
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Erreur lors du nettoyage")
        return
      }

      toast.success(`Nettoyage complété !`, {
        description: `
          Matières premières supprimées: ${data.deleted.raw_materials}
          Produits finis supprimés: ${data.deleted.finished_products}
          Emballages supprimés: ${data.deleted.packaging}
        `.trim()
      })
    } catch (error) {
      toast.error("Erreur lors du nettoyage")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Nettoyer les enregistrements vides
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            Confirmer le nettoyage
          </AlertDialogTitle>
          <AlertDialogDescription>
            Cette action supprimera définitivement tous les enregistrements avec des noms vides dans :
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Matières premières</li>
              <li>Produits finis</li>
              <li>Emballages</li>
            </ul>
            <p className="mt-3 font-semibold text-foreground">Cette action est irréversible.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCleanup}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Nettoyage en cours...
              </>
            ) : (
              "Supprimer les enregistrements vides"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
