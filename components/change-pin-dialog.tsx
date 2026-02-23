"use client"

import { useState } from "react"
import { KeyRound, Loader2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { updateOwnPin } from "@/lib/employees/actions"
import { useTenant } from "@/lib/tenant-context"

interface ChangePinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When true the dialog cannot be dismissed (owner must set a PIN) */
  force?: boolean
}

export function ChangePinDialog({ open, onOpenChange, force = false }: ChangePinDialogProps) {
  const { currentUser, updateUser } = useTenant()
  const hasExistingPin = !!currentUser.pin

  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function resetForm() {
    setCurrentPin("")
    setNewPin("")
    setConfirmPin("")
    setError("")
    setShowCurrent(false)
    setShowNew(false)
  }

  function handleClose(val: boolean) {
    // In force mode, prevent closing until PIN is set
    if (force && !val) return
    if (!val) resetForm()
    onOpenChange(val)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // Validate (skip current PIN check in force mode — owner has no PIN yet)
    if (!force && hasExistingPin && !currentPin) {
      setError("Veuillez entrer votre PIN actuel")
      return
    }
    if (!/^\d{4}$/.test(newPin)) {
      setError("Le nouveau PIN doit contenir exactement 4 chiffres")
      return
    }
    if (newPin !== confirmPin) {
      setError("Les deux PIN ne correspondent pas")
      return
    }
    if (hasExistingPin && currentPin === newPin) {
      setError("Le nouveau PIN doit etre different de l'actuel")
      return
    }

    setSaving(true)
    try {
      const result = await updateOwnPin({
        currentPin: !force && hasExistingPin ? currentPin : undefined,
        newPin,
        isFirstTime: force || !hasExistingPin,
      })

      if (!result.success) {
        setError(result.error || "Erreur lors de la modification du PIN")
        return
      }

      // Update local state so the UI reflects the change
      updateUser(currentUser.id, { pin: newPin })
      toast.success("Code PIN modifie avec succes")
      resetForm()
      // Close directly — bypass handleClose guard since we know PIN was just set
      onOpenChange(false)
    } catch {
      setError("Erreur de connexion au serveur")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-sm"
        {...(force ? { onPointerDownOutside: (e: Event) => e.preventDefault(), onEscapeKeyDown: (e: Event) => e.preventDefault() } : {})}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {force
              ? "Code PIN requis"
              : hasExistingPin
                ? "Modifier mon code PIN"
                : "Definir un code PIN"}
          </DialogTitle>
          <DialogDescription>
            {force
              ? "En tant que proprietaire, vous devez definir un code PIN a 4 chiffres pour securiser votre compte."
              : hasExistingPin
                ? "Entrez votre PIN actuel puis choisissez un nouveau code a 4 chiffres."
                : "Choisissez un code PIN a 4 chiffres pour securiser votre profil."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Current PIN (only if one exists and not in force mode) */}
          {!force && hasExistingPin && (
            <div className="space-y-1.5">
              <Label htmlFor="current-pin">PIN actuel</Label>
              <div className="relative">
                <Input
                  id="current-pin"
                  type={showCurrent ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d{4}"
                  placeholder="----"
                  value={currentPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 4)
                    setCurrentPin(val)
                  }}
                  className="h-11 text-center text-lg tracking-[0.5em] font-mono pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* New PIN */}
          <div className="space-y-1.5">
            <Label htmlFor="new-pin">Nouveau PIN</Label>
            <div className="relative">
              <Input
                id="new-pin"
                type={showNew ? "text" : "password"}
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                placeholder="----"
                value={newPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4)
                  setNewPin(val)
                }}
                className="h-11 text-center text-lg tracking-[0.5em] font-mono pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Confirm PIN */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pin">Confirmer le nouveau PIN</Label>
            <Input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              placeholder="----"
              value={confirmPin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 4)
                setConfirmPin(val)
              }}
              className="h-11 text-center text-lg tracking-[0.5em] font-mono"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={saving}
            className="w-full h-11 gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Modification...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                {hasExistingPin ? "Modifier le PIN" : "Definir le PIN"}
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
