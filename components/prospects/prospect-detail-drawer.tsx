"use client"

import { useEffect, useState } from "react"
import { Loader2, Trash2, Phone, MessageCircle, Instagram, Globe, Users, Bell, BellOff, ShoppingCart, ArrowRight, Calendar, StickyNote, CheckCircle2, XCircle, Clock, Plus, Minus, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  updateProspectStatus, updateProspectNotes, setProspectReminder, updateProspectCommercialDetails,
  dismissReminder, convertProspectToOrder, type Prospect,
} from "@/lib/prospects/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const sourceIcons: Record<string, typeof MessageCircle> = {
  instagram: Instagram, tiktok: Globe, whatsapp: MessageCircle,
  messenger: MessageCircle, facebook: Globe, phone: Phone, autre: Users,
}
const sourceLabels: Record<string, string> = {
  instagram: "Instagram", tiktok: "TikTok", whatsapp: "WhatsApp",
  messenger: "Messenger", facebook: "Facebook", phone: "Telephone", autre: "Autre",
}
const sourceColors: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-700", tiktok: "bg-gray-100 text-gray-800",
  whatsapp: "bg-green-100 text-green-700", messenger: "bg-blue-100 text-blue-700",
  facebook: "bg-indigo-100 text-indigo-700", phone: "bg-orange-100 text-orange-700",
  autre: "bg-gray-100 text-gray-700",
}
const statusSteps: { key: Prospect["status"]; label: string; color: string }[] = [
  { key: "nouveau", label: "Nouveau", color: "bg-blue-500" },
  { key: "contacte", label: "Contacte", color: "bg-amber-500" },
  { key: "en-discussion", label: "En discussion", color: "bg-purple-500" },
  { key: "converti", label: "Converti", color: "bg-green-500" },
]

type QuoteItem = Prospect["quoteItems"][number]
type QuoteCategory = QuoteItem["category"]
type QuoteUnit = QuoteItem["unit"]

const categoryLabels: Record<QuoteCategory, string> = {
  pf: "Produit fini",
  boisson: "Boisson",
  autre: "Autre",
}

const unitLabels: Record<QuoteUnit, string> = {
  pieces: "Pieces",
  kg: "Kg",
  litres: "Litres",
  bouteilles: "Bouteilles",
}

const paymentLabels: Record<Prospect["quotePaymentMode"], string> = {
  none: "Non definie",
  acompte: "Acompte exige",
  paiement_commande: "Paiement a la commande",
}

interface Props {
  prospect: Prospect
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
  onDelete: () => void
}

