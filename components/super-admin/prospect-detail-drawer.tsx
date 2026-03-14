"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Building2, Phone, Mail, MapPin, CalendarClock, ArrowRight, Edit2, Trash2, Loader2, ChevronRight } from "lucide-react"
import { updatePlatformProspect, deletePlatformProspect } from "@/lib/super-admin/prospect-actions"
import {
  type PlatformProspect, type ProspectStatus, type ProspectSource,
  STATUS_LABELS, STATUS_COLORS, SOURCE_LABELS, PIPELINE_ORDER,
} from "@/lib/super-admin/prospect-types"
import { toast } from "sonner"
import { CrmInteractionsPanel } from "./crm-interactions-panel"

interface ProspectDetailDrawerProps {
  prospect: PlatformProspect
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
  onStatusChange: (id: string, status: ProspectStatus) => void
}

export function ProspectDetailDrawer({ prospect, open, onOpenChange, onUpdated, onStatusChange }: ProspectDetailDrawerProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Edit fields
  const [businessName, setBusinessName] = useState(prospect.businessName)
  const [ownerName, setOwnerName] = useState(prospect.ownerName || "")
  const [phone, setPhone] = useState(prospect.phone || "")
  const [email, setEmail] = useState(prospect.email || "")
  const [city, setCity] = useState(prospect.city || "")
  const [address, setAddress] = useState(prospect.address || "")
  const [source, setSource] = useState<ProspectSource>(prospect.source)
  const [notes, setNotes] = useState(prospect.notes || "")
  const [nextAction, setNextAction] = useState(prospect.nextAction || "")
  const [nextActionDate, setNextActionDate] = useState(prospect.nextActionDate ? prospect.nextActionDate.split("T")[0] : "")

  const nextStatus = (): ProspectStatus | null => {
    const idx = PIPELINE_ORDER.indexOf(prospect.status)
    if (idx >= 0 && idx < PIPELINE_ORDER.length - 1) return PIPELINE_ORDER[idx + 1]
    return null
  }

  const handleSave = async () => {
    if (!businessName.trim()) { toast.error("Le nom est obligatoire"); return }
    setSaving(true)
    const ok = await updatePlatformProspect(prospect.id, {
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      city: city.trim(),
      address: address.trim(),
      source,
      notes: notes.trim(),
      nextAction: nextAction.trim(),
      nextActionDate: nextActionDate || "",
    })
    setSaving(false)
    if (ok) {
      toast.success("Prospect mis a jour")
      setEditing(false)
      onUpdated()
    } else {
      toast.error("Erreur lors de la sauvegarde")
    }
  }

  const handleDelete = async () => {
    if (!confirm("Supprimer ce prospect definitivement ?")) return
    setDeleting(true)
    const ok = await deletePlatformProspect(prospect.id)
    setDeleting(false)
    if (ok) {
      toast.success("Prospect supprime")
      onOpenChange(false)
      onUpdated()
    } else {
      toast.error("Erreur lors de la suppression")
    }
  }

  const handleAdvance = () => {
    const ns = nextStatus()
    if (ns) onStatusChange(prospect.id, ns)
  }

  const handleMarkLost = () => {
    onStatusChange(prospect.id, "perdu")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-y-auto [&>button[data-slot=dialog-close]]:absolute [&>button[data-slot=dialog-close]]:top-4 [&>button[data-slot=dialog-close]]:right-4 [&>button[data-slot=dialog-close]]:text-white [&>button[data-slot=dialog-close]]:opacity-80 [&>button[data-slot=dialog-close]]:hover:opacity-100 [&>button[data-slot=dialog-close]]:z-50">
        {/* Header */}
        <div className="bg-[#4A7C59] text-white p-6 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <DialogHeader>
                <DialogTitle className="text-white text-lg">{prospect.businessName}</DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${STATUS_COLORS[prospect.status]} text-xs`}>{STATUS_LABELS[prospect.status]}</Badge>
                <Badge variant="outline" className="text-white/80 border-white/30 text-xs">{SOURCE_LABELS[prospect.source]}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Actions */}
          {prospect.status !== "converti" && prospect.status !== "perdu" && (
            <div className="flex flex-wrap gap-2">
              {nextStatus() && (
                <Button size="sm" className="bg-[#4A7C59] hover:bg-[#3d6649] text-white" onClick={handleAdvance}>
                  <ArrowRight className="h-4 w-4 mr-1" /> Avancer a &quot;{STATUS_LABELS[nextStatus()!]}&quot;
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
                <Edit2 className="h-4 w-4 mr-1" /> {editing ? "Annuler" : "Modifier"}
              </Button>
              <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleMarkLost}>
                Marquer comme perdu
              </Button>
            </div>
          )}

          {editing ? (
            /* Edit Mode */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nom de la patisserie *</Label>
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nom du gerant</Label>
                  <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Telephone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Adresse</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={source} onValueChange={(v) => setSource(v as ProspectSource)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SOURCE_LABELS) as ProspectSource[]).map(s => (
                        <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date de relance</Label>
                  <Input type="date" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Prochaine action</Label>
                  <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="bg-[#4A7C59] hover:bg-[#3d6649] text-white" onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement...</> : "Enregistrer"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Annuler</Button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {prospect.ownerName && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>Gerant: <strong>{prospect.ownerName}</strong></span>
                    </div>
                  )}
                  {prospect.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${prospect.phone}`} className="text-[#4A7C59] hover:underline">{prospect.phone}</a>
                    </div>
                  )}
                  {prospect.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${prospect.email}`} className="text-[#4A7C59] hover:underline">{prospect.email}</a>
                    </div>
                  )}
                  {prospect.city && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{prospect.address ? `${prospect.address}, ${prospect.city}` : prospect.city}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Pipeline Progress */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pipeline</h3>
                <div className="flex items-center gap-1 flex-wrap">
                  {PIPELINE_ORDER.map((s, i) => {
                    const current = PIPELINE_ORDER.indexOf(prospect.status)
                    const isCurrent = s === prospect.status
                    const isPast = i < current
                    return (
                      <div key={s} className="flex items-center gap-1">
                        <button
                          onClick={() => onStatusChange(prospect.id, s)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            isCurrent ? STATUS_COLORS[s] : isPast ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                        {i < PIPELINE_ORDER.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Next Action */}
              {(prospect.nextAction || prospect.nextActionDate) && (
                <>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Prochaine action</h3>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <CalendarClock className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div>
                          {prospect.nextAction && <p className="text-sm font-medium">{prospect.nextAction}</p>}
                          {prospect.nextActionDate && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(prospect.nextActionDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Notes */}
              {prospect.notes && (
                <>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prospect.notes}</p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Interactions History */}
              <CrmInteractionsPanel prospectId={prospect.id} prospectName={prospect.businessName} />

              <Separator />

              {/* Meta */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Cree le {new Date(prospect.createdAt).toLocaleDateString("fr-FR")}</span>
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-7 text-xs" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Trash2 className="h-3 w-3 mr-1" /> Supprimer</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
