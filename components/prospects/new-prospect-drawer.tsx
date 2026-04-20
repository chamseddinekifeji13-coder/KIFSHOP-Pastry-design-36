"use client"

import { useState } from "react"
import { Loader2, UserPlus, Instagram, Globe, MessageCircle, Phone, Users, Sparkles, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useTenant } from "@/lib/tenant-context"
import { createProspect, createProspectsBulk, extractPhonesFromText } from "@/lib/prospects/actions"
import { toast } from "sonner"

type EventType = "fete" | "mariage"
type QuoteStatus = "non_demande" | "a_preparer" | "envoye" | "accepte" | "refuse"

interface NewProspectDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function NewProspectDrawer({ open, onOpenChange, onSuccess }: NewProspectDrawerProps) {
  const { currentTenant } = useTenant()
  const [tab, setTab] = useState<string>("manual")
  const [submitting, setSubmitting] = useState(false)

  // Manual form
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [source, setSource] = useState("instagram")
  const [message, setMessage] = useState("")
  const [notes, setNotes] = useState("")
  const [reminderDate, setReminderDate] = useState("")
  const [eventType, setEventType] = useState<EventType | "none">("none")
  const [eventDate, setEventDate] = useState("")
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>("non_demande")
  const [quoteAmount, setQuoteAmount] = useState("")
  const [quoteNotes, setQuoteNotes] = useState("")

  // Bulk extraction
  const [rawText, setRawText] = useState("")
  const [bulkSource, setBulkSource] = useState("instagram")
  const [extracted, setExtracted] = useState<{ name: string; phone: string }[]>([])

  function resetForm() {
    setName(""); setPhone(""); setSource("instagram"); setMessage("")
    setNotes(""); setReminderDate(""); setRawText(""); setExtracted([])
    setEventType("none"); setEventDate(""); setQuoteStatus("non_demande"); setQuoteAmount(""); setQuoteNotes("")
  }

  async function handleManualSubmit() {
    if (!name.trim()) { toast.error("Veuillez entrer le nom du prospect"); return }
    setSubmitting(true)
    const result = await createProspect(currentTenant.id, {
      name: name.trim(),
      phone: phone.trim() || undefined,
      source,
      message: message.trim() || undefined,
      notes: notes.trim() || undefined,
      eventType: eventType === "none" ? undefined : eventType,
      eventDate: eventDate || undefined,
      quoteStatus: quoteStatus || undefined,
      quoteAmount: quoteAmount ? parseFloat(quoteAmount) : undefined,
      quoteNotes: quoteNotes.trim() || undefined,
      reminderAt: reminderDate ? new Date(reminderDate).toISOString() : undefined,
    })
    setSubmitting(false)
    if (result) {
      toast.success("Prospect ajoute", { description: result.name })
      resetForm(); onOpenChange(false); onSuccess()
    } else toast.error("Erreur lors de la creation")
  }

  function handleExtract() {
    if (!rawText.trim()) { toast.error("Collez un texte contenant des numeros de telephone"); return }
    const results = extractPhonesFromText(rawText)
    if (results.length === 0) {
      toast.error("Aucun numero de telephone detecte dans le texte")
      return
    }
    setExtracted(results)
    toast.success(`${results.length} numero(s) detecte(s)`)
  }

