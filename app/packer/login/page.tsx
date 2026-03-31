"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Package, Phone, AlertCircle, Loader2, Delete } from "lucide-react"

export default function PackerLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUnauthorized, setIsUnauthorized] = useState(false)
  const [unauthorizedMessage, setUnauthorizedMessage] = useState("")
  const [step, setStep] = useState<"phone" | "pin">("phone")

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

  // Handle numeric keypad input for PIN
  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit
      setPin(newPin)
      if (newPin.length === 4) {
        // Auto-submit when 4 digits entered
        setTimeout(() => handleLogin(newPin), 100)
      }
    }
  }

  const handlePinDelete = () => {
    setPin(pin.slice(0, -1))
  }

  const handleLogin = async (inputPin?: string) => {
    const pinToUse = inputPin || pin
    setError("")
    setIsLoading(true)

    try {
      const supabase = createClient()

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

      if (profile.pin !== pinToUse) {
        setError("Code PIN incorrect")
        setPin("")
        setIsLoading(false)
        return
      }

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

      const session = {
        id: profile.id,
        name: profile.display_name,
        role: profile.role,
        tenantId: profile.tenant_id,
      }

      localStorage.setItem("packer_session", JSON.stringify(session))
      router.push("/packer/dashboard")
    } catch (err) {
      setError("Erreur de connexion. Veuillez reessayer.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Unauthorized screen
  if (isUnauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Acces refuse</h1>
            <p className="text-gray-600 mb-6 text-sm">{unauthorizedMessage}</p>
            <button
              onClick={() => {
                setIsUnauthorized(false)
                setPhone("")
                setPin("")
                setStep("phone")
              }}
              className="w-full py-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl transition touch-manipulation"
            >
              Reessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Phone input step
  if (step === "phone") {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-white">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-600 mb-4">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">KIFSHOP</h1>
            <p className="text-gray-600">Espace Emballeur</p>
          </div>

          {/* Phone input card */}
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numero de telephone
            </label>
            <div className="relative mb-4">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="21612345678"
                className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-0 outline-none transition"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              onClick={() => {
                if (phone.length >= 8) {
                  setError("")
                  setStep("pin")
                } else {
                  setError("Entrez un numero valide")
                }
              }}
              disabled={phone.length < 8}
              className="w-full py-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-gray-300 text-white font-bold rounded-xl transition touch-manipulation"
            >
              Continuer
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 pb-6">
          Interface securisee - KIFSHOP 2026
        </p>
      </div>
    )
  }

  // PIN input step with numeric keypad
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-white">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-600 mb-3">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Entrez votre PIN</h1>
          <p className="text-gray-600 text-sm">{phone}</p>
          <button 
            onClick={() => { setStep("phone"); setPin(""); setError(""); }}
            className="text-amber-600 text-sm mt-1 underline"
          >
            Changer
          </button>
        </div>

        {/* PIN dots display */}
        <div className="flex gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                pin.length > i 
                  ? "bg-amber-600 scale-110" 
                  : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 mb-4 max-w-xs">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 mb-4 text-amber-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Connexion...</span>
          </div>
        )}

        {/* Numeric keypad */}
        <div className="w-full max-w-xs">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                onClick={() => handlePinInput(String(digit))}
                disabled={isLoading}
                className="h-16 text-2xl font-semibold bg-white rounded-xl border-2 border-gray-200 hover:bg-gray-50 active:bg-amber-100 active:border-amber-400 transition touch-manipulation disabled:opacity-50"
              >
                {digit}
              </button>
            ))}
            <div /> {/* Empty space */}
            <button
              onClick={() => handlePinInput("0")}
              disabled={isLoading}
              className="h-16 text-2xl font-semibold bg-white rounded-xl border-2 border-gray-200 hover:bg-gray-50 active:bg-amber-100 active:border-amber-400 transition touch-manipulation disabled:opacity-50"
            >
              0
            </button>
            <button
              onClick={handlePinDelete}
              disabled={isLoading || pin.length === 0}
              className="h-16 flex items-center justify-center bg-white rounded-xl border-2 border-gray-200 hover:bg-gray-50 active:bg-red-100 active:border-red-400 transition touch-manipulation disabled:opacity-30"
            >
              <Delete className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 pb-6">
        Interface securisee - KIFSHOP 2026
      </p>
    </div>
  )
}
