"use client"

import { useState, useMemo } from "react"
import {
  Megaphone, Send, Users, Star, Filter,
  MessageCircle, Phone, CheckCircle2, Loader2, Copy,
  User, Truck, Calendar,
  Bell, Package,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useClients, useOrders } from "@/hooks/use-tenant-data"
import { type Client } from "@/lib/clients/actions"
import { type Order } from "@/lib/orders/actions"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Channel = "whatsapp" | "sms"

function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return ''
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1)
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2)
  if (cleaned.startsWith('0')) cleaned = '216' + cleaned.substring(1)
  if (cleaned.length <= 8) cleaned = '216' + cleaned
  return cleaned
}

const statusFilter: Record<string, { label: string; color: string }> = {
  all: { label: "Tous", color: "bg-muted" },
  normal: { label: "Normal", color: "bg-muted" },
  vip: { label: "VIP", color: "bg-emerald-100 text-emerald-700" },
  warning: { label: "Attention", color: "bg-amber-100 text-amber-700" },
}

// Status display labels for orders
const orderStatusLabels: Record<string, string> = {
  "nouveau": "Nouveau",
  "en-preparation": "En preparation",
  "pret": "Pret",
  "en-livraison": "En livraison",
  "livre": "Livre",
  "annule": "Annule",
}

function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return ''
  // Retirer espaces, tirets, parenthèses, points
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  // Retirer le + si présent pour reconstruire
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1)
  // Si commence par 00 (format international avec 00)
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2)
  // Si commence par 0 (format local tunisien: 0X XXXXXXXX)
  if (cleaned.startsWith('0')) cleaned = '216' + cleaned.substring(1)
  // Si c'est un numéro local court (8 chiffres ou moins) sans indicatif pays
  if (cleaned.length <= 8) cleaned = '216' + cleaned
  return cleaned
}

