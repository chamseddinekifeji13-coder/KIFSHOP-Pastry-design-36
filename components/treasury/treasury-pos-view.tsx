"use client"

import { useState, useMemo } from "react"
import { 
  Banknote, CreditCard, Receipt, Calculator, 
  DollarSign, TrendingUp, TrendingDown, Clock,
  Lock, Unlock, BarChart3, Users, ArrowRight,
  Plus, Minus, X, Check, RefreshCw, Printer
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useTransactions } from "@/hooks/use-tenant-data"
import { useTenant } from "@/lib/tenant-context"
import { NewTransactionDrawer } from "./new-transaction-drawer"

// PIN Verification Dialog
function PinDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  title = "Verification requise",
  description = "Entrez votre code PIN pour continuer"
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  title?: string
  description?: string
}) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)
  const { currentTenant } = useTenant()

  const handleNumpad = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num
      setPin(newPin)
      setError(false)
      
      if (newPin.length === 4) {
        // Verify PIN (in real app, call API)
        verifyPin(newPin)
      }
    }
  }

  const verifyPin = async (enteredPin: string) => {
    try {
      const res = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: enteredPin, requiredRole: "gerant" })
      })
      
      if (res.ok) {
        setPin("")
        onOpenChange(false)
        onSuccess()
      } else {
        setError(true)
        setPin("")
      }
    } catch {
      setError(true)
      setPin("")
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
            Code PIN incorrect
          </p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "←"].map(key => (
            <Button
              key={key}
              variant={key === "C" ? "destructive" : key === "←" ? "secondary" : "outline"}
              className="numpad-btn"
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
  )
}

// Quick Amount Button
function QuickAmountButton({ 
  amount, 
  selected, 
  onClick 
}: { 
  amount: number
  selected: boolean
  onClick: () => void 
}) {
  return (
    <Button
      variant={selected ? "default" : "outline"}
      className="touch-target-lg text-xl font-bold pos-btn"
      onClick={onClick}
    >
      {amount} TND
    </Button>
  )
}

