"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Package, Phone, Lock, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function PackerLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUnauthorized, setIsUnauthorized] = useState(false)
  const [unauthorizedMessage, setUnauthorizedMessage] = useState("")

  // Check if already logged in via localStorage session
  useEffect(() => {
    const stored = localStorage.getItem("packer_session")
    if (stored) {
      try {
        JSON.parse(stored)
        router.push("/packer/dashboard")
      } catch {
        localStorage.removeItem("packer_session")
      }
    }
  }, [router])

  const handleLogin = useCallback(async () => {
    if (!phone || !pin) {
      setError("Veuillez entrer votre telephone et code PIN")
      return
    }

    setIsLoading(true)
    setError("")
    setIsUnauthorized(false)

    try {
      const supabase = createClient()

      // Find user by phone number in tenant_users
      const { data: profile, error: profileError } = await supabase
        .from("tenant_users")
        .select("id, display_name, role, is_active, pin, tenant_id")
        .eq("phone", phone.replace(/\s/g, ""))
        .single()

      if (profileError || !profile) {
        setError("Numero de telephone non trouve")
        setIsLoading(false)
        return
      }

      // Verify PIN
      if (profile.pin !== pin) {
        setError("Code PIN incorrect")
        setIsLoading(false)
        return
      }

      // Check authorization - role must be 'packer' or 'emballeur'
      const validPackerRoles = ["packer", "emballeur"]
      if (!validPackerRoles.includes(profile.role)) {
        setIsUnauthorized(true)
        setUnauthorizedMessage("Votre compte n'est pas configure comme emballeur.")
        setIsLoading(false)
        return
      }

      if (!profile.is_active) {
        setIsUnauthorized(true)
        setUnauthorizedMessage("Votre compte est desactive.")
        setIsLoading(false)
        return
      }

      // Store packer session in localStorage (simple approach for packer interface)
      localStorage.setItem("packer_session", JSON.stringify({
        id: profile.id,
        name: profile.display_name,
        phone: phone,
        tenant_id: profile.tenant_id,
        logged_in_at: new Date().toISOString()
      }))

      router.push("/packer/dashboard")
    } catch (err) {
      console.error("Login error:", err)
      setError("Erreur de connexion. Veuillez reessayer.")
      setIsLoading(false)
    }
  }, [phone, pin, router])

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit)
    }
  }

  const handlePinDelete = () => {
    setPin(prev => prev.slice(0, -1))
  }

  // Submit when PIN is complete
  useEffect(() => {
    if (pin.length === 4 && phone.length >= 8) {
      handleLogin()
    }
  }, [pin, phone, handleLogin])

  // Unauthorized screen
  if (isUnauthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Acces non autorise</h1>
            <p className="text-muted-foreground">{unauthorizedMessage}</p>
          </div>

          <div className="bg-card rounded-xl p-4 border">
            <p className="text-sm text-muted-foreground">
              Contactez le gerant pour obtenir l&apos;acces a l&apos;interface emballeur.
            </p>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-12"
            onClick={() => {
              setIsUnauthorized(false)
              setPin("")
            }}
          >
            Retour
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <div className="flex-none p-6 text-center">
        <div className="inline-flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold text-foreground">KIFSHOP</h1>
            <p className="text-sm text-muted-foreground">Espace Emballeur</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Phone input */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Numero de telephone
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-14 pl-11 text-lg"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* PIN display */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Code PIN
            </Label>
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                    pin.length > i 
                      ? "border-primary bg-primary/10 text-primary" 
                      : "border-muted bg-muted/30"
                  } ${error ? "animate-shake border-destructive" : ""}`}
                >
                  {pin.length > i ? "●" : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm justify-center">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-16 text-2xl font-semibold numpad-btn"
                onClick={() => handlePinInput(num.toString())}
                disabled={isLoading || pin.length >= 4}
              >
                {num}
              </Button>
            ))}
            <div /> {/* Empty cell */}
            <Button
              variant="outline"
              className="h-16 text-2xl font-semibold numpad-btn"
              onClick={() => handlePinInput("0")}
              disabled={isLoading || pin.length >= 4}
            >
              0
            </Button>
            <Button
              variant="outline"
              className="h-16 text-base font-medium numpad-btn"
              onClick={handlePinDelete}
              disabled={isLoading || pin.length === 0}
            >
              Eff.
            </Button>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Verification...</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-none p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Interface reservee aux emballeurs autorises
        </p>
      </div>
    </div>
  )
}
