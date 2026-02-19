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
import { Lock, Delete } from "lucide-react"

interface PinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  userInitials: string
  userRole: string
  expectedPin: string
  onSuccess: () => void
}

export function PinDialog({
  open,
  onOpenChange,
  userName,
  userInitials,
  userRole,
  expectedPin,
  onSuccess,
}: PinDialogProps) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPin("")
      setError(false)
      setShake(false)
      // Focus hidden input for keyboard support
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handlePinEntry = useCallback((digit: string) => {
    if (pin.length >= 4) return
    setError(false)

    const newPin = pin + digit
    setPin(newPin)

    if (newPin.length === 4) {
      // Verify PIN
      if (newPin === expectedPin) {
        // Success - small delay for visual feedback
        setTimeout(() => {
          onSuccess()
          onOpenChange(false)
        }, 200)
      } else {
        // Error - shake animation then reset
        setError(true)
        setShake(true)
        setTimeout(() => {
          setPin("")
          setShake(false)
        }, 600)
      }
    }
  }, [pin, expectedPin, onSuccess, onOpenChange])

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1))
    setError(false)
  }, [])

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        {error && (
          <p className="text-center text-sm text-destructive font-medium">
            Code PIN incorrect
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
                  disabled={pin.length === 0}
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
              >
                {digit}
              </Button>
            )
          })}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Acces securise par code PIN</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
