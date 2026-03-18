"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react"

type Step = "email" | "otp" | "newPin" | "success"

export default function ForgotPinPage() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [tenantUserId, setTenantUserId] = useState("")
  const [otp, setOtp] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [attemptsLeft, setAttemptsLeft] = useState(3)

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/request-pin-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error("Failed to send recovery code")
      }

      setStep("otp")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/verify-pin-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantUserId, otp, newPin: "" }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Invalid OTP")
        if (data.attemptsLeft) {
          setAttemptsLeft(data.attemptsLeft)
        }
        return
      }

      setStep("newPin")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPin !== confirmPin) {
      setError("PINs do not match")
      return
    }

    if (newPin.length < 4 || newPin.length > 6) {
      setError("PIN must be between 4 and 6 digits")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/verify-pin-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantUserId, otp, newPin }),
      })

      if (!response.ok) {
        throw new Error("Failed to reset PIN")
      }

      setStep("success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <Link href="/auth/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Recover your PIN</CardTitle>
            <CardDescription>
              {step === "email" && "Enter your email to receive a recovery code"}
              {step === "otp" && "Enter the code sent to your email"}
              {step === "newPin" && "Set your new PIN"}
              {step === "success" && "Your PIN has been reset"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Email */}
            {step === "email" && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email address</label>
                  <Input
                    type="email"
                    placeholder="manager@kifshop.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send recovery code
                </Button>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recovery code</label>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                    maxLength={6}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    {attemptsLeft} attempts remaining
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify code
                </Button>
              </form>
            )}

            {/* Step 3: New PIN */}
            {step === "newPin" && (
              <form onSubmit={handleResetPin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New PIN</label>
                  <Input
                    type="password"
                    placeholder="••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.slice(0, 6))}
                    maxLength={6}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">4-6 digits</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm PIN</label>
                  <Input
                    type="password"
                    placeholder="••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.slice(0, 6))}
                    maxLength={6}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset PIN
                </Button>
              </form>
            )}

            {/* Step 4: Success */}
            {step === "success" && (
              <div className="space-y-4 py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                <div className="space-y-2">
                  <h3 className="font-semibold">PIN reset successfully</h3>
                  <p className="text-sm text-muted-foreground">
                    You can now use your new PIN to access your account
                  </p>
                </div>
                <Link href="/auth/login">
                  <Button className="w-full">Back to login</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
