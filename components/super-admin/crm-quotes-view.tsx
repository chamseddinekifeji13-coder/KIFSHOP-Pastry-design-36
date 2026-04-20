"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import {
  FileText,
  Plus,
  Loader2,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Download,
  Copy,
  MoreVertical,
  Building2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { fetchQuotes, createQuote, updateQuoteStatus } from "@/lib/super-admin/crm-actions"
import { fetchPlatformProspects } from "@/lib/super-admin/prospect-actions"
import { PlatformProspect } from "@/lib/super-admin/prospect-types"
import {
  CrmQuote,
  QuoteStatus,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS
} from "@/lib/super-admin/crm-types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value) + " TND"
}

interface QuoteItem {
  productName: string
  description: string
  quantity: number
  unitPrice: number
  discountPercent: number
}

const DEFAULT_PRODUCTS = [
  { name: "Abonnement KIFSHOP Basic - Mensuel", price: 99 },
  { name: "Abonnement KIFSHOP Basic - Annuel", price: 990 },
  { name: "Abonnement KIFSHOP Premium - Mensuel", price: 199 },
  { name: "Abonnement KIFSHOP Premium - Annuel", price: 1990 },
  { name: "Formation initiale (2h)", price: 150 },
  { name: "Formation avancee (4h)", price: 280 },
  { name: "Installation et configuration", price: 200 },
  { name: "Support prioritaire - Mensuel", price: 50 },
  { name: "Migration de donnees", price: 300 }
]

