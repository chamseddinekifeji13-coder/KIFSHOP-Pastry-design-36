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
  Search,
  StickyNote,
  PackageCheck,
  Sparkles,
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
  const { currentTenant, currentUser } = useTenant()
  const {
    client,
    isLoading: clientLoading,
    error: clientError,
    isNewClient,
    isBlocked,
    hasExcessiveReturns,
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

      setTimeout(() => {
        handleClose()
      }, 1500)
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

  const getStatusBadge = () => {
    if (!client) return null
    const configs: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      vip: {
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        icon: <Crown className="h-3 w-3" />,
      },
      warning: {
        bg: "bg-amber-100",
        text: "text-amber-700",
        icon: <ShieldAlert className="h-3 w-3" />,
      },
      blacklisted: {
        bg: "bg-red-100",
        text: "text-red-700",
        icon: <Ban className="h-3 w-3" />,
      },
      normal: {
        bg: "bg-muted",
        text: "text-muted-foreground",
        icon: <User className="h-3 w-3" />,
      },
    }
    const c = configs[client.status] ?? configs.normal
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
        {c.icon}
        {statusLabel}
      </span>
    )
  }

  const getCardBorder = () => {
    switch (client?.status) {
      case "vip": return "border-emerald-300 bg-emerald-50/50"
      case "warning": return "border-amber-300 bg-amber-50/50"
      case "blacklisted": return "border-red-300 bg-red-50/50"
      default: return "border-border bg-card"
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[520px] p-0 gap-0 overflow-hidden rounded-xl border-border shadow-2xl"
        >
          {/* ── Header ── */}
          <div className="bg-primary px-6 pt-5 pb-4 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-primary-foreground/5" />
            <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-primary-foreground/5" />

            <DialogHeader className="relative z-10">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-primary-foreground flex items-center gap-3 text-lg">
                  <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary-foreground/15 backdrop-blur-sm">
                    <Zap className="h-5 w-5 text-primary-foreground" />
                  </div>
                  Commande Rapide
                </DialogTitle>
                <button
                  onClick={handleClose}
                  className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary-foreground/10 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fermer</span>
                </button>
              </div>
              <DialogDescription className="text-primary-foreground/60 mt-2 flex items-center justify-between text-xs">
                <span>Telephone = identite. Objectif 6 secondes.</span>
                <span className="inline-flex items-center gap-1.5 bg-primary-foreground/10 text-primary-foreground/90 text-[11px] font-medium px-2.5 py-1 rounded-full">
                  <User className="h-3 w-3" />
                  {currentUser.name}
                </span>
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* ── Success State ── */}
          {success ? (
            <div className="flex flex-col items-center justify-center py-14 px-8">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <div className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground mt-5">Commande confirmee !</p>
              <div className="mt-3 bg-muted/50 rounded-lg px-5 py-3 text-center">
                <p className="text-sm font-medium text-foreground">
                  {client?.name || client?.phone}
                </p>
                <p className="text-2xl font-bold text-primary mt-0.5 tabular-nums">
                  {parseFloat(amount).toFixed(3)} TND
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Confirmee par <span className="font-semibold text-foreground">{currentUser.name}</span>
              </p>
            </div>
          ) : (
            <>
              {/* ── Body ── */}
              <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">

                {/* SECTION: Telephone */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    Client
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        ref={phoneRef}
                        type="tel"
                        placeholder="Numero de telephone..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onKeyDown={handlePhoneKeyDown}
                        className="pl-9 h-11 text-base tabular-nums"
                        disabled={clientLoading}
                      />
                    </div>
                    <Button
                      onClick={handlePhoneLookup}
                      disabled={clientLoading || phone.replace(/\s/g, "").length < 4}
                      className="h-11 px-5 shrink-0"
                    >
                      {clientLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Chercher"
                      )}
                    </Button>
                  </div>
                  {clientError && (
                    <p className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {clientError}
                    </p>
                  )}
                </div>

                {/* SECTION: Client Card */}
                {client && (
                  <div className={`rounded-xl border-2 p-4 space-y-3 transition-all duration-200 ${getCardBorder()}`}>
                    {/* Client identity row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex items-center justify-center h-10 w-10 rounded-full shrink-0 ${
                          client.status === "vip" ? "bg-emerald-100" :
                          client.status === "warning" ? "bg-amber-100" :
                          client.status === "blacklisted" ? "bg-red-100" :
                          "bg-muted"
                        }`}>
                          {client.status === "vip" ? <Crown className="h-4 w-4 text-emerald-600" /> :
                           client.status === "warning" ? <ShieldAlert className="h-4 w-4 text-amber-600" /> :
                           client.status === "blacklisted" ? <Ban className="h-4 w-4 text-red-600" /> :
                           <User className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {client.name || "Client sans nom"}
                            {isNewClient && (
                              <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">
                                Nouveau
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums mt-0.5">{client.phone}</p>
                        </div>
                      </div>
                      {getStatusBadge()}
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-background rounded-lg px-3 py-2 text-center border border-border/50">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                          <Hash className="h-3 w-3" />
                          <span className="text-[10px] font-medium uppercase">Commandes</span>
                        </div>
                        <p className="text-sm font-bold text-foreground tabular-nums">{client.total_orders}</p>
                      </div>
                      <div className="bg-background rounded-lg px-3 py-2 text-center border border-border/50">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-[10px] font-medium uppercase">Total</span>
                        </div>
                        <p className="text-sm font-bold text-foreground tabular-nums">{client.total_spent.toFixed(0)}</p>
                      </div>
                      <div className="bg-background rounded-lg px-3 py-2 text-center border border-border/50">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                          <RotateCcw className="h-3 w-3" />
                          <span className="text-[10px] font-medium uppercase">Retours</span>
                        </div>
                        <p className={`text-sm font-bold tabular-nums ${client.return_count >= 2 ? "text-red-600" : "text-foreground"}`}>
                          {client.return_count}
                        </p>
                      </div>
                    </div>

                    {/* Blocked Alert */}
                    {isBlocked && (
                      <div className="flex items-center gap-3 bg-red-100 border border-red-200 rounded-lg px-3.5 py-3">
                        <Ban className="h-5 w-5 text-red-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-red-700">Client blackliste</p>
                          <p className="text-[11px] text-red-600 mt-0.5">Commande impossible pour ce client.</p>
                        </div>
                      </div>
                    )}

                    {/* Excessive Returns Alert */}
                    {hasExcessiveReturns && !isBlocked && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 bg-amber-100 border border-amber-200 rounded-lg px-3.5 py-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-amber-700">{client.return_count} retours enregistres</p>
                            <p className="text-[11px] text-amber-600 mt-0.5">Commande bloquee automatiquement.</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-9 border-amber-300 text-amber-700 hover:bg-amber-50"
                          onClick={() => setShowResetConfirm(true)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1.5" />
                          Remettre a zero les retours
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION: Order Form */}
                {client && !isBlocked && !hasExcessiveReturns && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Commande
                    </div>

                    {/* Amount - big input */}
                    <div className="space-y-2">
                      <Label htmlFor="quick-amount" className="text-sm font-medium">
                        Montant (TND) <span className="text-destructive">*</span>
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
                        className="h-14 text-2xl font-bold tabular-nums text-center border-2 border-primary/20 focus:border-primary"
                      />
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                      <Label htmlFor="quick-items" className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <PackageCheck className="h-3.5 w-3.5" />
                        Articles (optionnel)
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
                      <Label htmlFor="quick-notes" className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <StickyNote className="h-3.5 w-3.5" />
                        Notes (optionnel)
                      </Label>
                      <Textarea
                        id="quick-notes"
                        placeholder="Instructions speciales, allergies, details..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="resize-none h-16"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="border-t bg-muted/30 px-6 py-4 flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 h-11"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 h-11 font-semibold text-sm"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <PackageCheck className="h-4 w-4 mr-2" />
                  )}
                  Creer la commande
                </Button>
              </div>
            </>
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
