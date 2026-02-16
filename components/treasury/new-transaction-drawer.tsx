"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowUpCircle, ArrowDownCircle, Wallet, Receipt } from "lucide-react"
import { toast } from "sonner"

interface NewTransactionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const inflowCategories = [
  "Vente comptoir", "Commande client", "Encaissement creance", "Apport personnel", "Autre entree",
]
const outflowCategories = [
  "Achat MP", "Salaires", "Loyer", "Electricite", "Eau", "Transport", "Emballage", "Maintenance", "Autre depense",
]

export function NewTransactionDrawer({ open, onOpenChange }: NewTransactionDrawerProps) {
  const [transactionType, setTransactionType] = useState<"inflow" | "outflow">("inflow")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [reference, setReference] = useState("")

  const categories = transactionType === "inflow" ? inflowCategories : outflowCategories
  const isInflow = transactionType === "inflow"

  const handleSubmit = () => {
    if (!amount || !category) {
      toast.error("Veuillez remplir les champs obligatoires")
      return
    }
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Montant invalide")
      return
    }
    toast.success(
      isInflow
        ? `Entree de ${amountNum.toLocaleString("fr-TN")} TND enregistree`
        : `Sortie de ${amountNum.toLocaleString("fr-TN")} TND enregistree`
    )
    setAmount(""); setCategory(""); setDescription(""); setPaymentMethod(""); setReference("")
    onOpenChange(false)
  }

  const handleTypeChange = (value: "inflow" | "outflow") => {
    setTransactionType(value)
    setCategory("")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col gap-0 overflow-y-auto [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
        {/* Header Banner */}
        <div className={`px-6 py-8 text-white ${isInflow ? "bg-gradient-to-br from-primary to-primary/80" : "bg-gradient-to-br from-destructive to-destructive/80"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Nouvelle transaction</h2>
              <p className="text-sm text-white/70">Enregistrez une entree ou sortie de caisse</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-5">
          {/* Transaction Type */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleTypeChange("inflow")}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                isInflow
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-muted hover:border-muted-foreground/20 hover:bg-muted/50"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isInflow ? "bg-primary/10" : "bg-muted"}`}>
                <ArrowUpCircle className={`h-5 w-5 ${isInflow ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <span className={`text-sm font-medium ${isInflow ? "text-primary" : "text-muted-foreground"}`}>Entree</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("outflow")}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                !isInflow
                  ? "border-destructive bg-destructive/5 shadow-sm"
                  : "border-muted hover:border-muted-foreground/20 hover:bg-muted/50"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${!isInflow ? "bg-destructive/10" : "bg-muted"}`}>
                <ArrowDownCircle className={`h-5 w-5 ${!isInflow ? "text-destructive" : "text-muted-foreground"}`} />
              </div>
              <span className={`text-sm font-medium ${!isInflow ? "text-destructive" : "text-muted-foreground"}`}>Sortie</span>
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Receipt className="h-3.5 w-3.5" />
              Details
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Montant (TND) *</Label>
                <Input
                  type="number"
                  placeholder="0.000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.001"
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 text-lg font-semibold text-center h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Categorie *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-muted/50 border-0">
                    <SelectValue placeholder="Selectionner une categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Mode de paiement</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="bg-muted/50 border-0">
                    <SelectValue placeholder="Selectionner un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Especes</SelectItem>
                    <SelectItem value="card">Carte bancaire</SelectItem>
                    <SelectItem value="transfer">Virement</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                    <SelectItem value="mobile">Paiement mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Reference</Label>
                <Input
                  placeholder="N facture, cheque, etc."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  placeholder="Notes additionnelles..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          {amount && category && (
            <div className={`rounded-xl border-2 p-4 ${
              isInflow ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"
            }`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Resume</p>
              <p className={`text-2xl font-bold ${isInflow ? "text-primary" : "text-destructive"}`}>
                {isInflow ? "+" : "-"}{parseFloat(amount || "0").toLocaleString("fr-TN")} TND
              </p>
              <p className="text-sm text-muted-foreground mt-1">{category}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-4 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            className={`flex-1 rounded-xl shadow-md hover:shadow-lg transition-all text-white ${
              isInflow ? "bg-primary hover:bg-primary/90" : "bg-destructive hover:bg-destructive/90"
            }`}
            onClick={handleSubmit}
          >
            Enregistrer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
