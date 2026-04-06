"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import {
  Plus, MessageCircle, Globe, Store, Phone, CreditCard,
  Clock, Truck, MapPin, Package, Instagram, History, CheckCircle2,
  ArrowRight, AlertCircle, Loader2, Banknote, Wallet, Trash2,
  Building2, RotateCcw, FileWarning, Check, XCircle,
  FileText, Download, Printer, Eye, Gift, Users, User, Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useTenant } from "@/lib/tenant-context"
import { useI18n } from "@/lib/i18n/context"
import {
  fetchOrders, updateOrderStatus,
  getOrderStatusHistory, getPaymentCollections,
  recordPaymentCollection, deletePaymentCollection,
  exportOrdersToCSV, resetOrderCounter, getOrderCounter,
  type Order, type StatusHistoryEntry, type PaymentCollection,
  type PaymentMethod, type CollectedBy,
} from "@/lib/orders/actions"
import { fetchActiveDeliveryCompanies } from "@/lib/delivery-companies/actions"
// Note: QuickOrder and NewOrderDrawer are replaced by UnifiedOrderDialog
import {
  createReturn, getOrderReturns, processReturn,
  fetchReturns, fetchCustomerCredits,
  type OrderReturn, type CustomerCredit, type ReturnType, type ReturnReason, type RefundMethod,
  type ReturnItem, reasonLabels, statusLabels as returnStatusLabels,
  refundMethodLabels,
} from "@/lib/orders/returns-actions"
import {
  generateDocument, getOrderInvoices, fetchInvoices,
  type Invoice, type DocumentType,
} from "@/lib/orders/invoice-actions"
import { InvoicePreview } from "./invoice-preview"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { UnifiedOrderDialog } from "./unified-order-dialog"
import { exportToCSV } from "@/lib/csv-export"
import { FastSalesView } from "./fast-sales-view"
import { SendToDeliveryDialog } from "./send-to-delivery-dialog"
import { DeliveryExportDialog } from "./delivery-export-dialog"

const statusConfig: Record<string, { label: string; color: string }> = {
  nouveau: { label: "Nouveau", color: "bg-blue-500" },
  "en-preparation": { label: "En preparation", color: "bg-warning" },
  pret: { label: "Pret", color: "bg-primary" },
  "en-livraison": { label: "En livraison", color: "bg-orange-500" },
  livre: { label: "Livre / Vendu", color: "bg-muted" },
  annule: { label: "Annule", color: "bg-destructive" },
}

const courierNames: Record<string, string> = {
  aramex: "Aramex",
  rapidpost: "Rapid Poste",
  express: "Tunisia Express",
  stafim: "Stafim",
  autre: "Autre coursier",
}

const sourceIcons: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  phone: Phone,
  web: Globe,
  instagram: Instagram,
  tiktok: Globe,
  comptoir: Store,
}

const historyLabels: Record<string, string> = {
  nouveau: "Commande creee",
  "en-preparation": "Preparation demarree",
  pret: "Commande prete",
  "en-livraison": "Expediee",
  livre: "Livree / Vendue",
  "paiement-complet": "Paiement complet",
  "paiement-partiel": "Acompte enregistre",
  "retour-total": "Retour total demande",
  "retour-partial": "Retour partiel demande",
  "retour-approved": "Retour approuve",
  "retour-rejected": "Retour rejete",
  "retour-completed": "Retour finalise",
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Especes",
  card: "Carte bancaire",
  bank_transfer: "Virement bancaire",
  check: "Cheque",
  cod_courier: "Contre-remboursement",
}

const collectedByLabels: Record<CollectedBy, string> = {
  direct: "Encaissement direct",
  courier: "Via livreur",
  online: "En ligne",
}

const paymentMethodIcons: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  card: CreditCard,
  bank_transfer: Building2,
  check: Wallet,
  cod_courier: Truck,
}

