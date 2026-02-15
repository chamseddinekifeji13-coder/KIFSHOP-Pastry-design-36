"use client"

import { useTenant } from "@/lib/tenant-context"

export function useSubscription() {
  const { currentTenant, isSuspended, isTrialExpired, trialDaysLeft } = useTenant()
  const sub = currentTenant.subscription

  const isBlocked = isSuspended || isTrialExpired

  const canAddSalesChannel = (currentCount: number) => {
    if (sub.status === "active" || sub.status === "trial") {
      return currentCount < sub.maxSalesChannels
    }
    return false
  }

  const canAddWarehouse = (currentCount: number) => {
    if (sub.status === "active" || sub.status === "trial") {
      return currentCount < sub.maxWarehouses
    }
    return false
  }

  const canAddUser = (currentCount: number) => {
    if (sub.status === "active" || sub.status === "trial") {
      return currentCount < sub.maxUsers
    }
    return false
  }

  const getLimitMessage = (type: "sales_channel" | "warehouse" | "user") => {
    const limits: Record<string, { max: number; label: string }> = {
      sales_channel: { max: sub.maxSalesChannels, label: "points de vente" },
      warehouse: { max: sub.maxWarehouses, label: "depots" },
      user: { max: sub.maxUsers, label: "utilisateurs" },
    }
    const l = limits[type]
    return `Vous avez atteint la limite de ${l.max} ${l.label} pour votre abonnement${sub.plan ? ` ${sub.plan}` : ""}. Passez a un abonnement superieur pour en ajouter plus.`
  }

  return {
    subscription: sub,
    isBlocked,
    isSuspended,
    isTrialExpired,
    trialDaysLeft,
    canAddSalesChannel,
    canAddWarehouse,
    canAddUser,
    getLimitMessage,
  }
}
