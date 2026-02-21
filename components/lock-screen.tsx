"use client"

import { useState } from "react"
import { Lock, LogOut, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useTenant, ROLE_LABELS, type AppUser } from "@/lib/tenant-context"

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { users, currentTenant, setCurrentUser, signOut } = useTenant()
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [shake, setShake] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Server-side PIN verification via API route
  async function verifyPinOnServer(user: AppUser, pinCode?: string) {
    setVerifying(true)
    setError("")
    try {
      const res = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantUserId: user.dbId, pin: pinCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erreur de verification")
        setShake(true)
        setTimeout(() => { setPin(""); setShake(false) }, 600)
        return false
      }
      // Server verified -- update client state
      setCurrentUser(user)
      return true
    } catch {
      setError("Erreur de connexion")
      return false
    } finally {
      setVerifying(false)
    }
  }

  async function handleSelectUser(user: AppUser) {
    // User without PIN = verify on server without PIN
    if (!user.pin) {
      const ok = await verifyPinOnServer(user)
      if (ok) onUnlock()
      return
    }
    setSelectedUser(user)
    setPin("")
    setError("")
  }

  async function handlePinInput(digit: string) {
    if (pin.length >= 4 || verifying) return
    const newPin = pin + digit
    setPin(newPin)

    if (newPin.length === 4) {
      // Verify PIN on server (not client-side comparison)
      const ok = await verifyPinOnServer(selectedUser!, newPin)
      if (ok) onUnlock()
    }
  }

  function handleBackspace() {
    setPin((prev) => prev.slice(0, -1))
    setError("")
  }

  // PIN entry screen
  if (selectedUser) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f5f0e8]">
        <div className="flex w-full max-w-sm flex-col items-center gap-6 p-6">
          {/* Back button */}
          <Button
            variant="ghost"
            className="absolute top-4 left-4 text-muted-foreground"
            onClick={() => setSelectedUser(null)}
          >
            Retour
          </Button>

          {/* Tenant name */}
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
              style={{ backgroundColor: currentTenant.primaryColor }}
            >
              {currentTenant.logo}
            </div>
            <span className="text-lg font-semibold text-foreground">{currentTenant.name}</span>
          </div>

          {/* User avatar */}
          <Avatar className="h-20 w-20">
            <AvatarFallback
              className="text-2xl font-bold text-white"
              style={{ backgroundColor: currentTenant.primaryColor }}
            >
              {selectedUser.initials}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">{selectedUser.name}</h2>
            <p className="text-sm text-muted-foreground">{ROLE_LABELS[selectedUser.role]}</p>
          </div>

          {/* PIN dots */}
          <div className={`flex gap-3 ${shake ? "animate-shake" : ""}`}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
                  i < pin.length
                    ? error
                      ? "border-destructive bg-destructive"
                      : "border-primary bg-primary"
                    : "border-muted-foreground/30 bg-transparent"
                }`}
              />
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {!error && <p className="text-sm text-muted-foreground">Entrez votre code PIN</p>}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-14 w-14 rounded-full text-xl font-medium bg-white/80 hover:bg-white border-border/50"
                onClick={() => handlePinInput(String(num))}
              >
                {num}
              </Button>
            ))}
            <div />
            <Button
              variant="outline"
              className="h-14 w-14 rounded-full text-xl font-medium bg-white/80 hover:bg-white border-border/50"
              onClick={() => handlePinInput("0")}
            >
              0
            </Button>
            <Button
              variant="ghost"
              className="h-14 w-14 rounded-full text-sm"
              onClick={handleBackspace}
              disabled={pin.length === 0}
            >
              Eff.
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // User selection screen
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f5f0e8]">
      <div className="flex w-full max-w-md flex-col items-center gap-8 p-6">
        {/* Tenant header */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg"
            style={{ backgroundColor: currentTenant.primaryColor }}
          >
            {currentTenant.logo}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{currentTenant.name}</h1>
          <p className="text-sm text-muted-foreground">Selectionnez votre profil pour continuer</p>
        </div>

        {/* User grid */}
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-white/80 p-4 transition-all hover:bg-white hover:shadow-md hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <Avatar className="h-14 w-14">
                <AvatarFallback
                  className="text-lg font-bold text-white"
                  style={{ backgroundColor: currentTenant.primaryColor }}
                >
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground leading-tight">{user.name}</p>
                <p className="text-[11px] text-muted-foreground">{ROLE_LABELS[user.role]}</p>
              </div>
              {user.pin && <Lock className="h-3 w-3 text-muted-foreground/50" />}
            </button>
          ))}
        </div>

        {/* Sign out */}
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Deconnexion
        </Button>
      </div>
    </div>
  )
}
