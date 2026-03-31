"use client"

import { useState, useEffect } from "react"
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
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

      if (profile.pin !== pin) {
        setError("Code PIN incorrect")
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

  if (isUnauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Acces refuse</h1>
            <p className="text-gray-600 mb-6">{unauthorizedMessage}</p>
            <Button
              onClick={() => {
                setIsUnauthorized(false)
                setPhone("")
                setPin("")
              }}
              className="w-full"
            >
              Essayer une autre connexion
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-amber-100 p-3">
              <Package className="w-8 h-8 text-amber-700" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            KIFSHOP
          </h1>
          <p className="text-center text-gray-600 mb-8">Espace Emballeur</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Numero de telephone
              </Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="21612345678"
                  disabled={isLoading}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pin" className="text-sm font-medium text-gray-700">
                Code PIN
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.slice(0, 4))}
                  placeholder="0000"
                  maxLength={4}
                  disabled={isLoading}
                  className="pl-10 text-center text-2xl tracking-widest"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !phone || pin.length < 4}
              className="w-full h-10 text-base font-medium bg-amber-600 hover:bg-amber-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Interface securisee - KIFSHOP Pastry 2026
          </p>
        </div>
      </div>
    </div>
  )
}
