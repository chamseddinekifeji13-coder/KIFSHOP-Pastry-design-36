"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ShoppingBag, Banknote, Receipt, Users, 
  Settings, LogOut, Zap, BarChart3, Lock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n/context"
import { useTenant } from "@/lib/tenant-context"
import { getServerSession } from "@/lib/active-profile"

export default function CashierDashboard() {
  const { t } = useI18n()
  const { currentTenant } = useTenant()
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState("")
  const [cashierName, setCashierName] = useState("")

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("fr-TN", { 
        hour: "2-digit", 
        minute: "2-digit",
        second: "2-digit"
      }))
    }, 1000)

    // Get cashier name
    getServerSession().then(session => {
      if (session?.displayName) setCashierName(session.displayName)
    }).catch(() => {})

    return () => clearInterval(timer)
  }, [])

  const quickActions = [
    {
      id: "new-order",
      label: "Nouvelle Commande",
      icon: ShoppingBag,
      color: "bg-blue-500",
      href: "/orders?mode=fast",
      shortcut: "Cmd+N"
    },
    {
      id: "collection",
      label: "Encaisser",
      icon: Banknote,
      color: "bg-green-500",
      href: "/treasury?tab=collection",
      shortcut: "Cmd+E"
    },
    {
      id: "transactions",
      label: "Transactions",
      icon: Receipt,
      color: "bg-orange-500",
      href: "/treasury?tab=overview",
      shortcut: "Cmd+T"
    },
    {
      id: "clients",
      label: "Clients",
      icon: Users,
      color: "bg-purple-500",
      href: "/clients",
      shortcut: "Cmd+C"
    },
    {
      id: "session",
      label: "Session Caisse",
      icon: Lock,
      color: "bg-red-500",
      href: "/treasury?tab=session",
      shortcut: "Cmd+S"
    },
    {
      id: "reports",
      label: "Rapports",
      icon: BarChart3,
      color: "bg-indigo-500",
      href: "/treasury?tab=reports",
      shortcut: "Cmd+R"
    },
  ]

  const handleKeyboardShortcut = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "n") {
      e.preventDefault()
      router.push("/orders?mode=fast")
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboardShortcut)
    return () => window.removeEventListener("keydown", handleKeyboardShortcut)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Caisse Enregistreuse
            </h1>
            <p className="text-slate-400">{currentTenant?.name || "Boutique"}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-mono font-bold text-white mb-1">
              {currentTime}
            </div>
            {cashierName && (
              <Badge variant="secondary">{cashierName}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
        {quickActions.map(action => {
          const Icon = action.icon
          return (
            <Button
              key={action.id}
              onClick={() => router.push(action.href)}
              className={`${action.color} h-auto flex flex-col items-center justify-center p-4 sm:p-6 text-white touch-target-lg rounded-2xl font-semibold hover:brightness-110 transition-all active:scale-95`}
            >
              <Icon className="h-8 w-8 sm:h-10 sm:w-10 mb-2" />
              <span className="text-center text-sm sm:text-base leading-tight">
                {action.label}
              </span>
              <span className="text-xs opacity-75 mt-1">{action.shortcut}</span>
            </Button>
          )
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard 
          label="Commandes aujourd'hui" 
          value="--" 
          icon={ShoppingBag}
          color="blue"
        />
        <StatsCard 
          label="Montant encaissé" 
          value="-- TND" 
          icon={Banknote}
          color="green"
        />
        <StatsCard 
          label="Transactions" 
          value="--" 
          icon={Receipt}
          color="orange"
        />
        <StatsCard 
          label="Clients" 
          value="--" 
          icon={Users}
          color="purple"
        />
      </div>

      {/* Footer */}
      <div className="flex gap-3 justify-center mt-12">
        <Button variant="outline" size="lg" className="gap-2">
          <Settings className="h-4 w-4" />
          Parametres
        </Button>
        <Button variant="destructive" size="lg" className="gap-2">
          <LogOut className="h-4 w-4" />
          Deconnexion
        </Button>
      </div>
    </div>
  )
}

function StatsCard({ label, value, icon: Icon, color }: {
  label: string
  value: string
  icon: any
  color: string
}) {
  const colorMap = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-600",
    green: "bg-green-500/10 border-green-500/20 text-green-600",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-600",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-600",
  }

  return (
    <Card className={`border-2 ${colorMap[color as keyof typeof colorMap]} bg-opacity-50`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold">{value}</p>
          </div>
          <Icon className="h-8 w-8 opacity-20" />
        </div>
      </CardContent>
    </Card>
  )
}