export function CrmQuotesView() {
  const [quotes, setQuotes] = useState<CrmQuote[]>([])
  const [prospects, setProspects] = useState<PlatformProspect[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<CrmQuote | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("all")

  // New quote form
  const [prospectId, setProspectId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("Paiement a 30 jours")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<QuoteItem[]>([
    { productName: "", description: "", quantity: 1, unitPrice: 0, discountPercent: 0 }
  ])

  const loadData = async () => {
    setLoading(true)
    const [quotesData, prospectsData] = await Promise.all([
      fetchQuotes(),
      fetchPlatformProspects()
    ])
    setQuotes(quotesData)
    setProspects(prospectsData)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredQuotes = filterStatus === "all" 
    ? quotes 
    : quotes.filter(q => q.status === filterStatus)

  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === "draft").length,
    sent: quotes.filter(q => q.status === "sent").length,
    accepted: quotes.filter(q => q.status === "accepted").length,
    totalValue: quotes.reduce((sum, q) => sum + q.total, 0),
    acceptedValue: quotes.filter(q => q.status === "accepted").reduce((sum, q) => sum + q.total, 0)
  }

  const addItem = () => {
    setItems([...items, { productName: "", description: "", quantity: 1, unitPrice: 0, discountPercent: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const selectProduct = (index: number, productName: string) => {
    const product = DEFAULT_PRODUCTS.find(p => p.name === productName)
    if (product) {
      const newItems = [...items]
      newItems[index] = { ...newItems[index], productName: product.name, unitPrice: product.price }
      setItems(newItems)
    }
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice * (1 - item.discountPercent / 100)
      return sum + itemTotal
    }, 0)
  }

  const resetForm = () => {
    setProspectId("")
    setTitle("")
    setDescription("")
    setValidUntil("")
    setPaymentTerms("Paiement a 30 jours")
    setNotes("")
    setItems([{ productName: "", description: "", quantity: 1, unitPrice: 0, discountPercent: 0 }])
  }

  const handleSave = async () => {
    if (!prospectId || !title.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    const validItems = items.filter(item => item.productName && item.unitPrice > 0)
    if (validItems.length === 0) {
      toast.error("Ajoutez au moins un produit au devis")
      return
    }

    setSaving(true)
    
    const quote = await createQuote({
      prospectId,
      title: title.trim(),
      description: description.trim() || undefined,
      validUntil: validUntil || undefined,
      paymentTerms: paymentTerms.trim() || undefined,
      notes: notes.trim() || undefined,
      items: validItems
    })

    if (quote) {
      toast.success(`Devis ${quote.quoteNumber} cree`)
      resetForm()
      setShowNewDialog(false)
      loadData()
    } else {
      toast.error("Erreur lors de la creation")
    }

    setSaving(false)
  }

  const handleStatusChange = async (id: string, status: QuoteStatus) => {
    const success = await updateQuoteStatus(id, status)
    if (success) {
      toast.success(`Statut mis a jour: ${QUOTE_STATUS_LABELS[status]}`)
      loadData()
      if (selectedQuote?.id === id) {
        setSelectedQuote({ ...selectedQuote, status })
      }
    } else {
      toast.error("Erreur")
    }
  }

  const viewQuote = (quote: CrmQuote) => {
    setSelectedQuote(quote)
    setShowDetailDialog(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Devis & Propositions</h1>
          <p className="text-sm text-muted-foreground">Gerez vos propositions commerciales</p>
        </div>
        <Button 
          onClick={() => setShowNewDialog(true)}
          className="bg-[#4A7C59] hover:bg-[#3d6649] gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouveau devis
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total devis</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Brouillons</p>
                <p className="text-2xl font-bold">{stats.draft}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Send className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Envoyes</p>
                <p className="text-2xl font-bold">{stats.sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Acceptes</p>
                <p className="text-2xl font-bold">{stats.accepted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valeur acceptee</p>
                <p className="text-lg font-bold">{formatCurrency(stats.acceptedValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Liste des devis</CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {(Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{QUOTE_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Devis</TableHead>
                <TableHead>Prospect</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun devis trouve
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotes.map(quote => (
                  <TableRow key={quote.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewQuote(quote)}>
                    <TableCell className="font-mono text-sm">{quote.quoteNumber}</TableCell>
                    <TableCell>{quote.prospectName || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{quote.title}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(quote.total)}</TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", QUOTE_STATUS_COLORS[quote.status])}>
                        {QUOTE_STATUS_LABELS[quote.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(quote.createdAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); viewQuote(quote) }}>
                            <Eye className="h-4 w-4 mr-2" /> Voir
                          </DropdownMenuItem>
                          {quote.status === "draft" && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(quote.id, "sent") }}>
                              <Send className="h-4 w-4 mr-2" /> Marquer comme envoye
                            </DropdownMenuItem>
                          )}
                          {(quote.status === "sent" || quote.status === "viewed") && (
                            <>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(quote.id, "accepted") }}>
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Accepte
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(quote.id, "rejected") }}>
                                <XCircle className="h-4 w-4 mr-2" /> Refuse
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Quote Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau devis</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Prospect and Title */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prospect *</Label>
                <Select value={prospectId} onValueChange={setProspectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner un prospect" />
                  </SelectTrigger>
                  <SelectContent>
                    {prospects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {p.businessName}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Titre du devis *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Proposition abonnement KIFSHOP"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de l'offre..."
                rows={2}
              />
            </div>

            <Separator />

            {/* Products */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Produits / Services</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
              </div>

              {items.map((item, index) => (
                <Card key={index} className="p-3">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Produit</Label>
                        <Select 
                          value={item.productName} 
                          onValueChange={(v) => selectProduct(index, v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selectionner ou saisir" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEFAULT_PRODUCTS.map(p => (
                              <SelectItem key={p.name} value={p.name}>
                                {p.name} - {formatCurrency(p.price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {items.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          className="shrink-0 mt-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Quantite</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prix unitaire</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Remise %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) => updateItem(index, "discountPercent", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Total</Label>
                        <div className="h-9 flex items-center px-3 bg-muted rounded-md text-sm font-medium">
                          {formatCurrency(item.quantity * item.unitPrice * (1 - item.discountPercent / 100))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {/* Totals */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sous-total HT</span>
                  <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>TVA (19%)</span>
                  <span className="font-medium">{formatCurrency(calculateSubtotal() * 0.19)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total TTC</span>
                  <span>{formatCurrency(calculateSubtotal() * 1.19)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Validite jusqu'au</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Conditions de paiement</Label>
                <Input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Ex: Paiement a 30 jours"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes internes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (non visibles par le client)..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-[#4A7C59] hover:bg-[#3d6649]"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creation...</>
              ) : (
                "Creer le devis"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Devis {selectedQuote?.quoteNumber}
            </DialogTitle>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold">{selectedQuote.title}</p>
                  <p className="text-sm text-muted-foreground">{selectedQuote.prospectName}</p>
                </div>
                <Badge className={cn("text-sm", QUOTE_STATUS_COLORS[selectedQuote.status])}>
                  {QUOTE_STATUS_LABELS[selectedQuote.status]}
                </Badge>
              </div>

              {selectedQuote.description && (
                <p className="text-sm text-muted-foreground">{selectedQuote.description}</p>
              )}

              <Separator />

              {/* Items */}
              <div className="space-y-2">
                <h4 className="font-medium">Produits / Services</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">Qte</TableHead>
                      <TableHead className="text-right">Prix unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedQuote.items || []).map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sous-total HT</span>
                  <span>{formatCurrency(selectedQuote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>TVA ({selectedQuote.taxPercent}%)</span>
                  <span>{formatCurrency(selectedQuote.taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total TTC</span>
                  <span>{formatCurrency(selectedQuote.total)}</span>
                </div>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Cree le:</span>{" "}
                  {new Date(selectedQuote.createdAt).toLocaleDateString("fr-FR")}
                </div>
                {selectedQuote.validUntil && (
                  <div>
                    <span className="text-muted-foreground">Valide jusqu'au:</span>{" "}
                    {new Date(selectedQuote.validUntil).toLocaleDateString("fr-FR")}
                  </div>
                )}
                {selectedQuote.sentAt && (
                  <div>
                    <span className="text-muted-foreground">Envoye le:</span>{" "}
                    {new Date(selectedQuote.sentAt).toLocaleDateString("fr-FR")}
                  </div>
                )}
                {selectedQuote.acceptedAt && (
                  <div>
                    <span className="text-muted-foreground">Accepte le:</span>{" "}
                    {new Date(selectedQuote.acceptedAt).toLocaleDateString("fr-FR")}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedQuote.status === "draft" && (
                  <Button 
                    onClick={() => handleStatusChange(selectedQuote.id, "sent")}
                    className="bg-[#4A7C59] hover:bg-[#3d6649]"
                  >
                    <Send className="h-4 w-4 mr-2" /> Marquer comme envoye
                  </Button>
                )}
                {(selectedQuote.status === "sent" || selectedQuote.status === "viewed") && (
                  <>
                    <Button 
                      onClick={() => handleStatusChange(selectedQuote.id, "accepted")}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Accepte
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleStatusChange(selectedQuote.id, "rejected")}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Refuse
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => setShowDetailDialog(false)} className="ml-auto">
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
