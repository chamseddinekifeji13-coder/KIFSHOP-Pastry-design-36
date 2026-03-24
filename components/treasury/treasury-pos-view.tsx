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
import { useSWRConfig } from "swr"
import { useTenant } from "@/lib/tenant-context"
import { useFinishedProducts, useTransactions } from "@/hooks/use-tenant-data"
import { cn } from "@/lib/utils"
import { PaymentNumpad } from "./payment-numpad"
import { SalesHistoryPanel } from "./sales-history-panel"
import { DiscountManager } from "./discount-manager"
import { ProductSearchAdvanced } from "./product-search-advanced"
import { PrinterSettings } from "./printer-settings"
import { getPrinter } from "@/lib/thermal-printer"
import { getQZTrayService } from "@/lib/qz-tray-service"
import { useSoundManager } from "@/lib/sound-manager"

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
  const { data: transactions, mutate: refreshTransactions } = useTransactions()
  const { mutate: globalMutate } = useSWRConfig()
  const soundManager = useSoundManager()

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
  const [lastTransaction, setLastTransaction] = useState<any>(() => {
    if (typeof window === "undefined") return null
    try {
      const stored = localStorage.getItem("pos-last-transaction")
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  
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

  // Auto-check QZ Tray on POS view mount
  useEffect(() => {
    const checkQZTray = async () => {
      const savedMode = localStorage.getItem("printer-mode") || "qz-tray"
      if (savedMode === "qz-tray" || savedMode === "bridge") {
        try {
          const qzService = getQZTrayService()
          const connected = await qzService.connect()
          if (connected) {
            const savedPrinter = localStorage.getItem("qz-printer-name")
            const state = qzService.getState()
            if (savedPrinter && state.printers.includes(savedPrinter)) {
              console.log("[v0] QZ Tray ready with printer:", savedPrinter)
            }
          }
        } catch (e) {
          console.log("[v0] QZ Tray not available")
        }
      }
    }
    // Slight delay to let the page render first
    const timer = setTimeout(checkQZTray, 1500)
    return () => clearTimeout(timer)
  }, [])

  // Get categories from products
  const categories = products
  ? [...new Set((products as any[]).map(p => p.category || p.categoryId || "Autre").filter(Boolean))]
  : []

  // Debug log
  if (products?.length === 0) {
    console.log("[v0] Products array is empty - fetchFinishedProducts returned nothing")
  } else if (products) {
    console.log("[v0] Products loaded:", products.length, "items", products.slice(0, 3).map((p: any) => ({ id: p.id, name: p.name, stock: p.currentStock })))
  }

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
    // Play sound when item added to cart
    soundManager.playAddToCart()
  }, [soundManager])

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

  // Open cash drawer - supports QZ Tray, USB, Network and Windows modes
  const openDrawer = async () => {
    const printerModeStored = localStorage.getItem("printer-mode") || "qz-tray"
    
    try {
      // Mode QZ Tray (recommended - direct printing via QZ Tray application)
      if (printerModeStored === "qz-tray" || printerModeStored === "bridge") {
        const printerName = localStorage.getItem("qz-printer-name") || localStorage.getItem("bridge-printer-name")
        if (!printerName) {
          toast.info("Configurez l'imprimante dans le mode QZ Tray (bouton Imprimante)", { duration: 4000 })
          return
        }
        const qzService = getQZTrayService()
        if (!qzService.isConnected()) {
          const connected = await qzService.connect()
          if (!connected) {
            toast.error("QZ Tray non disponible. Lancez l'application QZ Tray.", { duration: 4000 })
            return
          }
        }
        qzService.selectPrinter(printerName)
        await qzService.openDrawer()
        toast.success("Tiroir-caisse ouvert!")
        return
      }

      // Mode USB
      if (printerModeStored === "usb") {
        const printer = getPrinter()
        if (printer.isConnected()) {
          await printer.openDrawer()
          toast.success("Tiroir-caisse ouvert")
          return
        } else {
          toast.info("Connectez l'imprimante USB via le bouton Imprimante", { duration: 4000 })
          return
        }
      }
      
      // Mode Network
      if (printerModeStored === "network") {
        const printerIp = localStorage.getItem("printer-ip")
        const printerPort = localStorage.getItem("printer-port") || "9100"
        if (!printerIp) {
          toast.info("Configurez l'adresse IP de l'imprimante dans les paramètres", { duration: 4000 })
          return
        }
        const response = await fetch("/api/treasury/esc-pos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "open_drawer", printerIp, printerPort: parseInt(printerPort) })
        })
        const data = await response.json()
        if (!response.ok || !data.success) throw new Error(data.error || "Erreur ouverture tiroir")
        if (data.mode === "demo") toast.info(data.message)
        else toast.success("Tiroir-caisse ouvert!")
        return
      }
      
      // Mode Windows - Cannot open drawer programmatically
      toast.info("Mode Windows: le tiroir ne s'ouvre pas automatiquement. Utilisez le mode Bridge.", { duration: 5000 })
      
    } catch (error: any) {
      toast.error(error.message || "Erreur ouverture tiroir")
    }
  }

  // Print receipt - checks printer mode (qz-tray/windows/usb/network)
  const printReceipt = async (transactionData?: any) => {
    const data = transactionData || lastTransaction
    if (!data) return

    const printerModeStored = localStorage.getItem("printer-mode") || "qz-tray"
    const printer = getPrinter()

    // Mode QZ Tray (recommended) - sends raw ESC/POS + opens drawer for cash payments
    if (printerModeStored === "qz-tray" || printerModeStored === "bridge") {
      const printerName = localStorage.getItem("qz-printer-name") || localStorage.getItem("bridge-printer-name")
      if (printerName) {
        try {
          const qzService = getQZTrayService()
          if (!qzService.isConnected()) {
            const connected = await qzService.connect()
            if (!connected) {
              toast.error("QZ Tray non disponible - impression navigateur utilisée")
              // Fall through to browser print
            }
          }
          
          if (qzService.isConnected()) {
            qzService.selectPrinter(printerName)
            const isCash = (data.paymentMethod || paymentMethod) === "cash"
            
            const receiptData = {
              storeName: currentTenant?.name || "KIFSHOP PASTRY",
              cashierName: currentUser?.name || "Caissier",
              items: (data.items || cart).map((item: any) => ({
                name: item.name,
                qty: item.quantity,
                price: item.price,
              })),
              subtotal: data.subtotal || subtotal,
              discount: discountAmount > 0 ? discountAmount : undefined,
              total: data.total || total,
              paymentMethod: isCash ? "Espèces" : "Carte bancaire",
              amountPaid: data.cashReceived,
              change: data.change,
              transactionId: data.id || Date.now().toString().slice(-6),
              date: new Date(),
            }
            
            if (isCash) {
              await qzService.printAndOpenDrawer(receiptData)
              toast.success("Ticket imprimé + tiroir ouvert!")
            } else {
              await qzService.printReceipt(receiptData)
              toast.success("Ticket imprimé!")
            }
            return
          }
        } catch (err: any) {
          console.error("[QZ Tray] Print error:", err)
          toast.error("QZ Tray erreur - impression navigateur utilisée")
          // Fall through to browser print
        }
      }
    }

    // Mode USB - Try WebUSB thermal printer
    if (printerModeStored === "usb" && printer.isConnected()) {
      try {
        const receiptData = {
          storeName: currentTenant?.name || "KIFSHOP",
          cashierName: currentUser?.name || "Caissier",
          items: (data.items || cart).map((item: any) => ({
            name: item.name,
            qty: item.quantity,
            price: item.price
          })),
          subtotal: data.subtotal || subtotal,
          discount: discountAmount > 0 ? discountAmount : undefined,
          total: data.total || total,
          paymentMethod: data.paymentMethod === "cash" ? "Especes" : "Carte bancaire",
          amountPaid: data.cashReceived,
          change: data.change,
          transactionId: data.id || Date.now().toString().slice(-6),
          date: new Date()
        }
        
        console.log("[v0] Printing receipt with data:", receiptData)
        
        await printer.printReceipt(receiptData)
        toast.success("Ticket imprime!")
        return
      } catch (error: any) {
        console.log("[v0] USB print error:", error.message)
        toast.error("Erreur impression thermique, utilisation du navigateur")
      }
    }
    
    // Mode Network - Send to network printer via API
    if (printerModeStored === "network") {
      const printerIp = localStorage.getItem("printer-ip")
      const printerPort = localStorage.getItem("printer-port") || "9100"
      
      if (printerIp) {
        try {
          const response = await fetch("/api/treasury/esc-pos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "print_receipt",
              printerIp,
              printerPort: parseInt(printerPort),
              items: (data.items || cart).map((item: any) => ({
                name: item.name,
                qty: item.quantity,
                price: item.price
              })),
              total: data.total || total,
              cashierName: currentUser?.name || "Caissier",
              paymentMethod: data.paymentMethod === "cash" ? "Especes" : "Carte bancaire",
              amountPaid: data.cashReceived,
              change: data.change
            })
          })
          
          const result = await response.json()
          if (result.success) {
            toast.success("Ticket imprime via reseau!")
            return
          }
        } catch (error) {
          toast.error("Erreur impression reseau, utilisation du navigateur")
        }
      }
    }

    // Mode Windows or Fallback - Use browser print with POS80 driver
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

    // Try to open print window
    const printWindow = window.open("", "_blank", "width=300,height=600")
    if (printWindow) {
      printWindow.document.write(receiptHTML)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        setTimeout(() => printWindow.close(), 500)
      }, 250)
    } else {
      // Popup blocked - use iframe method
      toast.info("Popup bloque - utilisation de la methode alternative", { duration: 2000 })
      const iframe = document.createElement("iframe")
      iframe.style.position = "fixed"
      iframe.style.right = "0"
      iframe.style.bottom = "0"
      iframe.style.width = "0"
      iframe.style.height = "0"
      iframe.style.border = "none"
      document.body.appendChild(iframe)
      
      const iframeDoc = iframe.contentWindow?.document
      if (iframeDoc) {
        iframeDoc.open()
        iframeDoc.write(receiptHTML)
        iframeDoc.close()
        
        setTimeout(() => {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
          setTimeout(() => document.body.removeChild(iframe), 1000)
        }, 250)
      }
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
        const errorData = await response.json()
        console.log("[v0] API error response:", errorData)
        throw new Error(errorData.details || errorData.error || "Erreur lors de l'enregistrement")
      }

      const result = await response.json()
      console.log("[v0] Sale recorded successfully:", result)

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
      try { localStorage.setItem("pos-last-transaction", JSON.stringify(transactionData)) } catch {}

      // Open drawer for cash payments
      if (paymentMethod === "cash") {
        await openDrawer()
        // Play drawer sound
        soundManager.playDrawerOpen()
      }

      // Print receipt
      await printReceipt(transactionData)

      // Success sound
      soundManager.playSuccess()

      // Revalidate SWR cache to sync dashboard
      await refreshTransactions()
      // Also invalidate orders and dashboard-related caches
      globalMutate((key) => typeof key === "string" && (
        key.includes("transactions") || 
        key.includes("orders") || 
        key.includes(currentTenant.id)
      ), undefined, { revalidate: true })

      // Success
      toast.success("Vente enregistree!")
      clearCart()
      setCashReceived("")
      setShowPaymentDialog(false)

    } catch (error: any) {
      soundManager.playError()
      toast.error(error.message || "Erreur lors du paiement")
    } finally {
      setIsProcessing(false)
    }
  }

  // Today's stats
  const today = new Date().toLocaleDateString("fr-CA") // YYYY-MM-DD format
  const todayTransactions = (transactions || []).filter((t: any) => {
    return t.createdAt?.startsWith(today)
  })
  
  const todayIncome = todayTransactions
    .filter((t: any) => t.type === "entree")
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
  
  const todayExpense = todayTransactions
    .filter((t: any) => t.type === "sortie")
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-[#1a1a1a]">
      {/* Header - Premium dark theme */}
      <div className="bg-[#0f0f0f] border-b border-[#2a2a2a] px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Store info + Mode Bureau button */}
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-2.5 rounded-xl shadow-lg shadow-amber-500/20">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">{currentTenant?.name || "KIFSHOP"}</h1>
              <div className="flex items-center gap-2 text-sm text-amber-400/80">
                <User className="h-3.5 w-3.5" />
                <span>{currentUser?.name || "Caissier"}</span>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Gerant</Badge>
              </div>
            </div>

            {/* Mode Bureau button */}
            <Button
              onClick={() => {
                localStorage.setItem("treasury-view-mode", "desktop")
                window.location.reload()
              }}
              variant="outline"
              size="sm"
              className="gap-2 border-[#3a3a3a] bg-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#3a3a3a] hover:border-[#4a4a4a]"
            >
              <Settings className="h-4 w-4" />
              <span>Mode Bureau</span>
            </Button>
          </div>

          {/* Center: Premium Clock */}
          <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#3a3a3a] px-5 py-2.5 rounded-2xl">
            {currentTime ? (() => {
              const parts = currentTime.split(":")
              return (
                <>
                  <span className="text-3xl font-bold tabular-nums text-white tracking-tight">{parts[0]}</span>
                  <span className="text-2xl font-light text-amber-500 animate-pulse">:</span>
                  <span className="text-3xl font-bold tabular-nums text-white tracking-tight">{parts[1]}</span>
                  <span className="text-2xl font-light text-amber-500 animate-pulse">:</span>
                  <span className="text-2xl font-semibold tabular-nums text-gray-400 tracking-tight">{parts[2]}</span>
                  <div className="ml-3 pl-3 border-l border-[#3a3a3a] flex flex-col items-start leading-none">
                    <span className="text-xs font-semibold text-amber-500 uppercase tracking-widest">
                      {new Date().toLocaleDateString("fr-TN", { weekday: "short" })}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date().toLocaleDateString("fr-TN", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                </>
              )
            })() : <span className="text-2xl font-bold text-gray-600">--:--:--</span>}
          </div>

          {/* Right: Stats & Actions */}
          <div className="flex items-center gap-3">
            {/* Today's stats */}
            <div className="flex items-center gap-4 bg-[#1a1a1a] px-4 py-2.5 rounded-xl border border-[#2a2a2a]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="font-bold text-emerald-400">{formatCurrency(todayIncome)}</span>
              </div>
              <div className="w-px h-6 bg-[#3a3a3a]" />
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-500/10 rounded-lg">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                </div>
                <span className="font-bold text-red-400">{formatCurrency(todayExpense)}</span>
              </div>
            </div>

            {/* Printer settings */}
            <PrinterSettings />

            {/* Drawer button */}
            <Button 
              variant="outline"
              onClick={openDrawer}
              className="h-11 px-4 border-[#3a3a3a] bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 hover:text-white"
            >
              <Unlock className="h-4 w-4 mr-2" />
              Tiroir
            </Button>

            {/* Refresh */}
            <Button 
              variant="outline"
              onClick={() => refreshProducts()}
              className="h-11 w-11 p-0 border-[#3a3a3a] bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 hover:text-white"
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg bg-[#252525] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl"
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
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/20" 
                  : "border-[#3a3a3a] bg-[#252525] text-gray-300 hover:bg-[#3a3a3a] hover:text-white"
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
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/20" 
                    : "border-[#3a3a3a] bg-[#252525] text-gray-300 hover:bg-[#3a3a3a] hover:text-white"
                )}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Products grid */}
          <div className="flex-1 overflow-y-auto pr-2 max-h-[calc(100vh-280px)]">
            {productsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
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
                        "group relative bg-[#252525] rounded-2xl p-3 text-left transition-all duration-200",
                        "border-2 hover:shadow-xl active:scale-[0.98]",
                        inCart 
                          ? "border-amber-500 shadow-lg shadow-amber-500/20 ring-1 ring-amber-500/50" 
                          : "border-[#3a3a3a] hover:border-[#4a4a4a] hover:shadow-lg hover:shadow-black/20"
                      )}
                    >
                      {/* Quantity badge */}
                      {inCart && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-500 to-amber-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10">
                          {inCart.quantity}
                        </div>
                      )}

                      {/* Product image */}
                      <div className="aspect-square mb-2 rounded-xl overflow-hidden bg-[#1a1a1a]">
                        {productImage ? (
                          <img
                            src={productImage}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-amber-500/50">
                            <ImageIcon className="h-10 w-10 mb-1" />
                            <span className="text-xs text-gray-600">Pas d'image</span>
                          </div>
                        )}
                      </div>

                      {/* Product info */}
                      <h3 className="font-semibold text-sm text-white line-clamp-2 min-h-[2.5rem]">
                        {product.name}
                      </h3>
                      <p className="text-amber-400 font-bold text-base mt-1">
                        {formatCurrency(productPrice)} <span className="text-xs font-normal text-gray-500">TND</span>
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart section */}
        <div className="w-[380px] bg-[#0f0f0f] border-l border-[#2a2a2a] flex flex-col h-full max-h-full overflow-hidden">
          {/* Cart header */}
          <div className="p-4 border-b border-[#2a2a2a] shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-amber-500" />
                <h2 className="font-bold text-lg text-white">Panier</h2>
                {cart.length > 0 && (
                  <Badge className="bg-amber-500 text-white">{cart.length}</Badge>
                )}
              </div>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Vider
                </Button>
              )}
            </div>
          </div>

          {/* Cart items - scrollable area */}
          <ScrollArea className="flex-1 min-h-0 p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <ShoppingBag className="h-16 w-16 mb-3 opacity-30 text-amber-500" />
                <p className="text-amber-500/80">Panier vide</p>
                <p className="text-sm mt-1 text-gray-600">Cliquez sur un produit pour l'ajouter</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div
                    key={item.id}
                    className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]"
                  >
                    <div className="flex items-start gap-3">
                      {/* Image */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#252525] flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white text-sm line-clamp-1">{item.name}</h4>
                        <p className="text-gray-400 text-sm">{formatCurrency(item.price)} TND</p>
                        
                        {/* Quantity controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg border-[#3a3a3a] bg-[#252525] text-white hover:bg-[#3a3a3a]"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center font-bold text-white">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg border-[#3a3a3a] bg-[#252525] text-white hover:bg-[#3a3a3a]"
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
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <span className="font-bold text-amber-400">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Cart footer - fixed at bottom */}
          <div className="border-t border-[#2a2a2a] p-4 bg-[#0a0a0a] shrink-0">
            {/* Totals */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-400">
                <span>Sous-total</span>
                <span>{formatCurrency(subtotal)} TND</span>
              </div>
              
              {/* Discounts section */}
              {appliedDiscounts.length > 0 && (
                <>
                  <div className="bg-red-500/10 rounded-lg p-2 space-y-1 border border-red-500/20">
                    {appliedDiscounts.map(discount => (
                      <div key={discount.id} className="flex justify-between text-sm text-red-400">
                        <span>{discount.label}</span>
                        <button
                          onClick={() => setAppliedDiscounts(prev => prev.filter(d => d.id !== discount.id))}
                          className="text-xs hover:text-red-300"
                        >
                          - {discount.type === "percentage" ? `${discount.value}%` : formatCurrency(discount.value)} x
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold text-red-400 pt-1 border-t border-red-500/20">
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
                className="w-full text-xs border-[#3a3a3a] bg-[#1a1a1a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
                onClick={() => {
                  const newDiscount = { id: Date.now().toString(), type: "percentage" as const, value: 5, label: "Remise 5%" }
                  setAppliedDiscounts([...appliedDiscounts, newDiscount])
                }}
              >
                + Remise
              </Button>

              <Separator className="bg-[#2a2a2a]" />
              <div className="flex justify-between text-xl font-bold text-white">
                <span>TOTAL</span>
                <span className="text-amber-400">{formatCurrency(total)} TND</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Button
                variant="outline"
                className="h-12 border-[#3a3a3a] bg-[#1a1a1a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
                onClick={() => lastTransaction && setShowReceiptPreview(true)}
                disabled={!lastTransaction}
              >
                <Receipt className="h-4 w-4 mr-2" />
                Ticket
              </Button>
              <Button
                variant="outline"
                className="h-12 border-[#3a3a3a] bg-[#1a1a1a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
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
                className="h-14 text-base font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20 disabled:opacity-50"
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
                className="h-14 text-base font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50"
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
        <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-[#2a2a2a] flex flex-col max-h-[90dvh] p-0 gap-0">
          {/* Header fixe */}
          <div className="px-5 pt-5 pb-3 border-b border-[#2a2a2a] shrink-0">
            <DialogTitle className="text-xl text-white">
              {paymentMethod === "cash" ? "Paiement en especes" : "Paiement par carte"}
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-0.5">
              Total a payer: <span className="font-bold text-amber-400">{formatCurrency(total)} TND</span>
            </DialogDescription>
          </div>

          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto px-5 py-3">
            {paymentMethod === "cash" ? (
              <div className="space-y-3">
                {/* Payment Numpad */}
                <div className="bg-[#252525] rounded-xl p-3 border border-[#3a3a3a]">
                  <label className="block text-xs font-medium text-gray-400 mb-2">Montant recu</label>
                  <div className="text-3xl font-bold text-amber-400 text-center mb-3 font-mono">
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
                <div className="grid grid-cols-5 gap-1.5">
                  {quickAmounts.map(amount => (
                    <Button
                      key={amount}
                      variant="outline"
                      onClick={() => setCashReceived(amount.toString())}
                      className="h-10 font-bold border-[#3a3a3a] bg-[#252525] text-white hover:bg-[#3a3a3a] text-sm"
                    >
                      {amount}
                    </Button>
                  ))}
                </div>

                {/* Exact amount button */}
                <Button
                  variant="outline"
                  onClick={() => setCashReceived(total.toFixed(3))}
                  className="w-full h-10 border-[#3a3a3a] bg-[#252525] text-white hover:bg-[#3a3a3a]"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Exact ({formatCurrency(total)})
                </Button>

                {/* Change display */}
                {cashReceivedNum >= total && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-emerald-400 mb-0.5">Monnaie</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(change)} TND</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center">
                <div className="bg-blue-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                  <CreditCard className="h-10 w-10 text-blue-400" />
                </div>
                <p className="text-lg text-gray-400">Presentez la carte au terminal</p>
                <p className="text-3xl font-bold text-white mt-2">{formatCurrency(total)} TND</p>
              </div>
            )}
          </div>

          {/* Bouton validation toujours visible en bas */}
          <div className="px-5 pb-5 pt-3 border-t border-[#2a2a2a] shrink-0">
            <Button
              onClick={processPayment}
              disabled={isProcessing || (paymentMethod === "cash" && cashReceivedNum < total)}
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/20"
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Preview Dialog */}
      <Dialog open={showReceiptPreview} onOpenChange={setShowReceiptPreview}>
        <DialogContent className="sm:max-w-sm bg-[#1a1a1a] border-[#2a2a2a]">
          <DialogHeader>
            <DialogTitle className="text-white">Dernier ticket</DialogTitle>
          </DialogHeader>
          {lastTransaction && (
            <div className="bg-[#252525] rounded-xl p-4 font-mono text-sm border border-[#3a3a3a]">
              <div className="text-center border-b border-[#3a3a3a] pb-2 mb-2">
                <p className="font-bold text-white">{currentTenant?.name || "KIFSHOP"}</p>
                <p className="text-xs text-gray-500">Ticket #{lastTransaction.id}</p>
              </div>
              {lastTransaction.items.map((item: CartItem) => (
                <div key={item.id} className="flex justify-between py-1 text-gray-300">
                  <span className="truncate flex-1">{item.name} x{item.quantity}</span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-[#3a3a3a] mt-2 pt-2 font-bold text-lg flex justify-between">
                <span className="text-white">TOTAL</span>
                <span className="text-amber-400">{formatCurrency(lastTransaction.total)} TND</span>
              </div>
            </div>
          )}
          <Button
            onClick={() => printReceipt()}
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/20"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
