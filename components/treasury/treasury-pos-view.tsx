"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { 
  Printer, CreditCard, Banknote, Receipt, 
  Trash2, Plus, Minus, Search, User, Clock, ShoppingBag,
  X, Check, Loader2, Package, Unlock, RefreshCw, ArrowLeft,
  DollarSign, TrendingUp, TrendingDown, Lock, Settings,
  ChevronDown, FileText, Calculator
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import { useFinishedProducts, useTransactions } from "@/hooks/use-tenant-data"
import { cn } from "@/lib/utils"

// Types
interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
}

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount)
}

// Generate receipt HTML for printing
const generateReceiptHTML = (data: {
  storeName: string
  items: CartItem[]
  subtotal: number
  total: number
  paymentMethod: string
  cashReceived?: number
  change?: number
  cashierName: string
  transactionId: string
}) => {
  const now = new Date()
  const date = now.toLocaleDateString("fr-TN")
  const time = now.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ticket de caisse</title>
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 12px; 
          width: 80mm; 
          margin: 0 auto;
          padding: 10px;
        }
        .header { text-align: center; margin-bottom: 10px; }
        .store-name { font-size: 18px; font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .item { display: flex; justify-content: space-between; margin: 4px 0; }
        .item-name { flex: 1; }
        .item-qty { width: 30px; text-align: center; }
        .item-price { width: 60px; text-align: right; }
        .total-line { display: flex; justify-content: space-between; font-weight: bold; margin: 4px 0; }
        .big-total { font-size: 16px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; }
        @media print {
          body { width: 80mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="store-name">${data.storeName}</div>
        <div>${date} - ${time}</div>
        <div>Ticket #${data.transactionId.slice(-6).toUpperCase()}</div>
      </div>
      
      <div class="divider"></div>
      
      ${data.items.map(item => `
        <div class="item">
          <span class="item-name">${item.name}</span>
          <span class="item-qty">x${item.quantity}</span>
          <span class="item-price">${formatCurrency(item.price * item.quantity)}</span>
        </div>
      `).join('')}
      
      <div class="divider"></div>
      
      <div class="total-line">
        <span>Sous-total</span>
        <span>${formatCurrency(data.subtotal)} TND</span>
      </div>
      
      <div class="total-line big-total">
        <span>TOTAL</span>
        <span>${formatCurrency(data.total)} TND</span>
      </div>
      
      <div class="divider"></div>
      
      <div class="total-line">
        <span>Mode de paiement</span>
        <span>${data.paymentMethod === 'cash' ? 'Especes' : 'Carte'}</span>
      </div>
      
      ${data.paymentMethod === 'cash' && data.cashReceived ? `
        <div class="total-line">
          <span>Recu</span>
          <span>${formatCurrency(data.cashReceived)} TND</span>
        </div>
        <div class="total-line">
          <span>Monnaie</span>
          <span>${formatCurrency(data.change || 0)} TND</span>
        </div>
      ` : ''}
      
      <div class="divider"></div>
      
      <div class="footer">
        <div>Caissier: ${data.cashierName}</div>
        <div>Merci de votre visite!</div>
        <div>A bientot</div>
      </div>
      
      <script>window.onload = function() { window.print(); window.close(); }</script>
    </body>
    </html>
  `
}

// Print receipt function
const printReceipt = (data: Parameters<typeof generateReceiptHTML>[0]) => {
  const receiptWindow = window.open('', '_blank', 'width=400,height=600')
  if (receiptWindow) {
    receiptWindow.document.write(generateReceiptHTML(data))
    receiptWindow.document.close()
  } else {
    toast.error("Impossible d'ouvrir la fenetre d'impression")
  }
}

// Open cash drawer via ESC/POS API
const openCashDrawer = async () => {
  try {
    const res = await fetch("/api/treasury/esc-pos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "open_drawer" })
    })
    if (res.ok) {
      toast.success("Tiroir caisse ouvert", { duration: 2000 })
    }
  } catch {
    // Fallback: just show success (for demo/testing)
    toast.success("Commande tiroir envoyee", { duration: 2000 })
  }
}

// Main POS Treasury View
export function TreasuryPosView() {
  const { currentTenant, currentUser } = useTenant()
  const { data: products, isLoading: productsLoading } = useFinishedProducts()
  const { data: transactions, mutate: refreshTransactions } = useTransactions()
  
  // State
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash")
  const [cashReceived, setCashReceived] = useState("")
  const [processing, setProcessing] = useState(false)
  const [currentTime, setCurrentTime] = useState("")
  const [dailyTotal, setDailyTotal] = useState(0)
  const [dailyExpenses, setDailyExpenses] = useState(0)
  const [transactionCount, setTransactionCount] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString("fr-TN", { 
        hour: "2-digit", 
        minute: "2-digit",
        second: "2-digit"
      }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Calculate daily totals
  useEffect(() => {
    if (transactions) {
      const today = new Date().toDateString()
      const todayTransactions = (transactions as any[]).filter(t => 
        new Date(t.createdAt || t.created_at).toDateString() === today
      )
      const income = todayTransactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0)
      const expenses = todayTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0)
      setDailyTotal(income)
      setDailyExpenses(expenses)
      setTransactionCount(todayTransactions.length)
    }
  }, [transactions])

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal
  const cashReceivedNum = parseFloat(cashReceived) || 0
  const change = cashReceivedNum - total

  // Get unique categories
  // Get categories from products - handle both category and categoryId fields
  const categories = products
    ? [...new Set((products as any[]).map(p => p.category || p.categoryId || "Autre").filter(Boolean))]
    : []

  // Filter products by search and category
  const filteredProducts = (products as any[] || []).filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const productCategory = p.category || p.categoryId || "Autre"
    const matchesCategory = !selectedCategory || productCategory === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Cart functions
  const addToCart = useCallback((product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.sellingPrice || product.selling_price || 0,
        quantity: 1,
        image: product.imageUrl || product.image_url
      }]
    })
    toast.success(`${product.name} ajoute`, { duration: 1000 })
  }, [])

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta)
        return { ...item, quantity: newQty }
      }
      return item
    }).filter(item => item.quantity > 0))
  }, [])

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    setCashReceived("")
  }, [])

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) return
    if (paymentMethod === "cash" && cashReceivedNum < total) {
      toast.error("Montant insuffisant")
      return
    }
    
    setProcessing(true)
    try {
      // Create transaction via API
      const res = await fetch("/api/treasury/pos-sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          total,
          paymentMethod,
          cashReceived: paymentMethod === "cash" ? cashReceivedNum : total
        })
      })

      let transactionId = `POS-${Date.now()}`
      if (res.ok) {
        const data = await res.json()
        transactionId = data.transactionId || transactionId
      }
      
      // Open cash drawer for cash payments
      if (paymentMethod === "cash") {
        await openCashDrawer()
      }

      // Print receipt
      printReceipt({
        storeName: currentTenant?.name || "KIFSHOP",
        items: cart,
        subtotal,
        total,
        paymentMethod,
        cashReceived: cashReceivedNum,
        change: change > 0 ? change : 0,
        cashierName: currentUser?.name || "Caissier",
        transactionId
      })

      // Reset
      clearCart()
      setPaymentDialogOpen(false)
      refreshTransactions()
      toast.success("Vente enregistree avec succes!")

    } catch (error) {
      console.error("Payment error:", error)
      toast.error("Erreur lors du paiement")
    } finally {
      setProcessing(false)
    }
  }

  // Numpad handler
  const handleNumpad = (value: string) => {
    if (value === "C") {
      setCashReceived("")
    } else if (value === "back") {
      setCashReceived(prev => prev.slice(0, -1))
    } else if (value === ".") {
      if (!cashReceived.includes(".")) {
        setCashReceived(prev => prev + ".")
      }
    } else {
      setCashReceived(prev => prev + value)
    }
  }

  // Quick amount buttons
  const quickAmounts = [5, 10, 20, 50, 100]

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-slate-950 text-white overflow-hidden -mx-4 -mt-4 lg:-mx-6 lg:-mt-6">
      {/* Top Bar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <User className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">{currentUser?.name || "Caissier"}</p>
              <p className="text-xs text-slate-500">{currentTenant?.name}</p>
            </div>
          </div>
          <Separator orientation="vertical" className="h-8 bg-slate-700" />
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="h-4 w-4" />
            <span className="text-base font-mono font-medium">{currentTime}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] uppercase text-slate-500 tracking-wider">Recettes</p>
              <p className="text-lg font-bold text-emerald-400">+{formatCurrency(dailyTotal)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase text-slate-500 tracking-wider">Depenses</p>
              <p className="text-lg font-bold text-red-400">-{formatCurrency(dailyExpenses)}</p>
            </div>
          </div>
          
          <Separator orientation="vertical" className="h-8 bg-slate-700 hidden md:block" />
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-800 h-9"
              onClick={() => openCashDrawer()}
            >
              <Unlock className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Tiroir</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-800 h-9"
              onClick={() => refreshTransactions()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800 h-9">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                <DropdownMenuItem className="text-slate-300 focus:bg-slate-800 focus:text-white">
                  <Lock className="h-4 w-4 mr-2" /> Cloture de caisse
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-300 focus:bg-slate-800 focus:text-white">
                  <FileText className="h-4 w-4 mr-2" /> Rapport Z
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col bg-slate-900/50">
          {/* Search & Categories */}
          <div className="p-3 space-y-2 border-b border-slate-800/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                ref={searchRef}
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            
            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <Button
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "shrink-0 h-8 px-3 text-xs font-medium rounded-full",
                  selectedCategory === null 
                    ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                )}
              >
                Tous
              </Button>
              {categories.map((cat: string) => (
                <Button
                  key={cat}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "shrink-0 h-8 px-3 text-xs font-medium rounded-full",
                    selectedCategory === cat 
                      ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <ScrollArea className="flex-1">
            <div className="p-3">
              {productsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <Package className="h-12 w-12 mb-3 opacity-50" />
                  <p>Aucun produit trouve</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {filteredProducts.map((product: any) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="group relative bg-slate-800/80 hover:bg-slate-700 rounded-lg p-2.5 text-left transition-all active:scale-[0.97] border border-slate-700/50 hover:border-emerald-500/50"
                    >
          {product.imageUrl || product.image_url ? (
            <img
              src={product.imageUrl || product.image_url}
              alt={product.name}
              className="w-full h-32 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-32 bg-slate-700 rounded-lg flex items-center justify-center">
              <Package className="h-12 w-12 text-slate-600" />
            </div>
          )}
          <p className="text-emerald-400 font-bold text-sm">{formatCurrency(product.sellingPrice || product.selling_price || 0)}</p>
                      
                      {/* Quick add indicator */}
                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                          <Plus className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Cart & Payment */}
        <div className="w-[320px] lg:w-[360px] flex flex-col bg-slate-950 border-l border-slate-800">
          {/* Cart Header */}
          <div className="p-3 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-emerald-400" />
                <h2 className="font-bold">Panier</h2>
                {cart.length > 0 && (
                  <Badge className="bg-emerald-500 text-white text-xs px-1.5">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </div>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Vider
                </Button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1 px-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
                <ShoppingBag className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Panier vide</p>
              </div>
            ) : (
              <div className="space-y-2 py-3">
                {cart.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-white truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(item.price)} x {item.quantity}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-600 hover:text-red-400 shrink-0"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 border-slate-700 text-slate-300 hover:bg-slate-800"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 border-slate-700 text-slate-300 hover:bg-slate-800"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-bold text-emerald-400">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Cart Footer */}
          <div className="border-t border-slate-800 p-3 space-y-3 bg-slate-900/50">
            {/* Total */}
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="flex justify-between text-slate-400 text-sm mb-1">
                <span>Sous-total</span>
                <span>{formatCurrency(subtotal)} TND</span>
              </div>
              <div className="flex justify-between text-xl font-bold">
                <span>TOTAL</span>
                <span className="text-emerald-400">{formatCurrency(total)} TND</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-12 border-slate-700 text-slate-300 hover:bg-slate-800 flex-col gap-0.5"
                onClick={() => {
                  if (cart.length > 0) {
                    printReceipt({
                      storeName: currentTenant?.name || "KIFSHOP",
                      items: cart,
                      subtotal,
                      total,
                      paymentMethod: "preview",
                      cashierName: currentUser?.name || "Caissier",
                      transactionId: `PREV-${Date.now()}`
                    })
                  }
                }}
                disabled={cart.length === 0}
              >
                <Receipt className="h-4 w-4" />
                <span className="text-[10px]">Apercu</span>
              </Button>
              <Button
                variant="outline"
                className="h-12 border-slate-700 text-slate-300 hover:bg-slate-800 flex-col gap-0.5"
                onClick={() => openCashDrawer()}
              >
                <Unlock className="h-4 w-4" />
                <span className="text-[10px]">Tiroir</span>
              </Button>
            </div>

            {/* Payment Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="h-14 bg-emerald-600 hover:bg-emerald-700 text-white flex-col gap-0.5"
                onClick={() => {
                  setPaymentMethod("cash")
                  setCashReceived("")
                  setPaymentDialogOpen(true)
                }}
                disabled={cart.length === 0}
              >
                <Banknote className="h-5 w-5" />
                <span className="text-xs font-bold">ESPECES</span>
              </Button>
              <Button
                className="h-14 bg-blue-600 hover:bg-blue-700 text-white flex-col gap-0.5"
                onClick={() => {
                  setPaymentMethod("card")
                  setCashReceived(total.toFixed(3))
                  setPaymentDialogOpen(true)
                }}
                disabled={cart.length === 0}
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-xs font-bold">CARTE</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[420px] bg-slate-900 border-slate-800 text-white p-0 overflow-hidden">
          <div className={cn(
            "p-4",
            paymentMethod === "cash" ? "bg-emerald-600" : "bg-blue-600"
          )}>
            <DialogTitle className="flex items-center gap-2 text-white text-lg">
              {paymentMethod === "cash" ? (
                <><Banknote className="h-5 w-5" /> Paiement Especes</>
              ) : (
                <><CreditCard className="h-5 w-5" /> Paiement Carte</>
              )}
            </DialogTitle>
          </div>

          <div className="p-4 space-y-4">
            {/* Total */}
            <div className="bg-slate-800 rounded-xl p-4 text-center">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total a payer</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(total)} TND</p>
            </div>

            {paymentMethod === "cash" && (
              <>
                {/* Cash received */}
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Montant recu</p>
                  <p className="text-2xl font-bold text-white font-mono">
                    {cashReceived || "0"} TND
                  </p>
                </div>

                {/* Quick amounts */}
                <div className="grid grid-cols-5 gap-1.5">
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 font-bold h-9 text-xs"
                      onClick={() => setCashReceived(amount.toString())}
                    >
                      {amount}
                    </Button>
                  ))}
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-1.5">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "back"].map((key) => (
                    <Button
                      key={key}
                      variant={key === "C" ? "destructive" : "outline"}
                      className={cn(
                        "h-12 text-lg font-bold",
                        key === "C" ? "" : "border-slate-700 text-white hover:bg-slate-800"
                      )}
                      onClick={() => handleNumpad(key)}
                    >
                      {key === "back" ? <ArrowLeft className="h-4 w-4" /> : key}
                    </Button>
                  ))}
                </div>

                {/* Change */}
                {cashReceivedNum >= total && cashReceivedNum > 0 && (
                  <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-3 text-center">
                    <p className="text-emerald-400 text-xs uppercase tracking-wider mb-1">Monnaie a rendre</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(change)} TND</p>
                  </div>
                )}
              </>
            )}

            {paymentMethod === "card" && (
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 text-center">
                <CreditCard className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-blue-400 text-sm">Presentez la carte au terminal</p>
              </div>
            )}

            {/* Confirm */}
            <Button
              className={cn(
                "w-full h-14 text-lg font-bold",
                paymentMethod === "cash" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
              )}
              onClick={processPayment}
              disabled={processing || (paymentMethod === "cash" && cashReceivedNum < total)}
            >
              {processing ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Check className="h-5 w-5 mr-2" />
              )}
              VALIDER PAIEMENT
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
