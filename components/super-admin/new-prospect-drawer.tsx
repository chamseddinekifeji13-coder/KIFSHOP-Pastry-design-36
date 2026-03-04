"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Building2 } from "lucide-react"
import { createPlatformProspect, SOURCE_LABELS, type ProspectSource } from "@/lib/super-admin/prospect-actions"
import { toast } from "sonner"

interface NewProspectDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function NewProspectDrawer({ open, onOpenChange, onCreated }: NewProspectDrawerProps) {
  const [saving, setSaving] = useState(false)
  const [businessName, setBusinessName] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [city, setCity] = useState("")
  const [address, setAddress] = useState("")
  const [source, setSource] = useState<ProspectSource>("direct")
  const [notes, setNotes] = useState("")
  const [nextAction, setNextAction] = useState("")
  const [nextActionDate, setNextActionDate] = useState("")

  const resetForm = () => {
    setBusinessName(""); setOwnerName(""); setPhone(""); setEmail("")
    setCity(""); setAddress(""); setSource("direct"); setNotes("")
    setNextAction(""); setNextActionDate("")
  }

  const handleSubmit = async () => {
    if (!businessName.trim()) { toast.error("Le nom de la patisserie est obligatoire"); return }

    setSaving(true)
    try {
      const result = await createPlatformProspect({
        businessName: businessName.trim(),
        ownerName: ownerName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        source,
        notes: notes.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
        nextActionDate: nextActionDate || undefined,
      })

      if (result) {
        toast.success("Prospect cree avec succes", { description: businessName })
        resetForm()
        onOpenChange(false)
        onCreated()
      } else {
        toast.error("Erreur lors de la creation")
      }
    } catch {
      toast.error("Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-y-auto [&>button[data-slot=dialog-close]]:absolute [&>button[data-slot=dialog-close]]:top-4 [&>button[data-slot=dialog-close]]:right-4 [&>button[data-slot=dialog-close]]:text-white [&>button[data-slot=dialog-close]]:opacity-80 [&>button[data-slot=dialog-close]]:hover:opacity-100 [&>button[data-slot=dialog-close]]:z-50">
        {/* Header */}
        <div className="bg-[#4A7C59] text-white p-6 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <DialogHeader>
                <DialogTitle className="text-white text-lg">Nouveau prospect</DialogTitle>
              </DialogHeader>
              <p className="text-white/80 text-sm">Ajouter une nouvelle patisserie a prospecter</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Info principale */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Nom de la patisserie *</Label>
                <Input placeholder="Ex: Patisserie El Yasmine" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nom du gerant</Label>
                <Input placeholder="Prenom Nom" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telephone</Label>
                <Input placeholder="+216 XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Ville</Label>
                <Input placeholder="Ex: Sousse, Tunis..." value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Adresse</Label>
                <Input placeholder="Adresse complete" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Source + Relance */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Suivi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={source} onValueChange={(v) => setSource(v as ProspectSource)} defaultValue="direct">
                  <SelectTrigger><SelectValue placeholder="Choisir une source" /></SelectTrigger>
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
                <Input placeholder="Ex: Appeler pour planifier une demo" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea placeholder="Informations additionnelles..." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button className="bg-[#4A7C59] hover:bg-[#3d6649] text-white" onClick={handleSubmit} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement...</> : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