export function OrdersView() {
  const { currentTenant, currentUser, isLoading: tenantLoading } = useTenant()
  const { t } = useI18n()
  const searchParams = useSearchParams()

  // View mode: standard or fast-sales
  const [viewMode, setViewMode] = useState<"standard" | "fast">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("orders-view-mode")
      return saved === "fast" ? "fast" : "standard"
    }
    return "standard"
  })

  // ALL hooks must be declared before any conditional return
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [deliveryExportOpen, setDeliveryExportOpen] = useState(false)
  const [isApiExporting, setIsApiExporting] = useState(false)

  // Payment collection state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [collections, setCollections] = useState<PaymentCollection[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash")
  const [payCollectedBy, setPayCollectedBy] = useState<CollectedBy>("direct")
  const [payCollectorName, setPayCollectorName] = useState("")
  const [payReference, setPayReference] = useState("")
  const [payNotes, setPayNotes] = useState("")

  // Return state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [orderReturns, setOrderReturns] = useState<OrderReturn[]>([])
  const [returnsLoading, setReturnsLoading] = useState(false)
  const [returnType, setReturnType] = useState<ReturnType>("total")
  const [returnReason, setReturnReason] = useState<ReturnReason>("damaged")
  const [returnReasonDetails, setReturnReasonDetails] = useState("")
  const [returnRefundMethod, setReturnRefundMethod] = useState<RefundMethod>("cash_refund")
  const [returnNotes, setReturnNotes] = useState("")
  const [returnItems, setReturnItems] = useState<{ idx: number; qty: number }[]>([])

  // Invoice / Document state
  const [orderDocuments, setOrderDocuments] = useState<Invoice[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [generatingDoc, setGeneratingDoc] = useState<DocumentType | null>(null)

  // Order counter reset
  const [resetCounterDialogOpen, setResetCounterDialogOpen] = useState(false)
  const [resettingCounter, setResettingCounter] = useState(false)

  // Send to delivery provider state
  const [sendToDeliveryOpen, setSendToDeliveryOpen] = useState(false)

  const isDemoTenant = !tenantLoading && currentTenant.id === "__fallback__"

  // SWR fetcher for orders
  const { data: orders = [], mutate, isLoading } = useSWR(
    isDemoTenant ? null : ["orders", currentTenant.id],
    () => fetchOrders(currentTenant.id),
    { refreshInterval: 30000, revalidateOnFocus: false }
  )

  // SWR for all returns
  const { data: allReturns = [], mutate: mutateReturns, isLoading: returnsListLoading } = useSWR(
    isDemoTenant ? null : ["returns", currentTenant.id],
    () => fetchReturns(currentTenant.id),
    { revalidateOnFocus: false }
  )

  // SWR for customer credits
  const { data: customerCredits = [], mutate: mutateCredits, isLoading: creditsLoading } = useSWR(
    isDemoTenant ? null : ["credits", currentTenant.id],
    () => fetchCustomerCredits(currentTenant.id),
    { revalidateOnFocus: false }
  )

  // SWR for all invoices/documents
  const { data: allDocuments = [], mutate: mutateDocuments, isLoading: documentsListLoading } = useSWR(
    isDemoTenant ? null : ["invoices", currentTenant.id],
    () => fetchInvoices(currentTenant.id),
    { revalidateOnFocus: false }
  )

  // SWR for delivery companies (for name mapping)
  const { data: deliveryCompanies = [] } = useSWR(
    isDemoTenant ? null : ["deliveryCompanies", currentTenant.id],
    () => fetchActiveDeliveryCompanies(currentTenant.id),
    { revalidateOnFocus: false }
  )

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setNewOrderOpen(true)
    }
  }, [searchParams])

  // Create a mapping from delivery company UUID to name for display
  const courierNameMap = useMemo(() => {
    const map: Record<string, string> = { ...courierNames }
    deliveryCompanies.forEach(company => {
      map[company.id] = company.name
    })
    return map
  }, [deliveryCompanies])

  // ALL useCallback hooks MUST be before any conditional return (React rules of hooks)
  const loadHistory = useCallback(async (orderId: string) => {
    setHistoryLoading(true)
    const history = await getOrderStatusHistory(orderId)
    setStatusHistory(history)
    setHistoryLoading(false)
  }, [])

  const loadCollections = useCallback(async (orderId: string) => {
    setCollectionsLoading(true)
    const data = await getPaymentCollections(orderId)
    setCollections(data)
    setCollectionsLoading(false)
  }, [])

  const loadReturns = useCallback(async (orderId: string) => {
    setReturnsLoading(true)
    const data = await getOrderReturns(orderId)
    setOrderReturns(data)
    setReturnsLoading(false)
  }, [])

  const loadDocuments = useCallback(async (orderId: string) => {
    setDocumentsLoading(true)
    const docs = await getOrderInvoices(orderId)
    setOrderDocuments(docs)
    setDocumentsLoading(false)
  }, [])

  // Toggle view mode function
  const toggleViewMode = useCallback(() => {
    const newMode = viewMode === "fast" ? "standard" : "fast"
    setViewMode(newMode)
    localStorage.setItem("orders-view-mode", newMode)
  }, [viewMode])

  // Reset order counter
  const handleResetCounter = useCallback(async () => {
    setResettingCounter(true)
    const ok = await resetOrderCounter(currentTenant.id)
    if (ok) {
      toast.success("Compteur remis a zero", {
        description: "Le prochain numero de commande sera CMD-001",
      })
      setResetCounterDialogOpen(false)
    } else {
      toast.error("Erreur lors de la remise a zero du compteur")
    }
    setResettingCounter(false)
  }, [currentTenant.id])

  // Fast sales mode - rendered but hidden when not active (avoids React #300 hook order issues)
  // The early return was causing hooks to be called conditionally which violates React rules
  
  const ordersByStatus = {
    nouveau: orders.filter((o) => o.status === "nouveau"),
    "en-preparation": orders.filter((o) => o.status === "en-preparation"),
    pret: orders.filter((o) => o.status === "pret"),
    "en-livraison": orders.filter((o) => o.status === "en-livraison"),
    livre: orders.filter((o) => o.status === "livre"),
    annule: orders.filter((o) => o.status === "annule"),
  }

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order)
    setSheetOpen(true)
    loadHistory(order.id)
    loadCollections(order.id)
    loadReturns(order.id)
    loadDocuments(order.id)
  }

  const handleExportOrders = async () => {
    if (orders.length === 0) {
      toast.error("Aucune commande à exporter")
      return
    }

    setIsExporting(true)
    try {
      const { headers, data } = await exportOrdersToCSV(currentTenant.id)
      exportToCSV({ filename: "commandes", headers, data })
      toast.success("Commandes exportées avec succès")
    } catch (error) {
      console.error("Error exporting orders:", error)
      toast.error("Erreur lors de l'export des commandes")
    } finally {
      setIsExporting(false)
    }
  }

  const handleStatusChange = async (newStatus: Order["status"], note?: string) => {
    if (!selectedOrder || actionLoading) return
    setActionLoading(true)

    const ok = await updateOrderStatus(
      selectedOrder.id,
      currentTenant.id,
      newStatus,
      note
    )

    if (ok) {
      toast.success("Statut mis a jour", {
        description: `Commande -> ${statusConfig[newStatus].label}`,
      })
      // Optimistic update
      setSelectedOrder({ ...selectedOrder, status: newStatus })
      mutate()
      loadHistory(selectedOrder.id)
    } else {
      toast.error("Erreur lors de la mise a jour")
    }
    setActionLoading(false)
  }

  const handleExportToDeliveryApi = async () => {
    if (!selectedOrder || isApiExporting) return
    if (selectedOrder.deliveryType !== "delivery") {
      toast.error("Cette commande n'est pas en mode livraison")
      return
    }

    setIsApiExporting(true)
    try {
      const res = await fetch("/api/delivery/export-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: selectedOrder.id }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const details =
          typeof data?.details === "string"
            ? data.details
            : data?.error || "Erreur export API"
        throw new Error(details)
      }

      toast.success("Commande exportee vers l'API livraison")
      mutate()
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur export API"
      toast.error(msg)
    } finally {
      setIsApiExporting(false)
    }
  }

  const openPaymentDialog = () => {
    if (!selectedOrder) return
    const remaining = selectedOrder.total - selectedOrder.deposit
    setPayAmount(remaining > 0 ? remaining.toString() : "")
    setPayMethod("cash")
    setPayCollectedBy("direct")
    setPayCollectorName("")
    setPayReference("")
    setPayNotes("")
    setPaymentDialogOpen(true)
  }

  const handleRecordPayment = async () => {
    if (!selectedOrder || actionLoading) return
    const amount = parseFloat(payAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Montant invalide")
      return
    }
    setActionLoading(true)

    const ok = await recordPaymentCollection({
      orderId: selectedOrder.id,
      tenantId: currentTenant.id,
      amount,
      paymentMethod: payMethod,
      collectedBy: payCollectedBy,
      collectorName: payCollectorName || undefined,
      reference: payReference || undefined,
      notes: payNotes || undefined,
    })

    if (ok) {
      const newDeposit = selectedOrder.deposit + amount
      const newStatus: Order["paymentStatus"] =
        newDeposit >= selectedOrder.total
          ? "paid"
          : newDeposit > 0
            ? "partial"
            : "unpaid"
      toast.success("Encaissement enregistre", {
        description: `${amount.toLocaleString("fr-TN")} TND - ${paymentMethodLabels[payMethod]}`,
      })
      setSelectedOrder({ ...selectedOrder, paymentStatus: newStatus, deposit: newDeposit })
      setPaymentDialogOpen(false)
      mutate()
      loadHistory(selectedOrder.id)
      loadCollections(selectedOrder.id)
    } else {
      toast.error("Erreur lors de l'encaissement")
    }
    setActionLoading(false)
  }

  const handleDeleteCollection = async (collection: PaymentCollection) => {
    if (!selectedOrder || actionLoading) return
    setActionLoading(true)

    const ok = await deletePaymentCollection(collection.id, selectedOrder.id, currentTenant.id)
    if (ok) {
      toast.success("Encaissement supprime")
      const newDeposit = Math.max(0, selectedOrder.deposit - collection.amount)
      const newStatus = newDeposit >= selectedOrder.total ? "paid" : newDeposit > 0 ? "partial" : "unpaid"
      setSelectedOrder({ ...selectedOrder, paymentStatus: newStatus as Order["paymentStatus"], deposit: newDeposit })
      mutate()
      loadCollections(selectedOrder.id)
      loadHistory(selectedOrder.id)
    } else {
      toast.error("Erreur lors de la suppression")
    }
    setActionLoading(false)
  }

  // ─── Return Handlers ───────────────────────────────────────

  const openReturnDialog = () => {
    if (!selectedOrder) return
    setReturnType("total")
    setReturnReason("damaged")
    setReturnReasonDetails("")
    setReturnRefundMethod("cash_refund")
    setReturnNotes("")
    setReturnItems([])
    setReturnDialogOpen(true)
  }

  const toggleReturnItem = (idx: number, checked: boolean) => {
    if (checked) {
      const item = selectedOrder?.items[idx]
      if (item) setReturnItems([...returnItems, { idx, qty: item.quantity }])
    } else {
      setReturnItems(returnItems.filter((i) => i.idx !== idx))
    }
  }

  const updateReturnItemQty = (idx: number, qty: number) => {
    setReturnItems(returnItems.map((i) => (i.idx === idx ? { ...i, qty } : i)))
  }

  const handleCreateReturn = async () => {
    if (!selectedOrder || actionLoading) return
    setActionLoading(true)

    const items: ReturnItem[] =
      returnType === "partial"
        ? returnItems.map((ri) => {
            const item = selectedOrder.items[ri.idx]
            return {
              orderItemId: item.id,
              productName: item.name,
              quantityReturned: ri.qty,
              unitPrice: item.price,
              subtotal: ri.qty * item.price,
            }
          })
        : []

    const ok = await createReturn({
      orderId: selectedOrder.id,
      tenantId: currentTenant.id,
      returnType,
      reason: returnReason,
      reasonDetails: returnReasonDetails || undefined,
      refundMethod: returnRefundMethod,
      items: returnType === "partial" ? items : undefined,
      notes: returnNotes || undefined,
    })

    if (ok) {
      toast.success("Retour enregistre", {
        description: `Retour ${returnType === "total" ? "total" : "partiel"} - ${reasonLabels[returnReason]}`,
      })
      setReturnDialogOpen(false)
      mutate()
      mutateReturns()
      loadHistory(selectedOrder.id)
      loadReturns(selectedOrder.id)
    } else {
      toast.error("Erreur lors de la creation du retour")
    }
    setActionLoading(false)
  }

  const handleProcessReturn = async (returnId: string, action: "approved" | "rejected" | "completed") => {
    if (!selectedOrder || actionLoading) return
    setActionLoading(true)

    const ok = await processReturn(returnId, currentTenant.id, action)
    if (ok) {
      const labels = { approved: "approuve", rejected: "rejete", completed: "finalise" }
      toast.success(`Retour ${labels[action]}`)
      loadReturns(selectedOrder.id)
      loadHistory(selectedOrder.id)
      mutate()
      mutateReturns()
      if (action === "completed") mutateCredits()
    } else {
      toast.error("Erreur lors du traitement")
    }
    setActionLoading(false)
  }

  // ─── Document Handlers ────────────────���───────�����───────────

  const handleGenerateDocument = async (type: DocumentType) => {
    if (!selectedOrder || generatingDoc) return
    setGeneratingDoc(type)

    const doc = await generateDocument(selectedOrder, currentTenant.id, type)
    if (doc) {
      const label = type === "invoice" ? "Facture" : "Bon de livraison"
      toast.success(`${label} genere`, { description: doc.documentNumber })
      loadDocuments(selectedOrder.id)
      mutateDocuments()
    } else {
      toast.error("Erreur lors de la generation du document")
    }
    setGeneratingDoc(null)
  }

  const handlePrintDocument = (invoice: Invoice) => {
    setPreviewInvoice(invoice)
    setPreviewOpen(true)

    const tryPrint = (attempts = 0) => {
      const previewEl = document.getElementById("invoice-print-area")

      if (!previewEl) {
        if (attempts < 10) {
          setTimeout(() => tryPrint(attempts + 1), 200)
        } else {
          toast.error("Impossible de charger l'aperçu du document")
        }
        return
      }

      const printWindow = window.open("", "_blank")
      if (!printWindow) {
        toast.error("Popup bloquée. Autorisez les popups pour imprimer.")
        return
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${invoice.documentNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>${previewEl.innerHTML}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    }

    setTimeout(() => tryPrint(), 300)
  }

  const handleDownloadPdf = async (invoice: Invoice) => {
    setPreviewInvoice(invoice)
    setPreviewOpen(true)

    try {
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jsPDFModule

      const waitForElement = (attempts = 0): Promise<HTMLElement> => {
        return new Promise((resolve, reject) => {
          const el = document.getElementById("invoice-print-area")
          if (el) return resolve(el)
          if (attempts >= 10) return reject(new Error("Element introuvable"))
          setTimeout(() => resolve(waitForElement(attempts + 1)), 200)
        })
      }

      const el = await waitForElement()
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${invoice.documentNumber}.pdf`)
    } catch {
      toast.error("Erreur lors du telechargement PDF")
    } finally {
      setPreviewOpen(false)
    }
  }

  const getPaymentBadge = (status: Order["paymentStatus"]) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-primary">Paye</Badge>
      case "partial":
        return <Badge className="bg-warning text-warning-foreground">Acompte</Badge>
      case "unpaid":
        return <Badge variant="destructive">Non paye</Badge>
    }
  }

  const OrderCard = ({ order }: { order: Order }) => {
    const SourceIcon = sourceIcons[order.source] || Store

    return (
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleOrderClick(order)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <SourceIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{order.customerName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {order.orderNumberDisplay && (
                <Badge variant="outline" className="text-[10px] font-mono">
                  {order.orderNumberDisplay}
                </Badge>
              )}
              {getPaymentBadge(order.paymentStatus)}
            </div>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.quantity}x {item.name}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{order.total.toLocaleString("fr-TN")} TND</span>
              {order.deliveryType === "delivery" && (
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
            {order.deliveryDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(order.deliveryDate).toLocaleDateString("fr-TN")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (tenantLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  if (isDemoTenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Mode Demo</h2>
        <p className="text-muted-foreground">Connectez-vous avec un compte patisserie pour gerer vos commandes.</p>
      </div>
    )
  }

  // Render both views - fast sales mode is shown/hidden with CSS to avoid hook order issues
  return (
    <>
      {/* Fast Sales View - always rendered to keep hooks stable, hidden when not active */}
      <div className={viewMode === "fast" ? "block" : "hidden"}>
        <div className="relative">
          <div className="absolute top-0 right-0 z-10 p-4">
            <Button variant="outline" size="sm" onClick={toggleViewMode} className="gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Mode Standard</span>
            </Button>
          </div>
          <FastSalesView />
        </div>
      </div>

      {/* Standard View - hidden when fast mode is active */}
      <div className={viewMode === "standard" ? "block space-y-6" : "hidden"}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("orders.title")}</h1>
            <p className="text-muted-foreground">
              {t("orders.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={toggleViewMode}
          >
            <Zap className="mr-2 h-4 w-4" />
            Mode Vente Rapide
          </Button>
          <Button
            variant="outline"
            onClick={handleExportOrders}
            disabled={isExporting}
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => setDeliveryExportOpen(true)}>
            <Truck className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export livraison</span>
            <span className="sm:hidden">Livraison</span>
          </Button>
          {(currentUser.role === "gerant" || currentUser.role === "owner") && (
            <Button
              variant="outline"
              onClick={() => setResetCounterDialogOpen(true)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Reinitialiser compteur</span>
            </Button>
          )}
          <Button onClick={() => setNewOrderOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("orders.new_order")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="kanban">
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">Liste</TabsTrigger>
            <TabsTrigger value="retours">
              Retours
              {allReturns.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{allReturns.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="avoirs">
              Avoirs
              {customerCredits.filter(c => c.status === "active" || c.status === "partially_used").length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                  {customerCredits.filter(c => c.status === "active" || c.status === "partially_used").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents">
              Documents
              {allDocuments.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{allDocuments.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="offres">
              Offres
              {orders.filter(o => o.orderType === "offre_client" || o.orderType === "offre_personnel").length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                  {orders.filter(o => o.orderType === "offre_client" || o.orderType === "offre_personnel").length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {(Object.keys(statusConfig) as Order["status"][]).map((status) => (
                <div key={status} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${statusConfig[status].color}`} />
                    <h3 className="font-medium text-sm">{statusConfig[status].label}</h3>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {ordersByStatus[status].length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {ordersByStatus[status].map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                    {ordersByStatus[status].length === 0 && (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        Aucune commande
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Toutes les commandes ({orders.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune commande pour le moment
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOrderClick(order)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${statusConfig[order.status]?.color}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            {order.orderNumberDisplay && (
                              <span className="font-mono text-xs text-muted-foreground">{order.orderNumberDisplay}</span>
                            )}
                            <p className="font-medium text-sm">{order.customerName}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {order.items.length} article(s) - {new Date(order.createdAt).toLocaleDateString("fr-TN")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{order.total.toLocaleString("fr-TN")} TND</p>
                        {getPaymentBadge(order.paymentStatus)}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Retours Tab */}
          <TabsContent value="retours" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Historique des retours ({allReturns.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {returnsListLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : allReturns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Aucun retour enregistre</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allReturns.map((ret) => (
                      <div
                        key={ret.id}
                        className="rounded-lg border p-4 space-y-2 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{ret.orderCustomerName}</span>
                            <Badge variant={
                              ret.status === "completed" ? "default" :
                              ret.status === "approved" ? "secondary" :
                              ret.status === "rejected" ? "destructive" : "outline"
                            } className="text-[10px]">
                              {returnStatusLabels[ret.status]}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {ret.returnType === "total" ? "Total" : "Partiel"}
                            </Badge>
                          </div>
                          <span className="font-semibold text-sm">
                            {ret.refundAmount.toLocaleString("fr-TN")} TND
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{reasonLabels[ret.reason]}</span>
                          {ret.refundMethod && <span>{refundMethodLabels[ret.refundMethod]}</span>}
                          <span>{new Date(ret.createdAt).toLocaleDateString("fr-TN")}</span>
                        </div>

                        {ret.items.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {ret.items.map((item, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">
                                {item.quantityReturned}x {item.productName}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {ret.status === "pending" && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={actionLoading}
                              onClick={() => handleProcessReturn(ret.id, "approved")}
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-destructive"
                              disabled={actionLoading}
                              onClick={() => handleProcessReturn(ret.id, "rejected")}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Rejeter
                            </Button>
                          </div>
                        )}
                        {ret.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={actionLoading}
                            onClick={() => handleProcessReturn(ret.id, "completed")}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Finaliser
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Avoirs Tab */}
          <TabsContent value="avoirs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileWarning className="h-4 w-4" />
                  Avoirs clients ({customerCredits.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {creditsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : customerCredits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileWarning className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Aucun avoir pour le moment</p>
                    <p className="text-xs mt-1">Les avoirs sont generes automatiquement lors de la finalisation des retours avec option {"\""}Avoir{"\""}.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerCredits.map((credit) => {
                      const remaining = credit.amount - credit.usedAmount
                      return (
                        <div
                          key={credit.id}
                          className="rounded-lg border p-4 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{credit.customerName}</span>
                              <Badge variant={
                                credit.status === "active" ? "default" :
                                credit.status === "partially_used" ? "secondary" :
                                credit.status === "fully_used" ? "outline" : "destructive"
                              } className="text-[10px]">
                                {credit.status === "active" ? "Actif" :
                                 credit.status === "partially_used" ? "Partiellement utilise" :
                                 credit.status === "fully_used" ? "Epuise" :
                                 credit.status === "cancelled" ? "Annule" : credit.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Montant initial</span>
                                <span className="font-medium">{credit.amount.toLocaleString("fr-TN")} TND</span>
                              </div>
                              {credit.usedAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Utilise</span>
                                  <span>{credit.usedAmount.toLocaleString("fr-TN")} TND</span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Reste</span>
                                <span className={`font-semibold ${remaining > 0 ? "text-primary" : "text-muted-foreground"}`}>
                                  {remaining.toLocaleString("fr-TN")} TND
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {credit.customerPhone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {credit.customerPhone}
                              </span>
                            )}
                            <span>{new Date(credit.createdAt).toLocaleDateString("fr-TN")}</span>
                            {credit.createdByName && <span>par {credit.createdByName}</span>}
                          </div>

                          {credit.notes && (
                            <p className="text-xs text-muted-foreground italic">{credit.notes}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Factures & Bons de livraison ({allDocuments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documentsListLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : allDocuments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Aucun document genere</p>
                    <p className="text-xs mt-1">Ouvrez une commande pour generer une facture ou un bon de livraison.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="rounded-lg border p-4 space-y-2 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={doc.type === "invoice" ? "default" : "secondary"} className="text-[10px]">
                              {doc.type === "invoice" ? "Facture" : "Bon de livraison"}
                            </Badge>
                            <span className="font-mono text-sm font-medium">{doc.documentNumber}</span>
                          </div>
                          <span className="font-semibold text-sm">{doc.total.toLocaleString("fr-TN")} TND</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            {doc.customerName} - {new Date(doc.issuedAt).toLocaleDateString("fr-TN")}
                            {doc.issuedByName && ` - par ${doc.issuedByName}`}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handlePrintDocument(doc)}
                              title="Imprimer"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleDownloadPdf(doc)}
                              title="Telecharger PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offres" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Ventes Offertes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const offersOrders = orders.filter(
                    (o) => o.orderType === "offre_client" || o.orderType === "offre_personnel"
                  )
                  if (offersOrders.length === 0) {
                    return (
                      <div className="text-center py-12 text-muted-foreground">
                        <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucune offre enregistree</p>
                        <p className="text-sm mt-1">
                          Les ventes offertes aux clients ou au personnel apparaitront ici
                        </p>
                      </div>
                    )
                  }
                  return (
                    <div className="space-y-4">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card className="bg-primary/5 border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Gift className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Total Offres</p>
                                <p className="text-2xl font-bold">{offersOrders.length}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-blue-500/5 border-blue-500/20">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-blue-500/10">
                                <User className="h-5 w-5 text-blue-500" />
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Offres Clients</p>
                                <p className="text-2xl font-bold">
                                  {offersOrders.filter((o) => o.orderType === "offre_client").length}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-orange-500/5 border-orange-500/20">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-orange-500/10">
                                <Users className="h-5 w-5 text-orange-500" />
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Offres Personnel</p>
                                <p className="text-2xl font-bold">
                                  {offersOrders.filter((o) => o.orderType === "offre_personnel").length}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Offers List */}
                      <div className="rounded-lg border">
                        <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 text-sm font-medium border-b">
                          <div className="col-span-1">Type</div>
                          <div className="col-span-3">Beneficiaire</div>
                          <div className="col-span-3">Articles</div>
                          <div className="col-span-2">Valeur</div>
                          <div className="col-span-2">Date</div>
                          <div className="col-span-1">Statut</div>
                        </div>
                        {offersOrders.map((offer) => (
                          <div
                            key={offer.id}
                            className="grid grid-cols-12 gap-4 p-3 border-b last:border-0 items-center hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => handleOrderClick(offer)}
                          >
                            <div className="col-span-1">
                              {offer.orderType === "offre_client" ? (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                                  <User className="h-3 w-3 mr-1" />
                                  Client
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                                  <Users className="h-3 w-3 mr-1" />
                                  Personnel
                                </Badge>
                              )}
                            </div>
                            <div className="col-span-3">
                              <p className="font-medium">{offer.customerName}</p>
                              {offer.customerPhone && (
                                <p className="text-sm text-muted-foreground">{offer.customerPhone}</p>
                              )}
                            </div>
                            <div className="col-span-3">
                              <p className="text-sm">
                                {offer.items.slice(0, 2).map((item) => item.name).join(", ")}
                                {offer.items.length > 2 && ` +${offer.items.length - 2}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {offer.items.reduce((sum, item) => sum + item.quantity, 0)} article(s)
                              </p>
                            </div>
                            <div className="col-span-2">
                              <p className="font-medium text-destructive">
                                {offer.total.toLocaleString("fr-TN")} TND
                              </p>
                              <p className="text-xs text-muted-foreground">Offert</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sm">
                                {new Date(offer.createdAt).toLocaleDateString("fr-TN")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(offer.createdAt).toLocaleTimeString("fr-TN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <div className="col-span-1">
                              <Badge
                                variant="outline"
                                className={`${statusConfig[offer.status]?.color} text-white text-[10px]`}
                              >
                                {statusConfig[offer.status]?.label}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total Value */}
                      <div className="flex justify-end pt-4">
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                          <p className="text-sm text-muted-foreground">Valeur totale offerte</p>
                          <p className="text-2xl font-bold text-destructive">
                            {offersOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString("fr-TN")} TND
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Order Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedOrder.orderNumberDisplay ? (
                    <span className="font-mono">{selectedOrder.orderNumberDisplay}</span>
                  ) : (
                    "Commande"
                  )}
                  <Badge variant="outline" className={`${statusConfig[selectedOrder.status]?.color} text-white text-[10px]`}>
                    {statusConfig[selectedOrder.status]?.label}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  Creee le {new Date(selectedOrder.createdAt).toLocaleString("fr-TN")}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Customer Info */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Client</h4>
                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="font-medium">{selectedOrder.customerName}</p>
                    {selectedOrder.customerPhone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedOrder.customerPhone}
                      </div>
                    )}
                    {selectedOrder.deliveryType === "delivery" && selectedOrder.customerAddress && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 mt-0.5" />
                        <span>{selectedOrder.customerAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Info */}
                {selectedOrder.deliveryType === "delivery" && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Livraison</h4>
                    <div className="rounded-lg border p-3 space-y-2">
                      {selectedOrder.gouvernorat && (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Gouvernorat</span>
                            <span className="font-medium">{selectedOrder.gouvernorat}</span>
                          </div>
                          {selectedOrder.delegation && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Delegation</span>
                              <span className="font-medium">{selectedOrder.delegation}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Transporteur</span>
                        <span className="font-medium">{selectedOrder.courier ? courierNameMap[selectedOrder.courier] || selectedOrder.courier : "-"}</span>
                      </div>
                      {selectedOrder.shippingCost > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Frais de livraison</span>
                          <span>{selectedOrder.shippingCost.toLocaleString("fr-TN")} TND</span>
                        </div>
                      )}
                      {selectedOrder.trackingNumber && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">N suivi</span>
                          <Badge variant="outline">{selectedOrder.trackingNumber}</Badge>
                        </div>
                      )}
                      {selectedOrder.status === "en-livraison" && (
                        <div className="flex items-center gap-2 text-sm text-orange-600 mt-2 pt-2 border-t">
                          <Truck className="h-4 w-4 animate-pulse" />
                          <span className="font-medium">En cours de livraison</span>
                        </div>
                      )}
                      {selectedOrder.deliveredAt && (
                        <div className="flex items-center gap-2 text-sm text-primary mt-2 pt-2 border-t">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-medium">
                            Livree le {new Date(selectedOrder.deliveredAt).toLocaleString("fr-TN")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Articles</h4>
                  <div className="rounded-lg border divide-y">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between p-3 text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-medium">
                          {(item.quantity * item.price).toLocaleString("fr-TN")} TND
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Paiement</h4>
                    {selectedOrder.paymentStatus !== "paid" && (
                      <Button size="sm" variant="outline" onClick={openPaymentDialog}>
                        <Banknote className="mr-1.5 h-3.5 w-3.5" />
                        Encaisser
                      </Button>
                    )}
                  </div>
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold">{selectedOrder.total.toLocaleString("fr-TN")} TND</span>
                    </div>
                    {selectedOrder.deposit > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Encaisse</span>
                        <span className="text-primary font-medium">{selectedOrder.deposit.toLocaleString("fr-TN")} TND</span>
                      </div>
                    )}
                    {selectedOrder.paymentStatus !== "paid" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Reste a payer</span>
                        <span className="font-medium text-destructive">
                          {(selectedOrder.total - selectedOrder.deposit).toLocaleString("fr-TN")} TND
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Payment Collections List */}
                  {collectionsLoading ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : collections.length > 0 && (
                    <div className="rounded-lg border divide-y">
                      {collections.map((c) => {
                        const MethodIcon = paymentMethodIcons[c.paymentMethod] || Banknote
                        return (
                          <div key={c.id} className="p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MethodIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {c.amount.toLocaleString("fr-TN")} TND
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="secondary" className="text-[10px]">
                                  {paymentMethodLabels[c.paymentMethod]}
                                </Badge>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => handleDeleteCollection(c)}
                                  disabled={actionLoading}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {c.collectedBy === "courier" ? (
                                <Truck className="h-3 w-3" />
                              ) : c.collectedBy === "online" ? (
                                <Globe className="h-3 w-3" />
                              ) : (
                                <Store className="h-3 w-3" />
                              )}
                              <span>{collectedByLabels[c.collectedBy]}</span>
                              {c.collectorName && <span>- {c.collectorName}</span>}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(c.collectedAt).toLocaleString("fr-TN")}
                              {c.recordedByName && ` - par ${c.recordedByName}`}
                            </div>
                            {c.reference && (
                              <div className="text-xs text-muted-foreground">Ref: {c.reference}</div>
                            )}
                            {c.notes && (
                              <div className="text-xs text-muted-foreground italic">{c.notes}</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Documents Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents
                    </h4>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={!!generatingDoc}
                        onClick={() => handleGenerateDocument("invoice")}
                      >
                        {generatingDoc === "invoice" ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <FileText className="mr-1 h-3 w-3" />
                        )}
                        Facture
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={!!generatingDoc}
                        onClick={() => handleGenerateDocument("delivery_note")}
                      >
                        {generatingDoc === "delivery_note" ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Truck className="mr-1 h-3 w-3" />
                        )}
                        Bon de livraison
                      </Button>
                    </div>
                  </div>

                  {documentsLoading ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : orderDocuments.length > 0 && (
                    <div className="rounded-lg border divide-y">
                      {orderDocuments.map((doc) => (
                        <div key={doc.id} className="p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={doc.type === "invoice" ? "default" : "secondary"} className="text-[10px]">
                                {doc.type === "invoice" ? "Facture" : "BL"}
                              </Badge>
                              <span className="text-xs font-mono font-medium">{doc.documentNumber}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => { setPreviewInvoice(doc); setPreviewOpen(true) }}
                                title="Apercu"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handlePrintDocument(doc)}
                                title="Imprimer"
                              >
                                <Printer className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleDownloadPdf(doc)}
                                title="PDF"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(doc.issuedAt).toLocaleDateString("fr-TN")} - {doc.total.toLocaleString("fr-TN")} TND
                            {doc.issuedByName && ` - par ${doc.issuedByName}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Returns Section */}
                {returnsLoading ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : orderReturns.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Retours ({orderReturns.length})
                    </h4>
                    <div className="rounded-lg border divide-y">
                      {orderReturns.map((ret) => (
                        <div key={ret.id} className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                ret.status === "completed" ? "default" :
                                ret.status === "approved" ? "secondary" :
                                ret.status === "rejected" ? "destructive" : "outline"
                              } className="text-[10px]">
                                {returnStatusLabels[ret.status]}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {ret.returnType === "total" ? "Total" : "Partiel"}
                              </Badge>
                            </div>
                            <span className="text-sm font-medium">
                              {ret.refundAmount.toLocaleString("fr-TN")} TND
                            </span>
                          </div>

                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p><span className="font-medium">Motif:</span> {reasonLabels[ret.reason]}</p>
                            {ret.reasonDetails && <p className="italic">{ret.reasonDetails}</p>}
                            {ret.refundMethod && (
                              <p><span className="font-medium">Remboursement:</span> {refundMethodLabels[ret.refundMethod]}</p>
                            )}
                            <p>{new Date(ret.createdAt).toLocaleString("fr-TN")}
                              {ret.createdByName && ` - par ${ret.createdByName}`}
                            </p>
                          </div>

                          {/* Partial return items */}
                          {ret.items.length > 0 && (
                            <div className="rounded border bg-muted/30 p-2 space-y-1">
                              {ret.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-xs">
                                  <span>{item.quantityReturned}x {item.productName}</span>
                                  <span>{item.subtotal.toLocaleString("fr-TN")} TND</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Actions for pending returns */}
                          {ret.status === "pending" && (
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-xs"
                                disabled={actionLoading}
                                onClick={() => handleProcessReturn(ret.id, "approved")}
                              >
                                <Check className="mr-1 h-3 w-3" />
                                Approuver
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-xs text-destructive"
                                disabled={actionLoading}
                                onClick={() => handleProcessReturn(ret.id, "rejected")}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Rejeter
                              </Button>
                            </div>
                          )}
                          {ret.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full h-7 text-xs"
                              disabled={actionLoading}
                              onClick={() => handleProcessReturn(ret.id, "completed")}
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Finaliser le retour
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Timeline */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Historique
                  </h4>
                  <div className="rounded-lg border p-3">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : statusHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">Aucun historique</p>
                    ) : (
                      <div className="relative space-y-0">
                        {statusHistory.map((entry, idx) => (
                          <div key={entry.id} className="flex gap-3">
                            {/* Timeline line */}
                            <div className="flex flex-col items-center">
                              <div className={`h-2.5 w-2.5 rounded-full mt-1.5 ${
                                idx === statusHistory.length - 1 ? "bg-primary" : "bg-muted-foreground/40"
                              }`} />
                              {idx < statusHistory.length - 1 && (
                                <div className="w-px flex-1 bg-border min-h-[24px]" />
                              )}
                            </div>
                            {/* Content */}
                            <div className="pb-4 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {historyLabels[entry.toStatus] || entry.toStatus}
                                </span>
                                {entry.fromStatus && (
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {new Date(entry.createdAt).toLocaleString("fr-TN")}
                                {entry.changedByName && ` - ${entry.changedByName}`}
                              </div>
                              {entry.note && (
                                <p className="text-xs text-muted-foreground mt-1 italic">{entry.note}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-2">
                  {selectedOrder.deliveryType === "delivery" && (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={isApiExporting}
                      onClick={handleExportToDeliveryApi}
                    >
                      {isApiExporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Truck className="mr-2 h-4 w-4" />
                      )}
                      Exporter au transporteur (API)
                    </Button>
                  )}

                  {selectedOrder.status === "nouveau" && (
                    <Button className="w-full" disabled={actionLoading} onClick={() => handleStatusChange("en-preparation")}>
                      {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
                      Demarrer la preparation
                    </Button>
                  )}
                  {selectedOrder.status === "en-preparation" && (
                    <Button className="w-full" disabled={actionLoading} onClick={() => handleStatusChange("pret")}>
                      {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Marquer comme pret
                    </Button>
                  )}
                  {selectedOrder.status === "pret" && (
                    <>
                      {selectedOrder.paymentStatus !== "paid" && (
                        <Button className="w-full" disabled={actionLoading} onClick={openPaymentDialog}>
                          {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}
                          Encaisser {(selectedOrder.total - selectedOrder.deposit).toLocaleString("fr-TN")} TND
                        </Button>
                      )}
                      {selectedOrder.deliveryType === "delivery" ? (
                        <>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setSendToDeliveryOpen(true)}
                          >
                            <Truck className="mr-2 h-4 w-4" />
                            Envoyer au service de livraison
                          </Button>
                          <Button
                            variant={selectedOrder.paymentStatus === "paid" ? "default" : "outline"}
                            className={`w-full ${selectedOrder.paymentStatus !== "paid" ? "bg-transparent" : ""}`}
                            disabled={actionLoading}
                            onClick={() => handleStatusChange("en-livraison", "Commande expediee")}
                          >
                            <Truck className="mr-2 h-4 w-4" />
                            Expedier la commande
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant={selectedOrder.paymentStatus === "paid" ? "default" : "outline"}
                          className={`w-full ${selectedOrder.paymentStatus !== "paid" ? "bg-transparent" : ""}`}
                          disabled={actionLoading}
                          onClick={() => handleStatusChange("livre", "Retrait client effectue")}
                        >
                          Retrait client effectue
                        </Button>
                      )}
                    </>
                  )}
                  {selectedOrder.status === "en-livraison" && (
                    <>
                      {selectedOrder.paymentStatus !== "paid" && (
                        <Button className="w-full" disabled={actionLoading} onClick={openPaymentDialog}>
                          <Banknote className="mr-2 h-4 w-4" />
                          Encaisser {(selectedOrder.total - selectedOrder.deposit).toLocaleString("fr-TN")} TND
                        </Button>
                      )}
                      <Button
                        variant={selectedOrder.paymentStatus === "paid" ? "default" : "outline"}
                        className={`w-full ${selectedOrder.paymentStatus !== "paid" ? "bg-transparent" : ""}`}
                        disabled={actionLoading}
                        onClick={() => handleStatusChange("livre", "Livraison confirmee")}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Confirmer la livraison
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-destructive"
                        disabled={actionLoading}
                        onClick={openReturnDialog}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Enregistrer un retour
                      </Button>
                    </>
                  )}
                  {selectedOrder.status === "livre" && (
                    <Button
                      variant="outline"
                      className="w-full text-destructive"
                      disabled={actionLoading}
                      onClick={openReturnDialog}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Enregistrer un retour
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Payment Collection Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enregistrer un encaissement</DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <>
                  Commande de {selectedOrder.customerName} - Reste: {(selectedOrder.total - selectedOrder.deposit).toLocaleString("fr-TN")} TND
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Montant (TND)</Label>
              <Input
                type="number"
                step="0.001"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.000"
              />
            </div>

            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" /> Especes
                    </div>
                  </SelectItem>
                  <SelectItem value="card">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Carte bancaire
                    </div>
                  </SelectItem>
                  <SelectItem value="bank_transfer">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Virement bancaire
                    </div>
                  </SelectItem>
                  <SelectItem value="check">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" /> Cheque
                    </div>
                  </SelectItem>
                  <SelectItem value="cod_courier">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" /> Contre-remboursement (livreur)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Encaisse par</Label>
              <Select value={payCollectedBy} onValueChange={(v) => setPayCollectedBy(v as CollectedBy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" /> Direct (patisserie)
                    </div>
                  </SelectItem>
                  <SelectItem value="courier">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" /> Via livreur
                    </div>
                  </SelectItem>
                  <SelectItem value="online">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" /> En ligne
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {payCollectedBy === "courier" && (
              <div className="space-y-2">
                <Label>Nom du livreur</Label>
                <Input
                  value={payCollectorName}
                  onChange={(e) => setPayCollectorName(e.target.value)}
                  placeholder="Ex: Ahmed - Aramex"
                />
              </div>
            )}

            {(payMethod === "bank_transfer" || payMethod === "check") && (
              <div className="space-y-2">
                <Label>{payMethod === "check" ? "Numero du cheque" : "Reference virement"}</Label>
                <Input
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder={payMethod === "check" ? "N du cheque" : "Ref. virement"}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Remarques sur l'encaissement..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleRecordPayment} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Banknote className="mr-2 h-4 w-4" />
              )}
              Confirmer l{"'"}encaissement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Enregistrer un retour
            </DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <>Commande de {selectedOrder.customerName} - {selectedOrder.total.toLocaleString("fr-TN")} TND</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Return Type */}
            <div className="space-y-2">
              <Label>Type de retour</Label>
              <Select value={returnType} onValueChange={(v) => { setReturnType(v as ReturnType); setReturnItems([]) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Retour total (toute la commande)</SelectItem>
                  <SelectItem value="partial">Retour partiel (articles specifiques)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Partial Return - Item Selection */}
            {returnType === "partial" && selectedOrder && (
              <div className="space-y-2">
                <Label>Articles a retourner</Label>
                <div className="rounded-lg border divide-y">
                  {selectedOrder.items.map((item, idx) => {
                    const selected = returnItems.find((ri) => ri.idx === idx)
                    return (
                      <div key={idx} className="p-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={!!selected}
                            onCheckedChange={(checked) => toggleReturnItem(idx, !!checked)}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity}x a {item.price.toLocaleString("fr-TN")} TND
                            </p>
                          </div>
                        </div>
                        {selected && (
                          <div className="ml-8 flex items-center gap-2">
                            <Label className="text-xs">Qte retournee:</Label>
                            <Input
                              type="number"
                              min={1}
                              max={item.quantity}
                              value={selected.qty}
                              onChange={(e) => updateReturnItemQty(idx, Math.min(item.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                              className="w-20 h-7 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">
                              = {(selected.qty * item.price).toLocaleString("fr-TN")} TND
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {returnItems.length > 0 && (
                  <div className="text-sm font-medium text-right">
                    Total retour: {returnItems.reduce((sum, ri) => {
                      const item = selectedOrder.items[ri.idx]
                      return sum + ri.qty * item.price
                    }, 0).toLocaleString("fr-TN")} TND
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label>Motif du retour</Label>
              <Select value={returnReason} onValueChange={(v) => setReturnReason(v as ReturnReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged">Produit endommage</SelectItem>
                  <SelectItem value="wrong_order">Erreur de commande</SelectItem>
                  <SelectItem value="client_absent">Client absent</SelectItem>
                  <SelectItem value="client_refused">Client a refuse</SelectItem>
                  <SelectItem value="quality">Probleme de qualite</SelectItem>
                  <SelectItem value="expired">Produit perime</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {returnReason === "other" && (
              <div className="space-y-2">
                <Label>Precisions sur le motif</Label>
                <Input
                  value={returnReasonDetails}
                  onChange={(e) => setReturnReasonDetails(e.target.value)}
                  placeholder="Decrivez la raison du retour..."
                />
              </div>
            )}

            {/* Refund Method */}
            <div className="space-y-2">
              <Label>Mode de remboursement</Label>
              <Select value={returnRefundMethod} onValueChange={(v) => setReturnRefundMethod(v as RefundMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_refund">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" /> Remboursement en especes
                    </div>
                  </SelectItem>
                  <SelectItem value="bank_refund">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Remboursement bancaire
                    </div>
                  </SelectItem>
                  <SelectItem value="credit_note">
                    <div className="flex items-center gap-2">
                      <FileWarning className="h-4 w-4" /> Avoir (credit client)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {returnRefundMethod === "credit_note" && (
                <p className="text-xs text-muted-foreground">
                  Un avoir sera genere automatiquement pour le client lors de la finalisation du retour.
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Remarques supplementaires..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleCreateReturn}
              disabled={actionLoading || (returnType === "partial" && returnItems.length === 0)}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Confirmer le retour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {previewInvoice?.type === "invoice" ? "Facture" : "Bon de livraison"} - {previewInvoice?.documentNumber}
            </DialogTitle>
            <DialogDescription>
              Apercu du document
            </DialogDescription>
          </DialogHeader>
          {previewInvoice && (
            <div className="space-y-4">
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintDocument(previewInvoice)}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimer
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleDownloadPdf(previewInvoice)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Telecharger PDF
                </Button>
              </div>
              <div id="invoice-print-area" className="border rounded-lg overflow-hidden">
                <InvoicePreview invoice={previewInvoice} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

        {/* Unified Order Dialog - combines QuickOrder + NewOrderDrawer */}
        <UnifiedOrderDialog open={newOrderOpen} onOpenChange={setNewOrderOpen} onOrderCreated={() => mutate()} />

        {/* Reset Counter Confirmation Dialog */}
        <Dialog open={resetCounterDialogOpen} onOpenChange={setResetCounterDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reinitialiser le compteur de commandes</DialogTitle>
              <DialogDescription>
                Cette action remet le compteur a zero. La prochaine commande sera numerotee CMD-001. Les commandes existantes conservent leurs numeros.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setResetCounterDialogOpen(false)}
                disabled={resettingCounter}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleResetCounter}
                disabled={resettingCounter}
              >
                {resettingCounter ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Confirmer la remise a zero
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send to Delivery Provider Dialog */}
        <SendToDeliveryDialog
          open={sendToDeliveryOpen}
          onOpenChange={setSendToDeliveryOpen}
          order={selectedOrder ? {
            id: selectedOrder.id,
            order_number: selectedOrder.orderNumberDisplay,
            client_name: selectedOrder.customerName,
            client_phone: selectedOrder.customerPhone,
            delivery_address: selectedOrder.customerAddress,
            delivery_city: selectedOrder.gouvernorat,
            delivery_postal_code: selectedOrder.delegation,
            total: selectedOrder.total,
            items: selectedOrder.items.map(item => ({
              product_name: item.name,
              name: item.name,
              quantity: item.quantity,
              unit_price: item.price,
              price: item.price,
            })),
            notes: selectedOrder.notes,
          } : null}
          onSuccess={() => {
            mutate()
            setSendToDeliveryOpen(false)
          }}
        />

        <DeliveryExportDialog
          open={deliveryExportOpen}
          onOpenChange={setDeliveryExportOpen}
          orders={orders}
          onSuccess={() => mutate()}
        />
      </div>
    </>
  )
}
