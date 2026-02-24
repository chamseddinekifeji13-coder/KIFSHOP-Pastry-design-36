"use client"

import { useState, useEffect, useRef } from "react"
import { Lock, LogOut, ShieldAlert, Timer } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useTenant, ROLE_LABELS, type AppUser } from "@/lib/tenant-context"

function formatCountdown(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { users, currentTenant, setCurrentUser, signOut } = useTenant()
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [shake, setShake] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Rate-limit state
  const [locked, setLocked] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const [alertTriggered, setAlertTriggered] = useState(false)

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
        // Handle rate-limit / lockout
        if (data.locked) {
          setLocked(true)
          setCountdown(data.remainingSeconds || 120)
          setError("")
        } else {
          setError(data.error || "Erreur de verification")
        }

        if (typeof data.attemptsLeft === "number") {
          setAttemptsLeft(data.attemptsLeft)
        }
        if (data.alert) {
          setAlertTriggered(true)
        }

        setShake(true)
        setTimeout(() => {
          setPin("")
          setShake(false)
        }, 600)
        return false
      }

      // Server verified -- reset and update client state
      setAttemptsLeft(null)
      setAlertTriggered(false)

      // Use the server-verified profile data to build the correct AppUser
      // This ensures we set the exact profile the server authenticated
      if (data.profile) {
        const verifiedUser: AppUser = {
          id: data.profile.dbId || user.id,
          name: data.profile.name || user.name,
          role: data.profile.role || user.role,
          initials: user.initials,
          email: user.email,
          dbId: data.profile.dbId || user.dbId,
          pin: user.pin,
        }
        setCurrentUser(verifiedUser)
      } else {
        setCurrentUser(user)
      }
      return true
    } catch {
      setError("Erreur de connexion")
      return false
    } finally {
      setVerifying(false)
    }
  }

  async function handleSelectUser(user: AppUser) {
    // Reset rate-limit visuals when switching users
    setLocked(false)
    setCountdown(0)
    setAttemptsLeft(null)
    setAlertTriggered(false)

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
    if (pin.length >= 4 || verifying || locked) return
    const newPin = pin + digit
    setPin(newPin)

    if (newPin.length === 4) {
      // Verify PIN on server (not client-side comparison)
      const ok = await verifyPinOnServer(selectedUser!, newPin)
      if (ok) onUnlock()
    }
  }

  function handleBackspace() {
    if (locked) return
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
            onClick={() => {
              setSelectedUser(null)
              setLocked(false)
              setCountdown(0)
              setAttemptsLeft(null)
              setAlertTriggered(false)
            }}
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

          {/* Alert banner — shown after 2 lockouts */}
          {alertTriggered && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm w-full">
              <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Alerte de securite</p>
                <p className="text-destructive/80 text-xs mt-0.5">
                  Plusieurs tentatives echouees detectees. Si ce n{"'"}est pas vous,
                  contactez le proprietaire immediatement.
                </p>
              </div>
            </div>
          )}

          {/* Lockout banner */}
          {locked && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm w-full">
              <Timer className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-amber-700 font-medium">
                Bloque pendant {formatCountdown(countdown)}
              </p>
            </div>
          )}

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

          {error && !locked && (
            <div className="text-center">
              <p className="text-sm text-destructive">{error}</p>
              {attemptsLeft !== null && attemptsLeft > 0 && (
                <p className="text-xs text-destructive/70 mt-0.5">
                  {attemptsLeft} tentative{attemptsLeft > 1 ? "s" : ""} restante
                  {attemptsLeft > 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}
          {!error && !locked && (
            <p className="text-sm text-muted-foreground">Entrez votre code PIN</p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-14 w-14 rounded-full text-xl font-medium bg-white/80 hover:bg-white border-border/50"
                onClick={() => handlePinInput(String(num))}
                disabled={locked}
              >
                {num}
              </Button>
            ))}
            <div />
            <Button
              variant="outline"
              className="h-14 w-14 rounded-full text-xl font-medium bg-white/80 hover:bg-white border-border/50"
              onClick={() => handlePinInput("0")}
              disabled={locked}
            >
              0
            </Button>
            <Button
              variant="ghost"
              className="h-14 w-14 rounded-full text-sm"
              onClick={handleBackspace}
              disabled={pin.length === 0 || locked}
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

        {/* User grid -- shows each profile separately (multi-role support) */}
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
          {users.map((user) => {
            // Check if this person has multiple profiles
            const profileCount = users.filter((u) => u.name === user.name).length
            return (
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
                  <p className="text-[11px] text-muted-foreground">
                    {ROLE_LABELS[user.role]}
                    {profileCount > 1 && (
                      <span className="ml-1 text-[10px] text-violet-500 font-medium">
                        ({profileCount} profils)
                      </span>
                    )}
                  </p>
                </div>
                {user.pin && <Lock className="h-3 w-3 text-muted-foreground/50" />}
              </button>
            )
          })}
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
