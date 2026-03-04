"use client"

import { useState } from "react"
import {
  Plus, Pencil, Trash2, Warehouse, Snowflake, Store, FlaskConical, MapPin, Loader2, MoreHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import { useStorageLocations } from "@/hooks/use-tenant-data"
import {
  createStorageLocation, updateStorageLocation, deleteStorageLocation,
  LOCATION_TYPE_LABELS, type StorageLocation,
} from "@/lib/stocks/actions"

const TYPE_ICONS: Record<string, React.ReactNode> = {
  reserve: <Warehouse className="h-5 w-5" />,
  laboratoire: <FlaskConical className="h-5 w-5" />,
  boutique: <Store className="h-5 w-5" />,
  chambre_froide: <Snowflake className="h-5 w-5" />,
  autre: <MapPin className="h-5 w-5" />,
}

const TYPE_COLORS: Record<string, string> = {
  reserve: "bg-amber-100 text-amber-700",
  laboratoire: "bg-blue-100 text-blue-700",
  boutique: "bg-emerald-100 text-emerald-700",
  chambre_froide: "bg-cyan-100 text-cyan-700",
  autre: "bg-gray-100 text-gray-700",
}

export function StorageLocationsTable() {
  const { currentTenant } = useTenant()
  const { data: locations = [], mutate } = useStorageLocations()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [designation, setDesignation] = useState("")
  const [type, setType] = useState("reserve")
  const [description, setDescription] = useState("")
  const [isDefault, setIsDefault] = useState(false)

  const resetForm = () => {
    setName(""); setDesignation(""); setType("reserve"); setDescription(""); setIsDefault(false)
    setEditingLocation(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (loc: StorageLocation) => {
    setEditingLocation(loc)
    setName(loc.name)
    setDesignation(loc.designation || "")
    setType(loc.type)
    setDescription(loc.description || "")
    setIsDefault(loc.isDefault)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Le nom est obligatoire"); return }
    setSaving(true)
    try {
      if (editingLocation) {
        const success = await updateStorageLocation(editingLocation.id, {
          name, designation, type, description, isDefault,
        })
        if (success) { toast.success("Emplacement mis a jour"); mutate(); setDialogOpen(false); resetForm() }
        else toast.error("Erreur lors de la mise a jour")
      } else {
        const result = await createStorageLocation(currentTenant.id, {
          name, designation, type, description, isDefault,
        })
        if (result) { toast.success("Emplacement cree"); mutate(); setDialogOpen(false); resetForm() }
        else toast.error("Erreur lors de la creation")
      }
    } catch { toast.error("Erreur inattendue") }
    finally { setSaving(false) }
  }

  const handleDelete = async (loc: StorageLocation) => {
    if (loc.isDefault) { toast.error("Impossible de supprimer l'emplacement par defaut"); return }
    const success = await deleteStorageLocation(loc.id)
    if (success) { toast.success("Emplacement supprime"); mutate() }
    else toast.error("Erreur lors de la suppression")
  }

  const handleToggleActive = async (loc: StorageLocation) => {
    const success = await updateStorageLocation(loc.id, { isActive: !loc.isActive })
    if (success) { mutate() }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Emplacements de stockage</h3>
          <p className="text-xs text-muted-foreground">{locations.length} emplacement(s) configure(s)</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </Button>
      </div>

      {locations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
              <Warehouse className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Aucun emplacement</p>
            <p className="text-xs text-muted-foreground mb-4">Creez vos reserves, laboratoires et autres emplacements</p>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Creer le premier emplacement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {locations.map((loc) => (
            <Card key={loc.id} className={`relative transition-all ${!loc.isActive ? "opacity-50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TYPE_COLORS[loc.type] || TYPE_COLORS.autre}`}>
                      {TYPE_ICONS[loc.type] || TYPE_ICONS.autre}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{loc.name}</p>
                        {loc.isDefault && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Par defaut</Badge>}
                      </div>
                      {loc.designation && (
                        <p className="text-xs text-muted-foreground mt-0.5">{loc.designation}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {LOCATION_TYPE_LABELS[loc.type] || loc.type}
                        </Badge>
                        {!loc.isActive && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Inactif</Badge>}
                      </div>
                      {loc.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{loc.description}</p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(loc)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(loc)}>
                        {loc.isActive ? "Desactiver" : "Activer"}
                      </DropdownMenuItem>
                      {!loc.isDefault && (
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(loc)}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm() }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Modifier l'emplacement" : "Nouvel emplacement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Nom *</Label>
              <Input placeholder="Ex: Reserve principale" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Designation</Label>
              <Input placeholder="Ex: Sous-sol batiment A" value={designation} onChange={(e) => setDesignation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LOCATION_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea placeholder="Details sur cet emplacement..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-xs font-medium">Emplacement par defaut</Label>
                <p className="text-[10px] text-muted-foreground">Utilise automatiquement pour les nouvelles entrees</p>
              </div>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingLocation ? "Mettre a jour" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