export function ProspectDetailDrawer({ prospect, open, onOpenChange, onUpdate, onDelete }: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState(prospect.notes || "")
  const [reminderDate, setReminderDate] = useState("")
  const [eventType, setEventType] = useState<"none" | "fete" | "mariage">(prospect.eventType || "none")
  const [eventDate, setEventDate] = useState(prospect.eventDate ? prospect.eventDate.split("T")[0] : "")
  const [quoteStatus, setQuoteStatus] = useState<Prospect["quoteStatus"]>(prospect.quoteStatus || "non_demande")
  const [quoteBudget, setQuoteBudget] = useState(prospect.quoteBudget ? String(prospect.quoteBudget) : "")
  const [quoteAmount, setQuoteAmount] = useState(prospect.quoteAmount ? String(prospect.quoteAmount) : "")
  const [quotePaymentMode, setQuotePaymentMode] = useState<Prospect["quotePaymentMode"]>(prospect.quotePaymentMode || "none")
  const [quotePaymentAmount, setQuotePaymentAmount] = useState(prospect.quotePaymentAmount ? String(prospect.quotePaymentAmount) : "")
  const [quotePaymentReceived, setQuotePaymentReceived] = useState(!!prospect.quotePaymentReceived)
  const [quoteNotes, setQuoteNotes] = useState(prospect.quoteNotes || "")
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>(prospect.quoteItems || [])
  const [deliveryDateTime, setDeliveryDateTime] = useState("")
  const [convertDocumentType, setConvertDocumentType] = useState<"none" | "invoice" | "delivery_note">("none")
  const [saving, setSaving] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const SourceIcon = sourceIcons[prospect.source] || Users

  const hasActiveReminder = prospect.reminderAt && !prospect.reminderDismissed
  const reminderPast = hasActiveReminder && new Date(prospect.reminderAt!) <= new Date()
  const currentStepIndex = statusSteps.findIndex(s => s.key === prospect.status)

  useEffect(() => {
    setNotes(prospect.notes || "")
    setEventType(prospect.eventType || "none")
    setEventDate(prospect.eventDate ? prospect.eventDate.split("T")[0] : "")
    setQuoteStatus(prospect.quoteStatus || "non_demande")
    setQuoteBudget(prospect.quoteBudget ? String(prospect.quoteBudget) : "")
    setQuoteAmount(prospect.quoteAmount ? String(prospect.quoteAmount) : "")
    setQuotePaymentMode(prospect.quotePaymentMode || "none")
    setQuotePaymentAmount(prospect.quotePaymentAmount ? String(prospect.quotePaymentAmount) : "")
    setQuotePaymentReceived(!!prospect.quotePaymentReceived)
    setQuoteNotes(prospect.quoteNotes || "")
    setQuoteItems(prospect.quoteItems || [])
    setDeliveryDateTime("")
    setConvertDocumentType("none")
  }, [prospect])

  useEffect(() => {
    const computed = quoteItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0)
    setQuoteAmount(computed > 0 ? computed.toFixed(3) : "")
  }, [quoteItems])

  const addQuoteItem = () => {
    setQuoteItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        category: "pf",
        label: "",
        unit: "pieces",
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0,
      },
    ])
  }

  const removeQuoteItem = (id: string) => {
    setQuoteItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuoteItem = (id: string, patch: Partial<QuoteItem>) => {
    setQuoteItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const next = { ...item, ...patch }
        const qty = Number(next.quantity) || 0
        const unitPrice = Number(next.unitPrice) || 0
        return { ...next, lineTotal: qty * unitPrice }
      }),
    )
  }

  async function handleStatusChange(status: Prospect["status"]) {
    setSaving(true)
    const ok = await updateProspectStatus(prospect.id, status)
    setSaving(false)
    if (ok) { toast.success(`Statut: ${statusSteps.find(s => s.key === status)?.label || status}`); onUpdate() }
    else toast.error("Erreur")
  }

  async function handleSaveNotes() {
    setSaving(true)
    const ok = await updateProspectNotes(prospect.id, notes)
    setSaving(false)
    if (ok) { toast.success("Notes enregistrees"); onUpdate() }
    else toast.error("Erreur")
  }

  async function handleSaveCommercial() {
    if (quoteStatus === "envoye" || quoteStatus === "accepte") {
      if (quotePaymentMode === "none") {
        toast.error("Definissez une condition de paiement (acompte ou paiement a la commande)")
        return
      }
      if (!quotePaymentAmount || parseFloat(quotePaymentAmount) <= 0) {
        toast.error("Renseignez le montant exige")
        return
      }
    }

    setSaving(true)
    const ok = await updateProspectCommercialDetails(prospect.id, {
      eventType: eventType === "none" ? null : eventType,
      eventDate: eventDate || null,
      quoteStatus,
      quoteBudget: quoteBudget ? parseFloat(quoteBudget) : null,
      quoteAmount: quoteAmount ? parseFloat(quoteAmount) : null,
      quotePaymentMode,
      quotePaymentAmount: quotePaymentAmount ? parseFloat(quotePaymentAmount) : null,
      quotePaymentReceived,
      quoteNotes: quoteNotes.trim() || null,
      quoteItems,
    })
    setSaving(false)
    if (ok) { toast.success("Devis et suivi enregistres"); onUpdate() }
    else toast.error("Erreur")
  }

  async function handleSetReminder() {
    if (!reminderDate) { toast.error("Choisissez une date de rappel"); return }
    setSaving(true)
    const ok = await setProspectReminder(prospect.id, new Date(reminderDate).toISOString())
    setSaving(false)
    if (ok) { toast.success("Rappel programme"); setReminderDate(""); onUpdate() }
    else toast.error("Erreur")
  }

  async function handleDismissReminder() {
    const ok = await dismissReminder(prospect.id)
    if (ok) { toast.success("Rappel desactive"); onUpdate() }
  }

  function handleConvertToOrder() {
    if (quotePaymentMode !== "none" && !quotePaymentReceived) {
      toast.error("Le paiement exige n'est pas encore marque comme recu")
      return
    }
    if (!deliveryDateTime) {
      toast.error("Veuillez renseigner la date et l'heure de livraison")
      return
    }

    // Navigate to commandes with prospect data pre-filled via query params
    const params = new URLSearchParams({
      fromProspect: prospect.id,
      customerName: prospect.name,
      customerPhone: prospect.phone || "",
      source: ["phone", "comptoir", "web", "facebook"].includes(prospect.source) ? prospect.source : "phone",
      deliveryAt: deliveryDateTime,
      autoDocumentType: convertDocumentType,
    })
    onOpenChange(false)
    router.push(`/commandes?${params.toString()}`)
  }

  function handlePrintQuote() {
    const total = quoteItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0)
    const budget = parseFloat(quoteBudget || "0")
    const paymentAmount = parseFloat(quotePaymentAmount || "0")
    const safe = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const rows = quoteItems.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${safe(item.label || "-")}</td>
        <td>${safe(categoryLabels[item.category])}</td>
        <td>${safe(unitLabels[item.unit])}</td>
        <td>${item.quantity}</td>
        <td>${item.unitPrice.toFixed(3)}</td>
        <td>${item.lineTotal.toFixed(3)}</td>
      </tr>
    `).join("")

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Devis - ${safe(prospect.name)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            h1 { margin: 0 0 8px; }
            .muted { color: #6b7280; font-size: 12px; }
            .block { margin: 14px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f9fafb; }
            .totals { margin-top: 14px; width: 340px; margin-left: auto; font-size: 13px; }
            .totals div { display: flex; justify-content: space-between; margin: 4px 0; }
            .strong { font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Devis evenementiel</h1>
          <div class="muted">Client: ${safe(prospect.name)} | Telephone: ${safe(prospect.phone || "-")}</div>
          <div class="muted">Type: ${eventType === "none" ? "-" : safe(eventType === "mariage" ? "Mariage" : "Fete")} | Date: ${safe(eventDate || "-")}</div>
          <div class="block"><strong>Statut devis:</strong> ${safe(quoteStatus)}</div>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Article</th><th>Categorie</th><th>Unite</th><th>Quantite</th><th>P.U</th><th>Total</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="7">Aucune ligne</td></tr>'}</tbody>
          </table>
          <div class="totals">
            <div><span>Budget client</span><span>${budget ? budget.toFixed(3) : "0.000"} TND</span></div>
            <div><span>Condition paiement</span><span>${safe(paymentLabels[quotePaymentMode])}</span></div>
            <div><span>Montant exige</span><span>${paymentAmount ? paymentAmount.toFixed(3) : "0.000"} TND</span></div>
            <div><span>Paiement recu</span><span>${quotePaymentReceived ? "Oui" : "Non"}</span></div>
            <div class="strong"><span>Total devis</span><span>${total.toFixed(3)} TND</span></div>
          </div>
          <div class="block"><strong>Notes:</strong><br/>${safe(quoteNotes || "-")}</div>
          <script>window.onload=function(){window.print();}</script>
        </body>
      </html>
    `

    const printWindow = window.open("", "_blank", "width=1000,height=800")
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenetre d'impression")
      return
    }
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#4A7C59]/10 to-[#D4A373]/10 p-6 border-b">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${sourceColors[prospect.source] || "bg-gray-100"}`}>
                <SourceIcon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold truncate">{prospect.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className={`text-[10px] ${sourceColors[prospect.source]}`}>
                    {sourceLabels[prospect.source]}
                  </Badge>
                  {prospect.phone && <span className="text-xs text-muted-foreground">{prospect.phone}</span>}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              Ajoute le {new Date(prospect.createdAt).toLocaleDateString("fr-TN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          <div className="p-6 space-y-6">

            {/* Reminder Alert */}
            {reminderPast && (
              <Card className="border-amber-200 bg-amber-50 rounded-xl">
                <CardContent className="p-4 flex items-center gap-3">
                  <Bell className="h-5 w-5 text-amber-600 animate-pulse shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">Rappel de relance</p>
                    <p className="text-xs text-amber-600">
                      Prevu le {new Date(prospect.reminderAt!).toLocaleDateString("fr-TN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-700" onClick={handleDismissReminder}>
                    <BellOff className="mr-1 h-3 w-3" />
                    OK
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Status Pipeline */}
            {prospect.status !== "perdu" && (
              <Card className="rounded-xl border shadow-sm">
                <CardContent className="p-4">
                  <Label className="text-xs text-muted-foreground mb-3 block">Progression</Label>
                  <div className="flex items-center gap-1">
                    {statusSteps.map((step, i) => {
                      const isActive = i <= currentStepIndex
                      const isCurrent = step.key === prospect.status
                      return (
                        <button
                          key={step.key}
                          onClick={() => handleStatusChange(step.key)}
                          disabled={saving || prospect.status === "converti"}
                          className="flex-1 group"
                        >
                          <div className={`h-2 rounded-full transition-all ${isActive ? step.color : "bg-muted"} ${!isCurrent && !saving ? "group-hover:opacity-80" : ""}`} />
                          <p className={`text-[10px] mt-1.5 text-center transition-colors ${isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                            {step.label}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Message du client */}
            {prospect.message && (
              <Card className="rounded-xl border shadow-sm">
                <CardContent className="p-4">
                  <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1.5">
                    <MessageCircle className="h-3 w-3" /> Message du client
                  </Label>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{prospect.message}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <Card className="rounded-xl border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Evenement & devis
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Type evenement</Label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as "none" | "fete" | "mariage")}
                    >
                      <option value="none">Aucun</option>
                      <option value="fete">Fete</option>
                      <option value="mariage">Mariage</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Date evenement</Label>
                    <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Statut devis</Label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={quoteStatus}
                      onChange={(e) => setQuoteStatus(e.target.value as Prospect["quoteStatus"])}
                    >
                      <option value="non_demande">Non demande</option>
                      <option value="a_preparer">A preparer</option>
                      <option value="envoye">Envoye</option>
                      <option value="accepte">Accepte</option>
                      <option value="refuse">Refuse</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Budget client (TND)</Label>
                    <Input type="number" min="0" step="0.001" value={quoteBudget} onChange={(e) => setQuoteBudget(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Montant devis (TND)</Label>
                    <Input type="number" min="0" step="0.001" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} readOnly />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Condition de paiement</Label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={quotePaymentMode}
                      onChange={(e) => setQuotePaymentMode(e.target.value as Prospect["quotePaymentMode"])}
                    >
                      <option value="none">Non definie</option>
                      <option value="acompte">Acompte exige</option>
                      <option value="paiement_commande">Paiement a la commande</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Montant exige (TND)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={quotePaymentAmount}
                      onChange={(e) => setQuotePaymentAmount(e.target.value)}
                      disabled={quotePaymentMode === "none"}
                    />
                  </div>
                </div>
                {quotePaymentMode !== "none" && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={quotePaymentReceived}
                      onChange={(e) => setQuotePaymentReceived(e.target.checked)}
                    />
                    Paiement/acompte recu
                  </label>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px]">Composition du devis</Label>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addQuoteItem}>
                      <Plus className="mr-1 h-3 w-3" />
                      Ajouter article
                    </Button>
                  </div>
                  {quoteItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Ajoutez les PF/boissons pour calculer le devis automatiquement.</p>
                  ) : (
                    <div className="space-y-2">
                      {quoteItems.map((item) => (
                        <div key={item.id} className="rounded-lg border p-2 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                              value={item.category}
                              onChange={(e) => updateQuoteItem(item.id, { category: e.target.value as QuoteCategory })}
                            >
                              <option value="pf">{categoryLabels.pf}</option>
                              <option value="boisson">{categoryLabels.boisson}</option>
                              <option value="autre">{categoryLabels.autre}</option>
                            </select>
                            <Input
                              className="h-8"
                              placeholder="Article (ex: Entremet framboise)"
                              value={item.label}
                              onChange={(e) => updateQuoteItem(item.id, { label: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <select
                              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                              value={item.unit}
                              onChange={(e) => updateQuoteItem(item.id, { unit: e.target.value as QuoteUnit })}
                            >
                              <option value="pieces">{unitLabels.pieces}</option>
                              <option value="kg">{unitLabels.kg}</option>
                              <option value="litres">{unitLabels.litres}</option>
                              <option value="bouteilles">{unitLabels.bouteilles}</option>
                            </select>
                            <Input
                              className="h-8"
                              type="number"
                              min="0"
                              step="0.001"
                              value={item.quantity}
                              onChange={(e) => updateQuoteItem(item.id, { quantity: parseFloat(e.target.value || "0") })}
                            />
                            <Input
                              className="h-8"
                              type="number"
                              min="0"
                              step="0.001"
                              value={item.unitPrice}
                              onChange={(e) => updateQuoteItem(item.id, { unitPrice: parseFloat(e.target.value || "0") })}
                            />
                            <div className="h-8 rounded-md border bg-muted/40 px-2 flex items-center justify-between text-xs">
                              <span>{item.lineTotal.toFixed(3)} TND</span>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-red-500"
                                onClick={() => removeQuoteItem(item.id)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="rounded-md bg-muted/40 p-2 text-xs flex items-center justify-between">
                    <span>Total calcule</span>
                    <strong>{(quoteItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0)).toFixed(3)} TND</strong>
                  </div>
                  {quoteBudget && (
                    <div className={`rounded-md p-2 text-xs ${parseFloat(quoteAmount || "0") > parseFloat(quoteBudget) ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                      {parseFloat(quoteAmount || "0") > parseFloat(quoteBudget)
                        ? `Depassement budget: ${(parseFloat(quoteAmount || "0") - parseFloat(quoteBudget)).toFixed(3)} TND`
                        : `Reste budget: ${(parseFloat(quoteBudget) - parseFloat(quoteAmount || "0")).toFixed(3)} TND`}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Notes devis</Label>
                  <Textarea
                    placeholder="Besoins, theme, nombre de pieces, conditions..."
                    className="min-h-[70px] resize-none text-sm"
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleSaveCommercial} disabled={saving}>
                    {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    Enregistrer devis/suivi
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handlePrintQuote}>
                    <Printer className="mr-1 h-3 w-3" />
                    Imprimer devis
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="rounded-xl border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <StickyNote className="h-3 w-3" /> Notes internes
                </Label>
                <Textarea
                  placeholder="Ajoutez des notes..."
                  className="min-h-[80px] resize-none text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                {notes !== (prospect.notes || "") && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSaveNotes} disabled={saving}>
                    {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    Enregistrer les notes
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Reminder */}
            <Card className="rounded-xl border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Rappel de relance
                </Label>
                {hasActiveReminder && !reminderPast ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50">
                    <div className="flex items-center gap-2 text-xs text-blue-700">
                      <Bell className="h-3.5 w-3.5" />
                      Prevu le {new Date(prospect.reminderAt!).toLocaleDateString("fr-TN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 text-xs text-red-500" onClick={handleDismissReminder}>
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input type="datetime-local" className="flex-1 text-xs" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
                    <Button size="sm" variant="outline" className="h-9 text-xs shrink-0" onClick={handleSetReminder} disabled={saving || !reminderDate}>
                      <Bell className="mr-1 h-3 w-3" />
                      Programmer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              {prospect.status !== "converti" && prospect.status !== "perdu" && (
                <>
                  <Card className="rounded-xl border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Date et heure de livraison</Label>
                        <Input
                          type="datetime-local"
                          className="text-sm"
                          value={deliveryDateTime}
                          onChange={(e) => setDeliveryDateTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Document a generer apres conversion</Label>
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={convertDocumentType}
                          onChange={(e) => setConvertDocumentType(e.target.value as "none" | "invoice" | "delivery_note")}
                        >
                          <option value="none">Aucun document automatique</option>
                          <option value="invoice">Facture</option>
                          <option value="delivery_note">Bon de livraison (BL)</option>
                        </select>
                      </div>
                    </CardContent>
                  </Card>

                  <Button className="w-full bg-[#4A7C59] hover:bg-[#3d6b4a] text-white" onClick={handleConvertToOrder}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Convertir en commande
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                </>
              )}

              {prospect.status === "converti" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Ce prospect a ete converti en commande
                </div>
              )}

              {prospect.status !== "perdu" && prospect.status !== "converti" && (
                <Button variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleStatusChange("perdu")}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Marquer comme perdu
                </Button>
              )}

              {prospect.status === "perdu" && (
                <Button variant="outline" className="w-full" onClick={() => handleStatusChange("nouveau")}>
                  Reactiver ce prospect
                </Button>
              )}

              <Button variant="ghost" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50/50 text-xs" onClick={() => setShowDeleteAlert(true)}>
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Supprimer definitivement
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le prospect &quot;{prospect.name}&quot; sera supprime definitivement. Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={onDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
