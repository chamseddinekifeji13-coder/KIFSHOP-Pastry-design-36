"use client"

import { useTenant } from "@/lib/tenant-context"
import { AlertTriangle, Clock, X } from "lucide-react"
import { useState } from "react"

export function SubscriptionBanner() {
  const { currentTenant, isSuspended, isTrialExpired, trialDaysLeft } = useTenant()
  const [dismissed, setDismissed] = useState(false)
  const sub = currentTenant.subscription

  // Don't show if active subscription or demo
  if (sub.status === "active" || currentTenant.id === "demo") return null
  if (dismissed && !isSuspended && !isTrialExpired) return null

  // Suspended - cannot dismiss
  if (isSuspended) {
    return (
      <div className="bg-destructive text-destructive-foreground px-4 py-3">
        <div className="flex items-center gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="font-medium">
            Votre compte a ete suspendu. Veuillez contacter l{"'"}administrateur pour reactiver votre abonnement.
          </p>
        </div>
      </div>
    )
  }

  // Trial expired - cannot dismiss
  if (isTrialExpired) {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 text-destructive px-4 py-3">
        <div className="flex items-center gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="font-medium">
            Votre periode d{"'"}essai est terminee. Veuillez contacter l{"'"}administrateur pour souscrire a un abonnement.
          </p>
        </div>
      </div>
    )
  }

  // Trial active - show days remaining
  if (sub.status === "trial" && trialDaysLeft > 0) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2.5 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 shrink-0" />
            <p>
              <span className="font-medium">Periode d{"'"}essai :</span>{" "}
              {trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""} restant{trialDaysLeft > 1 ? "s" : ""}
              {trialDaysLeft <= 3 && (
                <span className="ml-1 font-semibold text-amber-900 dark:text-amber-100">
                  - Pensez a souscrire un abonnement !
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return null
}
