"use client"

import { useEffect, useState } from "react"
import { Loader2, Trash2, Phone, MessageCircle, Instagram, Globe, Users, Bell, BellOff, ShoppingCart, ArrowRight, Calendar, StickyNote, CheckCircle2, XCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const [quoteAmount, setQuoteAmount] = useState(prospect.quoteAmount ? String(prospect.quoteAmount) : "")
  const [quoteNotes, setQuoteNotes] = useState(prospect.quoteNotes || "")
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
    setQuoteAmount(prospect.quoteAmount ? String(prospect.quoteAmount) : "")
    setQuoteNotes(prospect.quoteNotes || "")
  }, [prospect])

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
    setSaving(true)
    const ok = await updateProspectCommercialDetails(prospect.id, {
      eventType: eventType === "none" ? null : eventType,
      eventDate: eventDate || null,
      quoteStatus,
      quoteAmount: quoteAmount ? parseFloat(quoteAmount) : null,
      quoteNotes: quoteNotes.trim() || null,
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
    // Navigate to commandes with prospect data pre-filled via query params
    const params = new URLSearchParams({
      fromProspect: prospect.id,
      customerName: prospect.name,
      customerPhone: prospect.phone || "",
      source: prospect.source === "phone" ? "phone" : prospect.source,
    })
    onOpenChange(false)
    router.push(`/commandes?${params.toString()}`)
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
                    <Select value={eventType} onValueChange={(v) => setEventType(v as "none" | "fete" | "mariage")}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        <SelectItem value="fete">Fete</SelectItem>
                        <SelectItem value="mariage">Mariage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Date evenement</Label>
                    <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Statut devis</Label>
                    <Select value={quoteStatus} onValueChange={(v) => setQuoteStatus(v as Prospect["quoteStatus"])}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="non_demande">Non demande</SelectItem>
                        <SelectItem value="a_preparer">A preparer</SelectItem>
                        <SelectItem value="envoye">Envoye</SelectItem>
                        <SelectItem value="accepte">Accepte</SelectItem>
                        <SelectItem value="refuse">Refuse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Montant devis (TND)</Label>
                    <Input type="number" min="0" step="0.001" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />
                  </div>
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
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleSaveCommercial} disabled={saving}>
                  {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  Enregistrer devis/suivi
                </Button>
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
                <Button className="w-full bg-[#4A7C59] hover:bg-[#3d6b4a] text-white" onClick={handleConvertToOrder}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Convertir en commande
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
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
