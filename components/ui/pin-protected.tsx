"use client"

import { useState, ReactNode } from "react"
import { Lock, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useTenant } from "@/lib/tenant-context"

interface PinProtectedProps {
  children: ReactNode
  title?: string
  description?: string
  requiredRole?: string
}

export function PinProtected({ 
  children, 
  title = "Acces restreint",
  description = "Cette section est reservee aux gerants et proprietaires",
  requiredRole = "gerant"
}: PinProtectedProps) {
  const { currentTenant } = useTenant()
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleNumpad = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num
      setPin(newPin)
      setError(false)
      
      if (newPin.length === 4) {
        verifyPin(newPin)
      }
    }
  }

  const verifyPin = async (enteredPin: string) => {
    if (!currentTenant?.id) {
      setError(true)
      setErrorMessage("Tenant non trouve")
      return
    }

    setLoading(true)
    try {
      // Use the new API that verifies PIN against all managers/owners in the tenant
      const res = await fetch("/api/treasury/verify-manager-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tenantId: currentTenant.id,
          pin: enteredPin,
          requiredRole
        })
      })
      
      if (res.ok) {
        setPin("")
        setPinDialogOpen(false)
        setIsUnlocked(true)
        setError(false)
        setErrorMessage("")
      } else {
        const data = await res.json()
        setError(true)
        setErrorMessage(data.error || "Code PIN incorrect")
        setPin("")
      }
    } catch {
      setError(true)
      setErrorMessage("Erreur de verification")
      setPin("")
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setPin("")
    setError(false)
  }

  const handleBackspace = () => {
    setPin(pin.slice(0, -1))
    setError(false)
  }

  if (isUnlocked) {
    return <>{children}</>
  }

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
            {description}
          </p>
          <Button onClick={() => setPinDialogOpen(true)} size="lg">
            <ShieldAlert className="h-5 w-5 mr-2" />
            Deverrouiller avec PIN
          </Button>
        </CardContent>
      </Card>

      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Verification requise
            </DialogTitle>
            <DialogDescription>
              Entrez votre code PIN gerant ou proprietaire
            </DialogDescription>
          </DialogHeader>

          {/* PIN Display */}
          <div className="flex justify-center gap-3 py-6">
            {[0, 1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                  error 
                    ? "border-destructive bg-destructive/10 animate-shake" 
                    : pin.length > i 
                      ? "border-primary bg-primary/10" 
                      : "border-border"
                }`}
              >
                {pin.length > i ? "●" : ""}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-center text-sm text-destructive font-medium">
              {errorMessage || "Code PIN incorrect"}
            </p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "←"].map(key => (
              <Button
                key={key}
                variant={key === "C" ? "destructive" : key === "←" ? "secondary" : "outline"}
                className="h-14 text-xl font-bold"
                disabled={loading}
                onClick={() => {
                  if (key === "C") handleClear()
                  else if (key === "←") handleBackspace()
                  else handleNumpad(key)
                }}
              >
                {key}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
