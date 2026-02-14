"use client"

import { ShieldAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useTenant, getDefaultRoute, ROLE_LABELS } from "@/lib/tenant-context"

export function AccessDenied() {
  const router = useRouter()
  const { currentRole } = useTenant()
  const defaultRoute = getDefaultRoute(currentRole)

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Acces refuse
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Votre profil <span className="font-medium text-foreground">{ROLE_LABELS[currentRole]}</span> n{"'"}a pas acces a cette page.
          Contactez votre gerant si vous pensez qu{"'"}il s{"'"}agit d{"'"}une erreur.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => router.push(defaultRoute)}
        className="mt-2 bg-transparent"
      >
        Retour a ma page d{"'"}accueil
      </Button>
    </div>
  )
}
