"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ShoppingBag, Banknote, Receipt, Users, 
  Settings, LogOut, BarChart3, Lock, Clock,
  ChevronRight, Sparkles, TrendingUp, CreditCard,
  Wallet, ArrowUpRight, ChefHat
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n/context"
import { useTenant } from "@/lib/tenant-context"

export default function CashierDashboard() {
  const { t } = useI18n()
  const { currentTenant, currentUser } = useTenant()
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState("")
  const [currentDate, setCurrentDate] = useState("")

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString("fr-TN", { 
        hour: "2-digit", 
        minute: "2-digit",
        second: "2-digit"
      }))
      setCurrentDate(now.toLocaleDateString("fr-TN", {
        weekday: "long",
        day: "numeric",
        month: "long"
      }))
    }
    
    updateDateTime()
    const timer = setInterval(updateDateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const quickActions = [
    {
      id: "new-order",
      label: "Nouvelle Commande",
      description: "Creer une vente",
      icon: ShoppingBag,
      href: "/orders?mode=fast",
      shortcut: "N",
      accent: true
    },
    {
      id: "collection",
      label: "Encaisser",
      description: "Recevoir paiement",
      icon: Banknote,
      href: "/tresorerie?tab=collection",
      shortcut: "E"
    },
    {
      id: "transactions",
      label: "Transactions",
      description: "Historique",
      icon: Receipt,
      href: "/tresorerie?tab=overview",
      shortcut: "T"
    },
    {
      id: "clients",
      label: "Clients",
      description: "Gestion clients",
      icon: Users,
      href: "/clients",
      shortcut: "C"
    },
    {
      id: "session",
      label: "Session Caisse",
      description: "Ouvrir / Fermer",
      icon: Lock,
      href: "/tresorerie?tab=session",
      shortcut: "S"
    },
    {
      id: "reports",
      label: "Rapports",
      description: "Statistiques",
      icon: BarChart3,
      href: "/tresorerie?tab=reports",
      shortcut: "R"
    },
  ]

  const stats = [
    { 
      label: "Ventes aujourd'hui", 
      value: "24", 
      change: "+12%",
      icon: ShoppingBag,
      trend: "up"
    },
    { 
      label: "Chiffre d'affaires", 
      value: "1,250 TND", 
      change: "+8%",
      icon: TrendingUp,
      trend: "up"
    },
    { 
      label: "Especes", 
      value: "850 TND", 
      icon: Wallet,
    },
    { 
      label: "Cartes", 
      value: "400 TND", 
      icon: CreditCard,
    },
  ]

  const handleKeyboardShortcut = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      const action = quickActions.find(a => a.shortcut.toLowerCase() === e.key.toLowerCase())
      if (action) {
        e.preventDefault()
        router.push(action.href)
      }
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboardShortcut)
    return () => window.removeEventListener("keydown", handleKeyboardShortcut)
  }, [])

  return (
    <div className="min-h-screen bg-secondary p-4 sm:p-6 lg:p-8">
      {/* Subtle pattern overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-secondary shadow-lg shadow-primary/20">
              <ChefHat className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Caisse Enregistreuse
              </h1>
              <p className="text-white/50 text-sm mt-0.5">
                {currentTenant?.name || "KIFSHOP Pastry"}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-3xl font-mono font-bold tracking-tight">
                {currentTime}
              </span>
            </div>
            <p className="text-white/40 text-sm capitalize">{currentDate}</p>
            {currentUser?.name && (
              <Badge className="mt-2 bg-white/10 text-white/70 border-white/10 hover:bg-white/20">
                {currentUser.name}
              </Badge>
            )}
          </div>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div 
                key={i}
                className="group relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 transition-all hover:bg-white/[0.06] hover:border-primary/20"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  {stat.change && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      {stat.change}
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-white mb-0.5">{stat.value}</p>
                <p className="text-xs text-white/40">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">
              Actions Rapides
            </h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map(action => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => router.push(action.href)}
                  className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all active:scale-[0.98] ${
                    action.accent 
                      ? "bg-primary text-secondary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30" 
                      : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-primary/30"
                  }`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-3 transition-transform group-hover:scale-110 ${
                    action.accent 
                      ? "bg-secondary/20" 
                      : "bg-primary/10"
                  }`}>
                    <Icon className={`h-6 w-6 ${action.accent ? "text-secondary" : "text-primary"}`} />
                  </div>
                  
                  <h3 className={`font-semibold mb-0.5 ${action.accent ? "text-secondary" : "text-white"}`}>
                    {action.label}
                  </h3>
                  <p className={`text-xs ${action.accent ? "text-secondary/60" : "text-white/40"}`}>
                    {action.description}
                  </p>
                  
                  <div className={`absolute top-3 right-3 flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    action.accent 
                      ? "bg-secondary/20 text-secondary/70" 
                      : "bg-white/5 text-white/30"
                  }`}>
                    <span className="opacity-60">Ctrl</span>
                    <span>{action.shortcut}</span>
                  </div>
                  
                  <ChevronRight className={`absolute bottom-4 right-4 h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-50 group-hover:translate-x-0 ${
                    action.accent ? "text-secondary" : "text-white"
                  }`} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">
              Activite Recente
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => router.push("/tresorerie?tab=overview")}
            >
              Voir tout
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <div className="space-y-3">
            {[1, 2, 3].map((_, i) => (
              <div 
                key={i}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">
                      Commande #{1000 + i}
                    </p>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                      Payee
                    </Badge>
                  </div>
                  <p className="text-xs text-white/40">Il y a {5 * (i + 1)} minutes</p>
                </div>
                <p className="text-sm font-semibold text-white">
                  {(45 + i * 12).toFixed(2)} TND
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.06]">
          <p className="text-xs text-white/30">
            KIFSHOP Pastry v1.0 - Session active
          </p>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white/50 hover:text-white hover:bg-white/10"
              onClick={() => router.push("/parametres")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Parametres
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Deconnexion
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