// Main POS Treasury View
export function TreasuryPosView() {
  const { data: transactions, isLoading, mutate } = useTransactions()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [quickAmount, setQuickAmount] = useState<number>(0)
  const [customAmount, setCustomAmount] = useState("")

  const allTransactions = transactions || []
  
  // Today's stats
  const today = new Date().toISOString().split("T")[0]
  const todayTransactions = allTransactions.filter(t => t.createdAt?.startsWith(today))
  const todayIn = todayTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
  const todayOut = todayTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
  const todayBalance = todayIn - todayOut
  const transactionCount = todayTransactions.length

  // Quick amounts
  const quickAmounts = [5, 10, 20, 50, 100, 200]

  // Handle protected action
  const handleProtectedAction = (action: string) => {
    setPendingAction(action)
    setPinDialogOpen(true)
  }

  const handlePinSuccess = () => {
    if (pendingAction === "reports") {
      // Navigate to reports or show reports modal
      window.location.href = "/dashboard/treasury?tab=reports"
    } else if (pendingAction === "cashiers") {
      window.location.href = "/dashboard/treasury?tab=cashiers"
    } else if (pendingAction === "close") {
      // Close cash register session
      alert("Cloture de caisse...")
    }
    setPendingAction(null)
  }

  // Handle quick transaction
  const handleQuickTransaction = (type: "income" | "expense") => {
    const amount = quickAmount || parseFloat(customAmount) || 0
    if (amount <= 0) return
    
    // Open drawer with pre-filled amount
    setDrawerOpen(true)
  }

  // Numpad for custom amount
  const handleNumpad = (key: string) => {
    if (key === "C") {
      setCustomAmount("")
      setQuickAmount(0)
    } else if (key === "←") {
      setCustomAmount(customAmount.slice(0, -1))
    } else if (key === ".") {
      if (!customAmount.includes(".")) {
        setCustomAmount(customAmount + ".")
      }
    } else {
      setCustomAmount(customAmount + key)
      setQuickAmount(0)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      {/* Header Stats - Large Touch Friendly */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="pos-btn cursor-default">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Solde du jour</p>
                <p className={`text-2xl lg:text-3xl font-bold ${todayBalance >= 0 ? "text-primary" : "text-destructive"}`}>
                  {todayBalance.toLocaleString("fr-TN")} TND
                </p>
              </div>
              <div className="h-12 w-12 lg:h-16 lg:w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Banknote className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="pos-btn cursor-default">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entrees</p>
                <p className="text-2xl lg:text-3xl font-bold text-primary">
                  +{todayIn.toLocaleString("fr-TN")}
                </p>
              </div>
              <div className="h-12 w-12 lg:h-16 lg:w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="pos-btn cursor-default">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sorties</p>
                <p className="text-2xl lg:text-3xl font-bold text-destructive">
                  -{todayOut.toLocaleString("fr-TN")}
                </p>
              </div>
              <div className="h-12 w-12 lg:h-16 lg:w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 lg:h-8 lg:w-8 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="pos-btn cursor-default">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl lg:text-3xl font-bold">
                  {transactionCount}
                </p>
              </div>
              <div className="h-12 w-12 lg:h-16 lg:w-16 rounded-full bg-secondary/20 flex items-center justify-center">
                <Receipt className="h-6 w-6 lg:h-8 lg:w-8 text-secondary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Entry */}
          <Card>
            <CardContent className="p-4 lg:p-6">
              <h3 className="text-lg font-semibold mb-4">Montant</h3>
              
              {/* Display */}
              <div className="bg-muted rounded-xl p-4 mb-4">
                <p className="text-4xl lg:text-5xl font-bold text-center">
                  {quickAmount || customAmount || "0"} <span className="text-2xl text-muted-foreground">TND</span>
                </p>
              </div>

              {/* Quick Amounts */}
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                {quickAmounts.map(amount => (
                  <QuickAmountButton
                    key={amount}
                    amount={amount}
                    selected={quickAmount === amount}
                    onClick={() => {
                      setQuickAmount(amount)
                      setCustomAmount("")
                    }}
                  />
                ))}
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-4 gap-3">
                {["7", "8", "9", "←", "4", "5", "6", "C", "1", "2", "3", ".", "0", "00", "000", ""].map((key, i) => (
                  key ? (
                    <Button
                      key={key}
                      variant={key === "C" ? "destructive" : key === "←" ? "secondary" : "outline"}
                      className="numpad-btn"
                      onClick={() => handleNumpad(key)}
                    >
                      {key}
                    </Button>
                  ) : <div key={i} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Transaction Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button 
              size="lg" 
              className="touch-target-xl text-xl font-bold pos-btn h-24"
              onClick={() => setDrawerOpen(true)}
            >
              <Plus className="h-8 w-8 mr-3" />
              Entree
            </Button>
            <Button 
              size="lg" 
              variant="destructive"
              className="touch-target-xl text-xl font-bold pos-btn h-24"
              onClick={() => setDrawerOpen(true)}
            >
              <Minus className="h-8 w-8 mr-3" />
              Sortie
            </Button>
          </div>
        </div>

        {/* Right: Actions & Recent */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardContent className="p-4 lg:p-6">
              <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="touch-target flex-col h-24 pos-btn"
                  onClick={() => handleProtectedAction("reports")}
                >
                  <BarChart3 className="h-6 w-6 mb-2" />
                  <span className="text-sm">Rapports</span>
                  <Lock className="h-3 w-3 absolute top-2 right-2 text-muted-foreground" />
                </Button>
                <Button 
                  variant="outline" 
                  className="touch-target flex-col h-24 pos-btn"
                  onClick={() => handleProtectedAction("cashiers")}
                >
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-sm">Caissiers</span>
                  <Lock className="h-3 w-3 absolute top-2 right-2 text-muted-foreground" />
                </Button>
                <Button 
                  variant="outline" 
                  className="touch-target flex-col h-24 pos-btn"
                  onClick={() => window.print()}
                >
                  <Printer className="h-6 w-6 mb-2" />
                  <span className="text-sm">Imprimer</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="touch-target flex-col h-24 pos-btn"
                  onClick={() => mutate()}
                >
                  <RefreshCw className="h-6 w-6 mb-2" />
                  <span className="text-sm">Actualiser</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Close Session */}
          <Button 
            variant="secondary"
            size="lg"
            className="w-full touch-target-lg text-lg font-semibold pos-btn"
            onClick={() => handleProtectedAction("close")}
          >
            <Lock className="h-5 w-5 mr-2" />
            Cloture de caisse
          </Button>

          {/* Recent Transactions */}
          <Card>
            <CardContent className="p-4 lg:p-6">
              <h3 className="text-lg font-semibold mb-4">Dernieres transactions</h3>
              <div className="space-y-3 max-h-[300px] overflow-auto">
                {todayTransactions.slice(0, 10).map(t => (
                  <div 
                    key={t.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        t.type === "income" ? "bg-primary/10" : "bg-destructive/10"
                      }`}>
                        {t.type === "income" 
                          ? <Plus className="h-5 w-5 text-primary" />
                          : <Minus className="h-5 w-5 text-destructive" />
                        }
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t.description || t.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.createdAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <p className={`font-bold ${t.type === "income" ? "text-primary" : "text-destructive"}`}>
                      {t.type === "income" ? "+" : "-"}{t.amount} TND
                    </p>
                  </div>
                ))}
                {todayTransactions.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune transaction aujourd'hui
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <PinDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        onSuccess={handlePinSuccess}
        title="Acces restreint"
        description="Cette action necessite le code PIN du gerant ou proprietaire"
      />

      <NewTransactionDrawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
        onSuccess={() => mutate()} 
      />
    </div>
  )
}
