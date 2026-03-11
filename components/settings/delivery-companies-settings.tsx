"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Edit, Truck, Loader2, Phone, Mail, Globe } from "lucide-react"
import { toast } from "sonner"
import { useTenant } from "@/lib/tenant-context"
import {
  fetchDeliveryCompanies,
  createDeliveryCompany,
  updateDeliveryCompany,
  deleteDeliveryCompany,
  toggleDeliveryCompanyStatus,
  type DeliveryCompany,
} from "@/lib/delivery-companies/actions"

export function DeliveryCompaniesSettings() {
  const { currentTenant } = useTenant()
  const [companies, setCompanies] = useState<DeliveryCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<DeliveryCompany | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formWebsite, setFormWebsite] = useState("")
  const [formNotes, setFormNotes] = useState("")

  useEffect(() => {
    if (currentTenant?.id) {
      loadCompanies()
    }
  }, [currentTenant?.id])

  const loadCompanies = async () => {
    if (!currentTenant?.id) return
    setLoading(true)
    try {
      const data = await fetchDeliveryCompanies(currentTenant.id)
      setCompanies(data)
    } catch (error) {
      toast.error("Erreur lors du chargement des societes de livraison")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormName("")
    setFormPhone("")
    setFormEmail("")
    setFormWebsite("")
    setFormNotes("")
    setEditingCompany(null)
  }

  const openDialog = (company?: DeliveryCompany) => {
    if (company) {
      setEditingCompany(company)
      setFormName(company.name)
      setFormPhone(company.contactPhone || "")
      setFormEmail(company.email || "")
      setFormWebsite(company.website || "")
      setFormNotes(company.notes || "")
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!currentTenant?.id || !formName.trim()) {
      toast.error("Le nom est requis")
      return
    }

    setSaving(true)
    try {
      if (editingCompany) {
        // Update
        const success = await updateDeliveryCompany(editingCompany.id, currentTenant.id, {
          name: formName,
          contactPhone: formPhone || null,
          email: formEmail || null,
          website: formWebsite || null,
          notes: formNotes || null,
        })
        if (success) {
          toast.success("Societe mise a jour")
          setDialogOpen(false)
          resetForm()
          loadCompanies()
        } else {
          toast.error("Erreur lors de la mise a jour")
        }
      } else {
        // Create
        const result = await createDeliveryCompany(currentTenant.id, {
          name: formName,
          contactPhone: formPhone || null,
          email: formEmail || null,
          website: formWebsite || null,
          notes: formNotes || null,
        })
        if (result) {
          toast.success("Societe ajoutee")
          setDialogOpen(false)
          resetForm()
          loadCompanies()
        } else {
          toast.error("Erreur lors de la creation (nom deja existant?)")
        }
      }
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (company: DeliveryCompany) => {
    if (!currentTenant?.id) return
    if (!confirm(`Supprimer "${company.name}" ?`)) return

    setDeletingId(company.id)
    try {
      const result = await deleteDeliveryCompany(company.id, currentTenant.id)
      if (result.success) {
        if (result.error) {
          toast.info(result.error)
        } else {
          toast.success("Societe supprimee")
        }
        loadCompanies()
      } else {
        toast.error(result.error || "Erreur lors de la suppression")
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression")
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleStatus = async (company: DeliveryCompany) => {
    if (!currentTenant?.id) return

    const success = await toggleDeliveryCompanyStatus(company.id, currentTenant.id, !company.isActive)
    if (success) {
      toast.success(company.isActive ? "Societe desactivee" : "Societe activee")
      loadCompanies()
    } else {
      toast.error("Erreur lors du changement de statut")
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Societes de Livraison</CardTitle>
              <CardDescription>Gerez vos partenaires de livraison</CardDescription>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCompany ? "Modifier" : "Ajouter"} une societe</DialogTitle>
                <DialogDescription>
                  {editingCompany ? "Modifiez les informations de la societe" : "Ajoutez une nouvelle societe de livraison"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Best Delivery"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telephone</Label>
                    <Input
                      id="phone"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="Ex: 71 234 567"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="Ex: contact@livraison.tn"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="website">Site web</Label>
                  <Input
                    id="website"
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                    placeholder="Ex: www.livraison.tn"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Ex: Livraison express disponible"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
                  Annuler
                </Button>
                <Button onClick={handleSubmit} disabled={saving || !formName.trim()}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCompany ? "Enregistrer" : "Ajouter"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Truck className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucune societe de livraison</p>
            <p className="text-sm text-muted-foreground">Ajoutez vos partenaires de livraison</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {company.contactPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {company.contactPhone}
                        </span>
                      )}
                      {company.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {company.email}
                        </span>
                      )}
                      {company.website && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {company.website}
                        </span>
                      )}
                      {!company.contactPhone && !company.email && !company.website && (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={company.isActive}
                        onCheckedChange={() => handleToggleStatus(company)}
                      />
                      <Badge variant={company.isActive ? "default" : "secondary"}>
                        {company.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(company)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(company)}
                        disabled={deletingId === company.id}
                      >
                        {deletingId === company.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
