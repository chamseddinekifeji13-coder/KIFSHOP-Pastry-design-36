"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { 
  Printer, CreditCard, Banknote, Receipt, 
  Trash2, Plus, Minus, Search, User, Clock, ShoppingBag,
  X, Check, Loader2, Package, Unlock, RefreshCw, ArrowLeft,
  TrendingUp, TrendingDown, Settings, FileText, Calculator,
  Image as ImageIcon
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
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import { useFinishedProducts, useTransactions } from "@/hooks/use-tenant-data"
import { cn } from "@/lib/utils"
import { PaymentNumpad } from "./payment-numpad"
import { SalesHistoryPanel } from "./sales-history-panel"
import { DiscountManager } from "./discount-manager"
import { ProductSearchAdvanced } from "./product-search-advanced"

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
        @media print { body { width: 80mm; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="store-name">${data.storeName}</div>
        <div>${date} - ${time}</div>
        <div>Ticket #${data.transactionId}</div>
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
      <div class="total-line big-total">
        <span>TOTAL</span>
        <span>${formatCurrency(data.total)} TND</span>
      </div>
      ${data.paymentMethod === 'cash' && data.cashReceived ? `
        <div class="total-line">
          <span>Especes recues</span>
          <span>${formatCurrency(data.cashReceived)} TND</span>
        </div>
        <div class="total-line">
          <span>Monnaie</span>
          <span>${formatCurrency(data.change || 0)} TND</span>
        </div>
      ` : `
        <div class="total-line">
          <span>Paiement</span>
          <span>Carte bancaire</span>
        </div>
      `}
      <div class="divider"></div>
      <div class="footer">
        <p>Caissier: ${data.cashierName}</p>
        <p>Merci de votre visite!</p>
        <p>A bientot!</p>
      </div>
    </body>
    </html>
  `
}

export function TreasuryPosView() {
  const { currentTenant, currentUser } = useTenant()
  const { data: products, isLoading: productsLoading, mutate: refreshProducts } = useFinishedProducts()
  const { data: transactions } = useTransactions()

  // State
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState("")
  
  // Payment state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash")
  const [cashReceived, setCashReceived] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Receipt state
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<any>(null)
  
  // New states for enhanced POS
  const [appliedDiscounts, setAppliedDiscounts] = useState<any[]>([])
  const [salesHistory, setSalesHistory] = useState<any[]>([])
  const [showSalesHistory, setShowSalesHistory] = useState(false)
  const [paymentNumpadOpen, setPaymentNumpadOpen] = useState(false)
  const [searchMode, setSearchMode] = useState<"grid" | "search">("grid")

  // Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("fr-TN", { 
        hour: "2-digit", 
        minute: "2-digit",
        second: "2-digit"
      }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Get categories from products
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
  }, [])

  // Calculate totals - with discounts support
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  
  // Apply discounts
  const discountAmount = appliedDiscounts.reduce((sum, discount) => {
    if (discount.type === "percentage") {
      return sum + (subtotal * discount.value / 100)
    } else {
      return sum + discount.value
    }
  }, 0)
  
  const total = Math.max(0, subtotal - discountAmount)

  // Calculate change
  const cashReceivedNum = parseFloat(cashReceived) || 0
  const change = Math.max(0, cashReceivedNum - total)

  // Quick cash amounts
  const quickAmounts = [5, 10, 20, 50, 100]

  // Open cash drawer
  const openDrawer = async () => {
    try {
      const res = await fetch("/api/treasury/esc-pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open_drawer" })
      })
      const data = await res.json()
      
      if (data.mode === "demo") {
        toast.info("Mode demo: Configurez une imprimante thermique pour ouvrir le tiroir", { duration: 4000 })
      } else {
        toast.success("Tiroir-caisse ouvert")
      }
    } catch (error) {
      toast.error("Erreur ouverture tiroir")
    }
  }

  // Print receipt
  const printReceipt = (transactionData?: any) => {
    const data = transactionData || lastTransaction
    if (!data) return

    const receiptHTML = generateReceiptHTML({
      storeName: currentTenant?.name || "KIFSHOP",
      items: data.items || cart,
      subtotal: data.subtotal || subtotal,
      total: data.total || total,
      paymentMethod: data.paymentMethod || paymentMethod,
      cashReceived: data.cashReceived,
      change: data.change,
      cashierName: currentUser?.name || "Caissier",
      transactionId: data.id || Date.now().toString().slice(-6)
    })

    const printWindow = window.open("", "_blank", "width=300,height=600")
    if (printWindow) {
      printWindow.document.write(receiptHTML)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) {
      toast.error("Le panier est vide")
      return
    }

    if (paymentMethod === "cash" && cashReceivedNum < total) {
      toast.error("Montant insuffisant")
      return
    }

    setIsProcessing(true)

    try {
      // Record the sale
      const response = await fetch("/api/treasury/pos-sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          total,
          paymentMethod,
          cashReceived: paymentMethod === "cash" ? cashReceivedNum : undefined,
          change: paymentMethod === "cash" ? change : undefined,
        })
      })

      if (!response.ok) {
        throw new Error("Erreur lors de l'enregistrement")
      }

      const result = await response.json()

      // Save transaction for receipt
      const transactionData = {
        id: result.transactionId || Date.now().toString().slice(-6),
        items: [...cart],
        subtotal,
        total,
        paymentMethod,
        cashReceived: cashReceivedNum,
        change,
      }
      setLastTransaction(transactionData)

      // Open drawer for cash payments
      if (paymentMethod === "cash") {
        await openDrawer()
      }

      // Print receipt
      printReceipt(transactionData)

      // Clear and close
      toast.success(`Paiement de ${formatCurrency(total)} TND enregistre`)
      clearCart()
      setCashReceived("")
      setShowPaymentDialog(false)

    } catch (error) {
      toast.error("Erreur lors du paiement")
    } finally {
      setIsProcessing(false)
    }
  }

  // Today's stats
  const todayTransactions = (transactions || []).filter((t: any) => {
    const today = new Date().toDateString()
    return new Date(t.date).toDateString() === today
  })
  
  const todayIncome = todayTransactions
    .filter((t: any) => t.type === "entree")
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
  
  const todayExpense = todayTransactions
    .filter((t: any) => t.type === "sortie")
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-amber-50/30">
      {/* Header - Clean bakery theme */}
      <div className="bg-white border-b border-amber-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left: Store info + Mode Bureau button */}
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-2 rounded-xl">
              <ShoppingBag className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-amber-900">{currentTenant?.name || "KIFSHOP"}</h1>
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <User className="h-3.5 w-3.5" />
                <span>{currentUser?.name || "Caissier"}</span>
              </div>
            </div>

            {/* Mode Bureau button - in header left, far from payment buttons */}
            <Button
              onClick={() => {
                localStorage.setItem("treasury-view-mode", "desktop")
                window.location.reload()
              }}
              variant="outline"
              size="sm"
              className="gap-2 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <Settings className="h-4 w-4" />
              <span>Mode Bureau</span>
            </Button>
          </div>

          {/* Center: Modern Clock */}
          <div className="flex items-center gap-1.5 bg-white border border-amber-200 px-4 py-2 rounded-2xl shadow-sm">
            {currentTime ? (() => {
              const parts = currentTime.split(":")
              return (
                <>
                  <span className="text-2xl font-bold tabular-nums text-amber-900 tracking-tight">{parts[0]}</span>
                  <span className="text-xl font-light text-amber-400 animate-pulse">:</span>
                  <span className="text-2xl font-bold tabular-nums text-amber-900 tracking-tight">{parts[1]}</span>
                  <span className="text-xl font-light text-amber-400 animate-pulse">:</span>
                  <span className="text-xl font-semibold tabular-nums text-amber-500 tracking-tight">{parts[2]}</span>
                  <div className="ml-2 flex flex-col items-start leading-none">
                    <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">
                      {new Date().toLocaleDateString("fr-TN", { weekday: "short" })}
                    </span>
                    <span className="text-[10px] text-amber-400">
                      {new Date().toLocaleDateString("fr-TN", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                </>
              )
            })() : <span className="text-2xl font-bold text-amber-300">--:--:--</span>}
          </div>

          {/* Right: Stats & Actions */}
          <div className="flex items-center gap-3">
            {/* Today's stats */}
            <div className="flex items-center gap-4 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-emerald-700">{formatCurrency(todayIncome)}</span>
              </div>
              <div className="w-px h-6 bg-emerald-200" />
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="font-bold text-red-600">{formatCurrency(todayExpense)}</span>
              </div>
            </div>

            {/* Drawer button */}
            <Button 
              variant="outline"
              onClick={openDrawer}
              className="h-11 px-4 border-amber-300 hover:bg-amber-100 text-amber-800"
            >
              <Unlock className="h-4 w-4 mr-2" />
              Tiroir
            </Button>

            {/* Refresh */}
            <Button 
              variant="outline"
              onClick={() => refreshProducts()}
              className="h-11 w-11 p-0 border-amber-300 hover:bg-amber-100 text-amber-800"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Products section */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-xl"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "h-11 px-5 rounded-full font-medium transition-all",
                selectedCategory === null 
                  ? "bg-amber-600 hover:bg-amber-700 text-white" 
                  : "border-amber-300 text-amber-800 hover:bg-amber-100"
              )}
            >
              Tous
            </Button>
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "h-11 px-5 rounded-full font-medium transition-all",
                  selectedCategory === cat 
                    ? "bg-amber-600 hover:bg-amber-700 text-white" 
                    : "border-amber-300 text-amber-800 hover:bg-amber-100"
                )}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Products grid - with proper scrolling */}
          <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: "calc(100vh - 280px)" }}>
            {productsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-amber-600">
                <Package className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg">Aucun produit trouve</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredProducts.map((product: any) => {
                  const productPrice = product.sellingPrice || product.selling_price || 0
                  const productImage = product.imageUrl || product.image_url
                  const inCart = cart.find(item => item.id === product.id)
                  
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={cn(
                        "group relative bg-white rounded-2xl p-3 text-left transition-all duration-200",
                        "border-2 hover:shadow-lg active:scale-[0.98]",
                        inCart 
                          ? "border-amber-500 shadow-md ring-2 ring-amber-200" 
                          : "border-amber-100 hover:border-amber-300"
                      )}
                    >
                      {/* Quantity badge */}
                      {inCart && (
                        <div className="absolute -top-2 -right-2 bg-amber-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10">
                          {inCart.quantity}
                        </div>
                      )}

                      {/* Product image */}
                      <div className="aspect-square mb-2 rounded-xl overflow-hidden bg-amber-50">
                        {productImage ? (
                          <img
                            src={productImage}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-amber-300">
                            <ImageIcon className="h-10 w-10 mb-1" />
                            <span className="text-xs">Pas d'image</span>
                          </div>
                        )}
                      </div>

                      {/* Product info */}
                      <h3 className="font-semibold text-sm text-amber-900 line-clamp-2 min-h-[2.5rem]">
                        {product.name}
                      </h3>
                      <p className="text-amber-700 font-bold text-base mt-1">
                        {formatCurrency(productPrice)} <span className="text-xs font-normal">TND</span>
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart section */}
        <div className="w-[380px] bg-white border-l border-amber-200 flex flex-col">
          {/* Cart header */}
          <div className="p-4 border-b border-amber-100 bg-amber-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-amber-700" />
                <h2 className="font-bold text-lg text-amber-900">Panier</h2>
                {cart.length > 0 && (
                  <Badge className="bg-amber-600 text-white">{cart.length}</Badge>
                )}
              </div>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Vider
                </Button>
              )}
            </div>
          </div>

          {/* Cart items */}
          <ScrollArea className="flex-1 p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-amber-400">
                <ShoppingBag className="h-16 w-16 mb-3 opacity-50" />
                <p>Panier vide</p>
                <p className="text-sm mt-1">Cliquez sur un produit pour l'ajouter</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div
                    key={item.id}
                    className="bg-amber-50/50 rounded-xl p-3 border border-amber-100"
                  >
                    <div className="flex items-start gap-3">
                      {/* Image */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-white flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-amber-300">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-amber-900 text-sm line-clamp-1">{item.name}</h4>
                        <p className="text-amber-600 text-sm">{formatCurrency(item.price)} TND</p>
                        
                        {/* Quantity controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg border-amber-300"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center font-bold text-amber-900">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg border-amber-300"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Price & Delete */}
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <span className="font-bold text-amber-900">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Cart footer */}
          <div className="border-t border-amber-200 p-4 bg-amber-50/30">
            {/* Totals */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-amber-700">
                <span>Sous-total</span>
                <span>{formatCurrency(subtotal)} TND</span>
              </div>
              
              {/* Discounts section */}
              {appliedDiscounts.length > 0 && (
                <>
                  <div className="bg-amber-50 rounded-lg p-2 space-y-1">
                    {appliedDiscounts.map(discount => (
                      <div key={discount.id} className="flex justify-between text-sm text-red-600">
                        <span>{discount.label}</span>
                        <button
                          onClick={() => setAppliedDiscounts(prev => prev.filter(d => d.id !== discount.id))}
                          className="text-xs hover:text-red-800"
                        >
                          - {discount.type === "percentage" ? `${discount.value}%` : formatCurrency(discount.value)} ✕
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold text-red-700 pt-1 border-t border-amber-200">
                      <span>Total remise</span>
                      <span>-{formatCurrency(discountAmount)} TND</span>
                    </div>
                  </div>
                </>
              )}

              {/* Discount button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => {
                  // Simple preset discounts for quick access
                  const newDiscount = { id: Date.now().toString(), type: "percentage" as const, value: 5, label: "Remise 5%" }
                  setAppliedDiscounts([...appliedDiscounts, newDiscount])
                }}
              >
                + Remise
              </Button>

              <Separator className="bg-amber-200" />
              <div className="flex justify-between text-xl font-bold text-amber-900">
                <span>TOTAL</span>
                <span>{formatCurrency(total)} TND</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Button
                variant="outline"
                className="h-12 border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => lastTransaction && setShowReceiptPreview(true)}
                disabled={!lastTransaction}
              >
                <Receipt className="h-4 w-4 mr-2" />
                Ticket
              </Button>
              <Button
                variant="outline"
                className="h-12 border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={openDrawer}
              >
                <Unlock className="h-4 w-4 mr-2" />
                Tiroir
              </Button>
            </div>

            {/* Payment buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  setPaymentMethod("cash")
                  setShowPaymentDialog(true)
                }}
                disabled={cart.length === 0}
                className="h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Banknote className="h-5 w-5 mr-2" />
                ESPECES
              </Button>
              <Button
                onClick={() => {
                  setPaymentMethod("card")
                  setShowPaymentDialog(true)
                }}
                disabled={cart.length === 0}
                className="h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                CARTE
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-amber-900">
              {paymentMethod === "cash" ? "Paiement en especes" : "Paiement par carte"}
            </DialogTitle>
            <DialogDescription className="text-amber-600">
              Total a payer: <span className="font-bold text-amber-900">{formatCurrency(total)} TND</span>
            </DialogDescription>
          </DialogHeader>

          {paymentMethod === "cash" ? (
            <div className="space-y-4">
              {/* Payment Numpad */}
              <div className="bg-amber-50 rounded-xl p-4">
                <label className="block text-sm font-medium text-amber-700 mb-3">Montant recu</label>
                <div className="text-4xl font-bold text-amber-900 text-center mb-4 font-mono">
                  {cashReceived || "0.000"} TND
                </div>
                <PaymentNumpad
                  amount={cashReceived}
                  onChange={setCashReceived}
                  onSubmit={processPayment}
                  disabled={isProcessing}
                />
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-5 gap-2">
                {quickAmounts.map(amount => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => setCashReceived(amount.toString())}
                    className="h-12 font-bold border-amber-300 text-amber-800 hover:bg-amber-100"
                  >
                    {amount}
                  </Button>
                ))}
              </div>

              {/* Exact amount button */}
              <Button
                variant="outline"
                onClick={() => setCashReceived(total.toFixed(3))}
                className="w-full h-12 border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Exact ({formatCurrency(total)})
              </Button>

              {/* Change display */}
              {cashReceivedNum >= total && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-emerald-600 mb-1">Monnaie</p>
                  <p className="text-3xl font-bold text-emerald-700">{formatCurrency(change)} TND</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="bg-blue-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-12 w-12 text-blue-600" />
              </div>
              <p className="text-lg text-amber-700">Presentez la carte au terminal</p>
              <p className="text-3xl font-bold text-amber-900 mt-2">{formatCurrency(total)} TND</p>
            </div>
          )}

          {/* Confirm button */}
          <Button
            onClick={processPayment}
            disabled={isProcessing || (paymentMethod === "cash" && cashReceivedNum < total)}
            className="w-full h-14 text-lg font-bold bg-amber-600 hover:bg-amber-700 text-white mt-4"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Valider le paiement
              </>
            )}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Receipt Preview Dialog */}
      <Dialog open={showReceiptPreview} onOpenChange={setShowReceiptPreview}>
        <DialogContent className="sm:max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle>Dernier ticket</DialogTitle>
          </DialogHeader>
          {lastTransaction && (
            <div className="bg-amber-50 rounded-xl p-4 font-mono text-sm">
              <div className="text-center border-b border-amber-200 pb-2 mb-2">
                <p className="font-bold">{currentTenant?.name || "KIFSHOP"}</p>
                <p className="text-xs text-amber-600">Ticket #{lastTransaction.id}</p>
              </div>
              {lastTransaction.items.map((item: CartItem) => (
                <div key={item.id} className="flex justify-between py-1">
                  <span className="truncate flex-1">{item.name} x{item.quantity}</span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-amber-200 mt-2 pt-2 font-bold text-lg flex justify-between">
                <span>TOTAL</span>
                <span>{formatCurrency(lastTransaction.total)} TND</span>
              </div>
            </div>
          )}
          <Button
            onClick={() => printReceipt()}
            className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