export function CampaignsView() {
  const { data: clients = [], isLoading } = useClients()
  const { data: orders = [], isLoading: ordersLoading } = useOrders()
  const [activeTab, setActiveTab] = useState<"promo" | "delivery">("promo")
  const [step, setStep] = useState<"audience" | "compose" | "preview">("audience")

  // Audience filters
  const [targetStatus, setTargetStatus] = useState<string>("all")
  const [minOrders, setMinOrders] = useState<string>("")
  const [minSpent, setMinSpent] = useState<string>("")
  const [maxReturns, setMaxReturns] = useState<string>("")
  const [excludeBlacklisted, setExcludeBlacklisted] = useState(true)
  const [includeOrderContacts, setIncludeOrderContacts] = useState(true)

  // Compose
  const [channel, setChannel] = useState<Channel>("whatsapp")
  const [message, setMessage] = useState("")
  const [campaignName, setCampaignName] = useState("")

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Delivery notifications state
  const [deliveryChannel, setDeliveryChannel] = useState<Channel>("whatsapp")
  const [deliveryMessage, setDeliveryMessage] = useState(
    "Bonjour {nom},\n\nVotre commande #{numero} est prevue pour livraison aujourd'hui.\n\nAdresse: {adresse}\nMontant: {montant} TND\n\nMerci de votre confiance!\nKIFSHOP"
  )
  const [sendingDelivery, setSendingDelivery] = useState(false)
  const [deliverySent, setDeliverySent] = useState(false)
  const [selectedDeliveryOrders, setSelectedDeliveryOrders] = useState<string[]>([])
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>("all")
  const [currentDeliveryIndex, setCurrentDeliveryIndex] = useState(0)

  // Get today's date in local timezone YYYY-MM-DD format (fixes UTC vs local mismatch)
  const today = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }, [])

  // Derive contacts from orders that aren't in clients table
  const orderDerivedContacts = useMemo(() => {
    if (!includeOrderContacts) return []
    const clientPhones = new Set(clients.map(c => c.phone).filter(Boolean))
    const contactMap = new Map<string, { name: string; phone: string; orderCount: number; totalSpent: number }>()

    for (const order of orders) {
      if (!order.customerPhone) continue
      const phone = order.customerPhone.trim()
      if (clientPhones.has(phone)) continue

      const existing = contactMap.get(phone)
      if (existing) {
        existing.orderCount++
        existing.totalSpent += (order.total ?? 0)
        if (!existing.name && order.customerName) {
          existing.name = order.customerName
        }
      } else {
        contactMap.set(phone, {
          name: order.customerName || "",
          phone,
          orderCount: 1,
          totalSpent: order.total ?? 0,
        })
      }
    }

    return Array.from(contactMap.values())
  }, [orders, clients, includeOrderContacts])

  // Filter orders with delivery date today - include more statuses for better visibility
  const todayDeliveryOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDeliveryDate = order.deliveryDate?.split("T")[0]
      // Include en-preparation, pret, and en-livraison statuses for today's deliveries
      const isRelevant = order.status === "en-livraison" || order.status === "pret" || order.status === "en-preparation"
      const matchesStatusFilter = deliveryStatusFilter === "all" || order.status === deliveryStatusFilter
      return orderDeliveryDate === today && isRelevant && order.deliveryType === "delivery" && matchesStatusFilter
    })
  }, [orders, today, deliveryStatusFilter])

  // Get selected orders for notification
  const ordersToNotify = useMemo(() => {
    if (selectedDeliveryOrders.length === 0) return todayDeliveryOrders
    return todayDeliveryOrders.filter((o) => selectedDeliveryOrders.includes(o.id))
  }, [todayDeliveryOrders, selectedDeliveryOrders])

  // Process delivery message with order variables
  const processedDeliveryMessage = (order: Order) => {
    const address = order.customerAddress || order.deliveryAddress || ""
    const fullAddress = [
      address,
      order.delegation,
      order.gouvernorat,
    ].filter(Boolean).join(", ") || "Non specifiee"

    return deliveryMessage
      .replace(/\{nom\}/g, order.customerName || "Cher(e) client(e)")
      .replace(/\{telephone\}/g, order.customerPhone || "")
      .replace(/\{adresse\}/g, fullAddress)
      .replace(/\{montant\}/g, (order.total ?? 0).toFixed(0))
      .replace(/\{statut\}/g, orderStatusLabels[order.status] || order.status)
      .replace(/\{numero\}/g, order.orderNumberDisplay || order.id.substring(0, 8))
      .replace(/\{coursier\}/g, order.courier || "Non assigne")
  }

  const handleToggleDeliveryOrder = (orderId: string) => {
    setSelectedDeliveryOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleSelectAllDeliveryOrders = () => {
    if (selectedDeliveryOrders.length === todayDeliveryOrders.length) {
      setSelectedDeliveryOrders([])
    } else {
      setSelectedDeliveryOrders(todayDeliveryOrders.map((o) => o.id))
    }
  }

  const handleCopyDeliveryNumbers = () => {
    const numbers = ordersToNotify.map((o) => o.customerPhone).filter(Boolean).join("\n")
    if (!numbers) {
      toast.error("Aucun numero de telephone disponible")
      return
    }
    navigator.clipboard.writeText(numbers)
    toast.success(`${ordersToNotify.filter(o => o.customerPhone).length} numeros copies dans le presse-papiers`)
  }

  const handleCopyDeliveryMessage = () => {
    navigator.clipboard.writeText(deliveryMessage)
    toast.success("Message copie dans le presse-papiers")
  }

  const handleSendDeliveryNotifications = () => {
    const withPhone = ordersToNotify.filter(o => o.customerPhone)
    if (withPhone.length === 0) {
      toast.error("Aucun client avec numero de telephone")
      return
    }

    const order = withPhone[currentDeliveryIndex % withPhone.length]

    if (deliveryChannel === "whatsapp") {
      const url = `https://wa.me/${formatPhoneForWhatsApp(order.customerPhone!)}?text=${encodeURIComponent(processedDeliveryMessage(order))}`
      window.open(url, '_blank')
    } else {
      window.location.href = `sms:${order.customerPhone}?body=${encodeURIComponent(processedDeliveryMessage(order))}`
    }

    const next = currentDeliveryIndex + 1
    setCurrentDeliveryIndex(next)

    if (next < withPhone.length) {
      toast.success(`Message ouvert pour ${order.customerName || "Client"}. ${withPhone.length - next} restant(s)`)
    } else {
      setCurrentDeliveryIndex(0)
      setDeliverySent(true)
      toast.success(`Tous les ${withPhone.length} messages envoyes !`)
    }
  }

  // Filter audience - combine clients and order-derived contacts
  const audience = useMemo(() => {
    const filteredClients = clients.filter((c) => {
      if (excludeBlacklisted && c.status === "blacklisted") return false
      if (targetStatus !== "all" && c.status !== targetStatus) return false
      if (minOrders && c.totalOrders < parseInt(minOrders)) return false
      if (minSpent && c.totalSpent < parseFloat(minSpent)) return false
      if (maxReturns && c.returnCount > parseInt(maxReturns)) return false
      if (!c.phone) return false
      return true
    })

    // Add order-derived contacts that match filters
    const orderContacts = orderDerivedContacts
      .filter((c) => {
        if (targetStatus !== "all") return false // Can't filter by status for order-derived contacts
        if (minOrders && c.orderCount < parseInt(minOrders)) return false
        if (minSpent && c.totalSpent < parseFloat(minSpent)) return false
        return true
      })
      .map((c) => ({
        id: `order-contact-${c.phone}`,
        tenantId: "",
        phone: c.phone,
        name: c.name || null,
        status: "normal" as const,
        returnCount: 0,
        totalOrders: c.orderCount,
        totalSpent: c.totalSpent,
        notes: null,
        createdAt: "",
        updatedAt: "",
      }))

    return [...filteredClients, ...orderContacts]
  }, [clients, orderDerivedContacts, targetStatus, minOrders, minSpent, maxReturns, excludeBlacklisted])

  // Template variables
  const processedMessage = (client: Client) => {
    return message
      .replace(/\{nom\}/g, client.name || "Cher(e) client(e)")
      .replace(/\{telephone\}/g, client.phone)
      .replace(/\{total_commandes\}/g, String(client.totalOrders))
      .replace(/\{total_depense\}/g, (client.totalSpent ?? 0).toFixed(0))
  }

  const handleCopyNumbers = () => {
    const numbers = audience.map((c) => c.phone).filter(Boolean).join("\n")
    if (!numbers) {
      toast.error("Aucun numero de telephone disponible")
      return
    }
    navigator.clipboard.writeText(numbers)
    toast.success(`${audience.filter(c => c.phone).length} numeros copies dans le presse-papiers`)
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message)
    toast.success("Message copie dans le presse-papiers")
  }

  const handleSendCampaign = async () => {
    setSending(true)
    try {
      // Simulate sending (in production, integrate with WhatsApp Business API or SMS gateway)
      await new Promise((r) => setTimeout(r, 2000))
      setSent(true)
      toast.success(`Campagne "${campaignName}" envoyee a ${audience.length} clients via ${channel === "whatsapp" ? "WhatsApp" : "SMS"}`)
    } catch (err) {
      console.error("Erreur envoi campagne:", err)
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi de la campagne")
    } finally {
      setSending(false)
    }
  }

  if (isLoading || ordersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Stats synced from orders
  const totalOrdersToday = orders.filter(o => {
    const created = o.createdAt?.split("T")[0]
    return created === today
  }).length
  const pendingDeliveries = orders.filter(o =>
    o.deliveryType === "delivery" &&
    o.deliveryDate?.split("T")[0] === today &&
    (o.status === "en-preparation" || o.status === "pret" || o.status === "en-livraison")
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campagnes & Notifications</h1>
          <p className="text-muted-foreground">
            Creez des campagnes et envoyez des notifications de livraison
          </p>
        </div>
        {/* Quick sync stats from orders */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{totalOrdersToday} cmd aujourd'hui</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700">
            <Truck className="h-3.5 w-3.5" />
            <span>{pendingDeliveries} livraisons en attente</span>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "promo" | "delivery")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="promo" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Campagnes Promo
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Livraisons du Jour
            {todayDeliveryOrders.length > 0 && (
              <Badge className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5">
                {todayDeliveryOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Promotional Campaigns Tab */}
        <TabsContent value="promo" className="space-y-6 mt-6">
          {/* Steps */}
          <div className="flex items-center gap-2">
        {["audience", "compose", "preview"].map((s, i) => {
          const labels = { audience: "1. Audience", compose: "2. Message", preview: "3. Apercu" }
          const isActive = s === step
          const isDone = (s === "audience" && (step === "compose" || step === "preview")) ||
            (s === "compose" && step === "preview")
          return (
            <button
              key={s}
              onClick={() => setStep(s as typeof step)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-primary text-primary-foreground" :
                isDone ? "bg-primary/10 text-primary" :
                "bg-muted text-muted-foreground"
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                isActive ? "bg-primary-foreground/20 text-primary-foreground" :
                isDone ? "bg-primary text-primary-foreground" :
                "bg-muted-foreground/20 text-muted-foreground"
              }`}>
                {isDone ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{labels[s as keyof typeof labels]}</span>
            </button>
          )
        })}
      </div>

      {/* Step 1: Audience */}
      {step === "audience" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtrer l'audience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Statut client</Label>
                    <Select value={targetStatus} onValueChange={setTargetStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="vip">VIP uniquement</SelectItem>
                        <SelectItem value="warning">Attention</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Min. commandes</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 3"
                      value={minOrders}
                      onChange={(e) => setMinOrders(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Min. depense (TND)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 100"
                      value={minSpent}
                      onChange={(e) => setMinSpent(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max. retours</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 1"
                      value={maxReturns}
                      onChange={(e) => setMaxReturns(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="exclude-blacklisted"
                      checked={excludeBlacklisted}
                      onCheckedChange={(v) => setExcludeBlacklisted(v === true)}
                    />
                    <label htmlFor="exclude-blacklisted" className="text-sm">
                      Exclure les clients blacklistes
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-order-contacts"
                      checked={includeOrderContacts}
                      onCheckedChange={(v) => setIncludeOrderContacts(v === true)}
                    />
                    <label htmlFor="include-order-contacts" className="text-sm">
                      Inclure les contacts des commandes (non-inscrits)
                    </label>
                    {orderDerivedContacts.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5">
                        +{orderDerivedContacts.length}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audience preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Audience selectionnee ({audience.length})
                  </span>
                  <Button variant="outline" size="sm" onClick={handleCopyNumbers} disabled={audience.length === 0}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copier numeros
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {audience.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun client correspond aux filtres</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1.5">
                    {audience.slice(0, 50).map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm truncate">{c.name || "Sans nom"}</span>
                          <Badge variant="secondary" className={`text-[10px] px-1 py-0 ${
                            c.status === "vip" ? "bg-emerald-100 text-emerald-700" :
                            c.status === "warning" ? "bg-amber-100 text-amber-700" : ""
                          }`}>
                            {c.status}
                          </Badge>
                          {c.id.startsWith("order-contact-") && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              via commande
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{c.totalOrders} cmd</span>
                          <span className="text-xs text-muted-foreground">{c.phone}</span>
                        </div>
                      </div>
                    ))}
                    {audience.length > 50 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        + {audience.length - 50} autres clients
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto mb-3">
                    <Megaphone className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">{audience.length}</p>
                  <p className="text-sm text-muted-foreground">clients cibles</p>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VIP</span>
                    <span className="font-medium">{audience.filter(c => c.status === "vip").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Normal</span>
                    <span className="font-medium">{audience.filter(c => c.status === "normal").length}</span>
                  </div>
                  {includeOrderContacts && orderDerivedContacts.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Via commandes</span>
                      <span className="font-medium">{audience.filter(c => c.id.startsWith("order-contact-")).length}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avec telephone</span>
                    <span className="font-medium">{audience.filter(c => c.phone).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CA moyen</span>
                    <span className="font-medium">
                      {audience.length > 0
                        ? (audience.reduce((s, c) => s + (c.totalSpent ?? 0), 0) / audience.length).toFixed(0)
                        : 0} TND
                    </span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => setStep("compose")}
                  disabled={audience.length === 0}
                >
                  Etape suivante
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 2: Compose */}
      {step === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Rediger le message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Nom de la campagne</Label>
                <Input
                  placeholder="Ex: Promo Ramadan 2026"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Canal</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Message</Label>
                <Textarea
                  placeholder={"Bonjour {nom},\n\nNous avons une offre speciale pour vous...\n\nKIFSHOP"}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <p className="text-[10px] text-muted-foreground w-full mb-1">Variables disponibles :</p>
                  {["{nom}", "{telephone}", "{total_commandes}", "{total_depense}"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setMessage((m) => m + " " + v)}
                      className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted-foreground/10 text-muted-foreground font-mono"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("audience")}>Retour</Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep("preview")}
                  disabled={!message.trim() || !campaignName.trim()}
                >
                  Apercu
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Apercu en direct</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`rounded-xl p-4 ${channel === "whatsapp" ? "bg-emerald-50 border border-emerald-200" : "bg-blue-50 border border-blue-200"}`}>
                <div className="flex items-center gap-2 mb-3">
                  {channel === "whatsapp" ? (
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Phone className="h-4 w-4 text-blue-600" />
                  )}
                  <span className="text-xs font-semibold text-muted-foreground">
                    {channel === "whatsapp" ? "WhatsApp" : "SMS"}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {audience.length > 0 ? processedMessage(audience[0]) : message || "Votre message apparaitra ici..."}
                </p>
              </div>
              {audience.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Apercu pour: {audience[0].name || audience[0].phone}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Preview & Send */}
      {step === "preview" && (
        <Card>
          <CardContent className="pt-6">
            {sent ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-xl font-bold">Campagne envoyee !</p>
                <p className="text-muted-foreground mt-1">
                  "{campaignName}" envoyee a {audience.length} clients via {channel === "whatsapp" ? "WhatsApp" : "SMS"}
                </p>
                <Button className="mt-6" onClick={() => { setSent(false); setStep("audience"); setMessage(""); setCampaignName("") }}>
                  Nouvelle campagne
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-lg font-bold">Recapitulatif de la campagne</p>
                  <p className="text-sm text-muted-foreground">Verifiez avant d'envoyer</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-xl border p-3 text-center">
                    <p className="text-2xl font-bold">{audience.length}</p>
                    <p className="text-xs text-muted-foreground">Destinataires</p>
                  </div>
                  <div className="rounded-xl border p-3 text-center">
                    <p className="text-2xl font-bold capitalize">{channel}</p>
                    <p className="text-xs text-muted-foreground">Canal</p>
                  </div>
                  <div className="rounded-xl border p-3 text-center">
                    <p className="text-2xl font-bold">{message.length}</p>
                    <p className="text-xs text-muted-foreground">Caracteres</p>
                  </div>
                  <div className="rounded-xl border p-3 text-center">
                    <p className="text-2xl font-bold truncate">{campaignName}</p>
                    <p className="text-xs text-muted-foreground">Campagne</p>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Message</p>
                  <p className="text-sm whitespace-pre-wrap">{message}</p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("compose")}>Modifier</Button>
                  <Button variant="outline" onClick={handleCopyMessage}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copier message
                  </Button>
                  <Button variant="outline" onClick={handleCopyNumbers}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copier numeros
                  </Button>
                  <Button className="flex-1" onClick={handleSendCampaign} disabled={sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Envoyer la campagne
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
        </TabsContent>

        {/* Delivery Notifications Tab */}
        <TabsContent value="delivery" className="space-y-6 mt-6">
          {deliverySent ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <p className="text-xl font-bold">Notifications envoyees !</p>
                  <p className="text-muted-foreground mt-1">
                    {ordersToNotify.filter(o => o.customerPhone).length} clients ont ete avertis de leur livraison via {deliveryChannel === "whatsapp" ? "WhatsApp" : "SMS"}
                  </p>
                  <Button className="mt-6" onClick={() => { setDeliverySent(false); setSelectedDeliveryOrders([]); setCurrentDeliveryIndex(0) }}>
                    Nouvelle notification
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Orders to notify */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Livraisons prevues aujourd'hui ({today})
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Select value={deliveryStatusFilter} onValueChange={setDeliveryStatusFilter}>
                          <SelectTrigger className="w-[160px] h-8 text-xs">
                            <SelectValue placeholder="Filtrer par statut" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="en-preparation">En preparation</SelectItem>
                            <SelectItem value="pret">Pret</SelectItem>
                            <SelectItem value="en-livraison">En livraison</SelectItem>
                          </SelectContent>
                        </Select>
                        {todayDeliveryOrders.length > 0 && (
                          <Button variant="outline" size="sm" onClick={handleSelectAllDeliveryOrders}>
                            {selectedDeliveryOrders.length === todayDeliveryOrders.length ? "Deselectionner tout" : "Selectionner tout"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {todayDeliveryOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">Aucune livraison confirmee pour aujourd'hui</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Les commandes avec statut "En preparation", "Pret" ou "En livraison" et une date de livraison aujourd'hui apparaitront ici
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {todayDeliveryOrders.map((order) => (
                          <div
                            key={order.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                              selectedDeliveryOrders.includes(order.id) || selectedDeliveryOrders.length === 0
                                ? "bg-primary/5 border-primary/20"
                                : "bg-muted/30 opacity-60"
                            }`}
                            onClick={() => handleToggleDeliveryOrder(order.id)}
                          >
                            <Checkbox
                              checked={selectedDeliveryOrders.length === 0 || selectedDeliveryOrders.includes(order.id)}
                              onCheckedChange={() => handleToggleDeliveryOrder(order.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{order.customerName || "Sans nom"}</span>
                                {order.orderNumberDisplay && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 font-mono">
                                    {order.orderNumberDisplay}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className={`text-[10px] px-1.5 ${
                                  order.status === "en-livraison" ? "bg-orange-100 text-orange-700" :
                                  order.status === "pret" ? "bg-primary/10 text-primary" :
                                  "bg-amber-100 text-amber-700"
                                }`}>
                                  {orderStatusLabels[order.status] || order.status}
                                </Badge>
                                {!order.customerPhone && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5">
                                    Pas de tel.
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {order.customerPhone || "Pas de telephone"} - {order.customerAddress || order.deliveryAddress || "Adresse non specifiee"}
                                {order.gouvernorat && `, ${order.gouvernorat}`}
                              </p>
                              {order.courier && (
                                <p className="text-[10px] text-muted-foreground">
                                  Coursier: {order.courier}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <p className="font-semibold text-sm">{(order.total ?? 0).toFixed(0)} TND</p>
                              <p className="text-[10px] text-muted-foreground">
                                {order.items?.length || 0} article{(order.items?.length || 0) > 1 ? "s" : ""}
                              </p>
                              <Badge variant="outline" className={`text-[9px] mt-0.5 ${
                                order.paymentStatus === "paid" ? "text-emerald-600 border-emerald-200" :
                                order.paymentStatus === "partial" ? "text-amber-600 border-amber-200" :
                                "text-red-600 border-red-200"
                              }`}>
                                {order.paymentStatus === "paid" ? "Paye" : order.paymentStatus === "partial" ? "Partiel" : "Non paye"}
                              </Badge>
                              {order.customerPhone && (
                                <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                                  <a
                                    href={`https://wa.me/${formatPhoneForWhatsApp(order.customerPhone)}?text=${encodeURIComponent(processedDeliveryMessage(order))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50">
                                      <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                                    </Button>
                                  </a>
                                  <a href={`sms:${order.customerPhone}?body=${encodeURIComponent(processedDeliveryMessage(order))}`}>
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                      <Phone className="h-3 w-3 mr-1" /> SMS
                                    </Button>
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Message composition */}
                {todayDeliveryOrders.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Message de notification
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs">Canal</Label>
                        <Select value={deliveryChannel} onValueChange={(v) => setDeliveryChannel(v as Channel)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Message</Label>
                        <Textarea
                          value={deliveryMessage}
                          onChange={(e) => setDeliveryMessage(e.target.value)}
                          rows={6}
                          className="font-mono text-sm"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <p className="text-[10px] text-muted-foreground w-full mb-1">Variables disponibles :</p>
                          {["{nom}", "{telephone}", "{adresse}", "{montant}", "{statut}", "{numero}", "{coursier}"].map((v) => (
                            <button
                              key={v}
                              onClick={() => setDeliveryMessage((m) => m + " " + v)}
                              className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted-foreground/10 text-muted-foreground font-mono"
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Live preview */}
                      <div className={`rounded-xl p-4 ${deliveryChannel === "whatsapp" ? "bg-emerald-50 border border-emerald-200" : "bg-blue-50 border border-blue-200"}`}>
                        <div className="flex items-center gap-2 mb-3">
                          {deliveryChannel === "whatsapp" ? (
                            <MessageCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Phone className="h-4 w-4 text-blue-600" />
                          )}
                          <span className="text-xs font-semibold text-muted-foreground">
                            Apercu {deliveryChannel === "whatsapp" ? "WhatsApp" : "SMS"}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {ordersToNotify.length > 0 ? processedDeliveryMessage(ordersToNotify[0]) : deliveryMessage}
                        </p>
                        {ordersToNotify.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-2">
                            Apercu pour: {ordersToNotify[0].customerName || "Client"}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Summary sidebar */}
              <div>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 mx-auto mb-3">
                        <Bell className="h-7 w-7 text-orange-600" />
                      </div>
                      <p className="text-3xl font-bold">{ordersToNotify.length}</p>
                      <p className="text-sm text-muted-foreground">clients a notifier</p>
                    </div>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">En preparation</span>
                        <span className="font-medium">{ordersToNotify.filter(o => o.status === "en-preparation").length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pret</span>
                        <span className="font-medium">{ordersToNotify.filter(o => o.status === "pret").length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">En livraison</span>
                        <span className="font-medium">{ordersToNotify.filter(o => o.status === "en-livraison").length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avec telephone</span>
                        <span className="font-medium">{ordersToNotify.filter(o => o.customerPhone).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sans telephone</span>
                        <span className="font-medium text-red-600">{ordersToNotify.filter(o => !o.customerPhone).length}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total livraisons</span>
                        <span className="font-medium">
                          {ordersToNotify.reduce((sum, o) => sum + (o.total ?? 0), 0).toLocaleString("fr-TN")} TND
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Non paye</span>
                        <span className="font-medium text-red-600">
                          {ordersToNotify.filter(o => o.paymentStatus === "unpaid").length}
                        </span>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleCopyDeliveryNumbers}
                        disabled={ordersToNotify.length === 0}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copier numeros
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleCopyDeliveryMessage}
                        disabled={ordersToNotify.length === 0}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copier message
                      </Button>
                      <Button
                        className="w-full"
                        onClick={handleSendDeliveryNotifications}
                        disabled={ordersToNotify.filter(o => o.customerPhone).length === 0}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {(() => {
                          const withPhone = ordersToNotify.filter(o => o.customerPhone)
                          if (currentDeliveryIndex === 0 || currentDeliveryIndex >= withPhone.length) {
                            return `Envoyer notifications (${withPhone.length})`
                          }
                          const nextOrder = withPhone[currentDeliveryIndex]
                          return `Suivant: ${nextOrder?.customerName || "Client"} (${currentDeliveryIndex}/${withPhone.length})`
                        })()}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
