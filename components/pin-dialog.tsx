"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Lock, Delete, Loader2, ShieldAlert, Timer } from "lucide-react"

interface PinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  userInitials: string
  userRole: string
  /** tenant_users.id — used for server-side PIN verification */
  tenantUserId: string
  onSuccess: () => void
}

export function PinDialog({
  open,
  onOpenChange,
  userName,
  userInitials,
  userRole,
  tenantUserId,
  onSuccess,
}: PinDialogProps) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Rate-limit state
  const [locked, setLocked] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const [alertTriggered, setAlertTriggered] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setLocked(false)
      if (countdownRef.current) clearInterval(countdownRef.current)
      return
    }
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setLocked(false)
          if (countdownRef.current) clearInterval(countdownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [countdown])

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPin("")
      setError(false)
      setShake(false)
      setVerifying(false)
      // Don't reset lockout state — it persists across open/close
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handlePinEntry = useCallback(
    (digit: string) => {
      if (pin.length >= 4 || verifying || locked) return
      setError(false)

      const newPin = pin + digit
      setPin(newPin)

      if (newPin.length === 4) {
        setVerifying(true)
        fetch("/api/verify-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantUserId, pin: newPin }),
        })
          .then(async (res) => {
            const data = await res.json().catch(() => ({}))

            if (res.ok) {
              // Success — reset everything
              setAttemptsLeft(null)
              setAlertTriggered(false)
              setTimeout(() => {
                onSuccess()
                onOpenChange(false)
              }, 200)
              return
            }

            // Handle rate-limit / lockout
            if (data.locked) {
              setLocked(true)
              setCountdown(data.remainingSeconds || 120)
            }
            if (typeof data.attemptsLeft === "number") {
              setAttemptsLeft(data.attemptsLeft)
            }
            if (data.alert) {
              setAlertTriggered(true)
            }

            // Shake animation
            setError(true)
            setShake(true)
            setTimeout(() => {
              setPin("")
              setShake(false)
            }, 600)
          })
          .catch(() => {
            setError(true)
            setShake(true)
            setTimeout(() => {
              setPin("")
              setShake(false)
            }, 600)
          })
          .finally(() => setVerifying(false))
      }
    },
    [pin, verifying, locked, tenantUserId, onSuccess, onOpenChange],
  )

  const handleDelete = useCallback(() => {
    if (verifying || locked) return
    setPin((prev) => prev.slice(0, -1))
    setError(false)
  }, [verifying, locked])

  // Handle keyboard input
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        handlePinEntry(e.key)
      } else if (e.key === "Backspace") {
        handleDelete()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, handlePinEntry, handleDelete])

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"]

  function formatCountdown(sec: number) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <Dialog open={open} onOpenChange={locked ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[340px] p-6">
        <DialogHeader className="items-center text-center">
          <Avatar className="h-16 w-16 mb-2">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <DialogTitle className="text-lg">{userName}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {userRole} - Entrez votre code PIN
          </DialogDescription>
        </DialogHeader>

        {/* Hidden input for accessibility */}
        <input
          ref={inputRef}
          type="password"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />

        {/* Alert banner — shown after 2 lockouts */}
        {alertTriggered && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Alerte de securite</p>
              <p className="text-destructive/80 text-xs mt-0.5">
                Plusieurs tentatives echouees ont ete detectees sur ce compte. Si ce
                n{"'"}est pas vous, veuillez contacter le proprietaire immediatement.
              </p>
            </div>
          </div>
        )}

        {/* Lockout banner */}
        {locked && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <Timer className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-amber-700 font-medium">
              Bloque pendant {formatCountdown(countdown)}
            </p>
          </div>
        )}

        {/* PIN dots */}
        <div className="flex justify-center gap-3 my-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`
                h-4 w-4 rounded-full border-2 transition-all duration-200
                ${shake ? "animate-shake" : ""}
                ${error ? "border-destructive bg-destructive" : ""}
                ${!error && pin.length > i ? "border-primary bg-primary" : ""}
                ${!error && pin.length <= i ? "border-muted-foreground/30 bg-transparent" : ""}
              `}
            />
          ))}
        </div>

        {error && !locked && (
          <p className="text-center text-sm text-destructive font-medium">
            Code PIN incorrect
            {attemptsLeft !== null && attemptsLeft > 0 && (
              <span className="block text-xs font-normal text-destructive/70 mt-0.5">
                {attemptsLeft} tentative{attemptsLeft > 1 ? "s" : ""} restante
                {attemptsLeft > 1 ? "s" : ""}
              </span>
            )}
          </p>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {digits.map((digit, i) => {
            if (digit === "") {
              return <div key={i} />
            }
            if (digit === "del") {
              return (
                <Button
                  key={i}
                  variant="ghost"
                  className="h-14 text-lg rounded-xl"
                  onClick={handleDelete}
                  disabled={pin.length === 0 || locked}
                >
                  <Delete className="h-5 w-5" />
                </Button>
              )
            }
            return (
              <Button
                key={i}
                variant="outline"
                className="h-14 text-xl font-semibold rounded-xl bg-transparent hover:bg-muted"
                onClick={() => handlePinEntry(digit)}
                disabled={locked}
              >
                {digit}
              </Button>
            )
          })}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
          {verifying ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Verification...</span>
            </>
          ) : (
            <>
              <Lock className="h-3 w-3" />
              <span>Acces securise par code PIN</span>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
