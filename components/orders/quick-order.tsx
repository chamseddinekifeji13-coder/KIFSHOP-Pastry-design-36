"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Phone,
  Loader2,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  X,
  Crown,
  ShieldAlert,
  Ban,
  User,
  Hash,
  TrendingUp,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTenant } from "@/lib/tenant-context"
import { useClientStatus } from "@/hooks/use-client-status"
import { toast } from "sonner"

interface QuickOrderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderCreated?: () => void
}

export function QuickOrder({ open, onOpenChange, onOrderCreated }: QuickOrderProps) {
  const { currentTenant } = useTenant()
  const {
    client,
    isLoading: clientLoading,
    error: clientError,
    isNewClient,
    isBlocked,
    hasExcessiveReturns,
    statusColor,
    statusLabel,
    lookupClient,
    resetReturns,
    clearClient,
  } = useClientStatus()

  const [phone, setPhone] = useState("")
  const [amount, setAmount] = useState("")
  const [itemsDescription, setItemsDescription] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const phoneRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  // Auto-focus phone input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => phoneRef.current?.focus(), 100)
    }
  }, [open])

  // Auto-focus amount after client is loaded
  useEffect(() => {
    if (client && !isBlocked && !hasExcessiveReturns) {
      setTimeout(() => amountRef.current?.focus(), 50)
    }
  }, [client, isBlocked, hasExcessiveReturns])

  const handlePhoneLookup = useCallback(async () => {
    const cleanPhone = phone.replace(/\s/g, "").trim()
    if (cleanPhone.length < 4) return
    if (currentTenant.id === "__fallback__") return
    await lookupClient(cleanPhone, currentTenant.id)
  }, [phone, currentTenant.id, lookupClient])

  const handlePhoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handlePhoneLookup()
    }
  }

  const handleSubmit = async () => {
    if (!client || isBlocked || hasExcessiveReturns || submitting) return
    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Montant invalide")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/quick-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          phone: client.phone,
          clientName: client.name,
          amount: numericAmount,
          itemsDescription: itemsDescription.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur creation commande")
      }

      setSuccess(true)
      toast.success("Commande enregistree !")
      onOrderCreated?.()

      // Auto-close after success
      setTimeout(() => {
        handleClose()
      }, 1200)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur creation commande")
    } finally {
      setSubmitting(false)
    }
  }

  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleClose = () => {
    setPhone("")
    setAmount("")
    setItemsDescription("")
    setNotes("")
    setSuccess(false)
    clearClient()
    onOpenChange(false)
  }

  const handleResetReturns = async () => {
    if (!client) return
    await resetReturns(client.id)
    setShowResetConfirm(false)
    toast.success("Compteur de retours remis a zero")
  }

  const canSubmit = client && !isBlocked && !hasExcessiveReturns && !submitting && parseFloat(amount) > 0

  const getStatusIcon = () => {
    switch (client?.status) {
      case "vip":
        return <Crown className="h-4 w-4 text-emerald-600" />
      case "warning":
        return <ShieldAlert className="h-4 w-4 text-amber-500" />
      case "blacklisted":
        return <Ban className="h-4 w-4 text-red-500" />
      default:
        return <User className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBg = () => {
    switch (client?.status) {
      case "vip":
        return "bg-emerald-50 border-emerald-200"
      case "warning":
        return "bg-amber-50 border-amber-200"
      case "blacklisted":
        return "bg-red-50 border-red-200"
      default:
        return "bg-muted/40 border-border"
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden border-border shadow-lg rounded-xl">
          {/* Header */}
          <div className="bg-primary px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-primary-foreground flex items-center gap-2.5 text-lg">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary-foreground/15">
                  <Zap className="h-4.5 w-4.5 text-primary-foreground" />
                </div>
                Commande Rapide
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/70 mt-1">
                Telephone = identite client. 6 secondes max.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Success State */}
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold text-foreground">Commande enregistree !</p>
              <p className="text-sm text-muted-foreground mt-1">
                {client?.name || client?.phone} &mdash; {parseFloat(amount).toFixed(3)} TND
              </p>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-5">
              {/* Phone Input */}
              <div className="space-y-2">
                <Label htmlFor="quick-phone" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Numero de telephone
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="quick-phone"
                    ref={phoneRef}
                    type="tel"
                    placeholder="Ex: 50123456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={handlePhoneKeyDown}
                    className="flex-1 h-11 text-base tabular-nums"
                    disabled={clientLoading}
                  />
                  <Button
                    onClick={handlePhoneLookup}
                    disabled={clientLoading || phone.replace(/\s/g, "").length < 4}
                    className="h-11 px-5"
                  >
                    {clientLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Chercher"
                    )}
                  </Button>
                </div>
                {clientError && (
                  <p className="text-xs text-destructive flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    {clientError}
                  </p>
                )}
              </div>

              {/* Client Info Card */}
              {client && (
                <div className={`rounded-lg border p-4 space-y-3 transition-all ${getStatusBg()}`}>
                  {/* Client Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {getStatusIcon()}
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {client.name || "Client sans nom"}
                          {isNewClient && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                              Nouveau
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">{client.phone}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      client.status === "vip"
                        ? "bg-emerald-100 text-emerald-700"
                        : client.status === "warning"
                          ? "bg-amber-100 text-amber-700"
                          : client.status === "blacklisted"
                            ? "bg-red-100 text-red-700"
                            : "bg-muted text-muted-foreground"
                    }`}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* Client Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Cmd:</span>
                      <span className="font-semibold text-foreground">{client.total_orders}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <TrendingUp className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-semibold text-foreground">{client.total_spent.toFixed(3)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <RotateCcw className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Retours:</span>
                      <span className={`font-semibold ${client.return_count >= 2 ? "text-red-600" : "text-foreground"}`}>
                        {client.return_count}
                      </span>
                    </div>
                  </div>

                  {/* Blocked Alert */}
                  {isBlocked && (
                    <div className="flex items-center gap-2.5 bg-red-100 border border-red-200 rounded-lg px-3 py-2.5">
                      <Ban className="h-4 w-4 text-red-600 shrink-0" />
                      <p className="text-xs font-medium text-red-700">
                        Client blackliste. Commande impossible.
                      </p>
                    </div>
                  )}

                  {/* Excessive Returns Alert */}
                  {hasExcessiveReturns && !isBlocked && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 bg-amber-100 border border-amber-200 rounded-lg px-3 py-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <p className="text-xs font-medium text-amber-700">
                          {client.return_count} retours enregistres. Commande bloquee.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={() => setShowResetConfirm(true)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1.5" />
                        Remettre a zero les retours
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Order Form - only if client is valid */}
              {client && !isBlocked && !hasExcessiveReturns && (
                <div className="space-y-4">
                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="quick-amount" className="text-sm font-medium flex items-center gap-2">
                      <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                      Montant (TND)
                    </Label>
                    <Input
                      id="quick-amount"
                      ref={amountRef}
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0.000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onKeyDown={handleAmountKeyDown}
                      className="h-12 text-xl font-semibold tabular-nums text-center"
                    />
                  </div>

                  {/* Items description */}
                  <div className="space-y-2">
                    <Label htmlFor="quick-items" className="text-sm font-medium text-muted-foreground">
                      Description articles (optionnel)
                    </Label>
                    <Input
                      id="quick-items"
                      placeholder="Ex: 2x Croissant, 1x Tarte"
                      value={itemsDescription}
                      onChange={(e) => setItemsDescription(e.target.value)}
                      className="h-10"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="quick-notes" className="text-sm font-medium text-muted-foreground">
                      Notes (optionnel)
                    </Label>
                    <Textarea
                      id="quick-notes"
                      placeholder="Remarques..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="resize-none h-16"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          {!success && (
            <div className="border-t bg-muted/30 px-6 py-4 flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-10"
              >
                <X className="h-4 w-4 mr-1.5" />
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1 h-10"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <ShoppingBag className="h-4 w-4 mr-1.5" />
                )}
                Confirmer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Returns Confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remettre les retours a zero ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compteur de retours de ce client sera remis a 0 et la commande sera debloquee.
              Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetReturns}>
              Confirmer la remise a zero
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