  async function handleBulkSubmit() {
    if (extracted.length === 0) return
    setSubmitting(true)
    const count = await createProspectsBulk(
      currentTenant.id,
      extracted.map(e => ({ ...e, source: bulkSource }))
    )
    setSubmitting(false)
    if (count > 0) {
      toast.success(`${count} prospects ajoutes`)
      resetForm(); onOpenChange(false); onSuccess()
    } else toast.error("Erreur lors de l'import")
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4A7C59]/10 to-[#D4A373]/10 p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#4A7C59]/15">
              <UserPlus className="h-5 w-5 text-[#4A7C59]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Nouveau prospect</h2>
              <p className="text-xs text-muted-foreground">Ajoutez un contact ou importez depuis un texte</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="manual" className="text-xs">
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Saisie manuelle
              </TabsTrigger>
              <TabsTrigger value="extract" className="text-xs">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Extraction auto
              </TabsTrigger>
            </TabsList>

            {/* Manual Tab */}
            <TabsContent value="manual" className="mt-4 space-y-4">
              <Card className="rounded-xl border shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Nom du prospect *</Label>
                    <Input placeholder="Ex: Sami Ben Ali" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Telephone</Label>
                    <Input placeholder="Ex: +216 98 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Source</Label>
                    <Select value={source} onValueChange={setSource}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram"><span className="flex items-center gap-2"><Instagram className="h-3.5 w-3.5" />Instagram</span></SelectItem>
                        <SelectItem value="tiktok"><span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" />TikTok</span></SelectItem>
                        <SelectItem value="whatsapp"><span className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</span></SelectItem>
                        <SelectItem value="messenger"><span className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5" />Messenger</span></SelectItem>
                        <SelectItem value="facebook"><span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" />Facebook</span></SelectItem>
                        <SelectItem value="phone"><span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />Telephone</span></SelectItem>
                        <SelectItem value="autre"><span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />Autre</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Message du client</Label>
                    <Textarea placeholder="Copiez le message du client ici..." className="min-h-[80px] resize-none" value={message} onChange={(e) => setMessage(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Notes internes</Label>
                    <Textarea placeholder="Ex: Interesse par les gateaux de mariage..." className="min-h-[60px] resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Type evenement</Label>
                      <Select value={eventType} onValueChange={(v) => setEventType(v as EventType | "none")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun</SelectItem>
                          <SelectItem value="fete">Fete</SelectItem>
                          <SelectItem value="mariage">Mariage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Date evenement</Label>
                      <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Statut devis</Label>
                      <Select value={quoteStatus} onValueChange={(v) => setQuoteStatus(v as QuoteStatus)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="non_demande">Non demande</SelectItem>
                          <SelectItem value="a_preparer">A preparer</SelectItem>
                          <SelectItem value="envoye">Envoye</SelectItem>
                          <SelectItem value="accepte">Accepte</SelectItem>
                          <SelectItem value="refuse">Refuse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Montant devis (TND)</Label>
                      <Input type="number" min="0" step="0.001" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Notes devis</Label>
                    <Textarea placeholder="Details du devis mariage/fete..." className="min-h-[60px] resize-none" value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Rappel de relance</Label>
                    <Input type="datetime-local" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
                    <p className="text-[10px] text-muted-foreground">Vous recevrez une notification pour relancer ce prospect</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Extract Tab */}
            <TabsContent value="extract" className="mt-4 space-y-4">
              <Card className="rounded-xl border shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Source des messages</Label>
                    <Select value={bulkSource} onValueChange={setBulkSource}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="messenger">Messenger</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Collez vos messages ici</Label>
                    <Textarea
                      placeholder={"Collez ici les messages/commentaires contenant des numeros...\n\nExemple:\nSami: 98 123 456 je veux commander\nMeriem - 55 987 654 pour samedi svp\n+216 22 333 444 Ali"}
                      className="min-h-[160px] resize-none text-xs font-mono"
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" className="w-full" onClick={handleExtract}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Extraire les numeros
                  </Button>
                </CardContent>
              </Card>

              {extracted.length > 0 && (
                <Card className="rounded-xl border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">{extracted.length} contact(s) detecte(s)</Label>
                      <Badge className="bg-green-100 text-green-700 text-[10px]">Pret a importer</Badge>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-1.5">
                      {extracted.map((e, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                          <span className="font-medium truncate">{e.name}</span>
                          <span className="text-muted-foreground font-mono">{e.phone}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t p-4">
          {tab === "manual" ? (
            <Button className="w-full bg-[#4A7C59] hover:bg-[#3d6b4a] text-white" disabled={submitting} onClick={handleManualSubmit}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Ajouter le prospect
            </Button>
          ) : (
            <Button className="w-full bg-[#4A7C59] hover:bg-[#3d6b4a] text-white" disabled={submitting || extracted.length === 0} onClick={handleBulkSubmit}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Importer {extracted.length} prospect(s)
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
