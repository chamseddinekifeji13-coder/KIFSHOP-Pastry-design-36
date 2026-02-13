"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { toast } from "sonner"

interface NewTransactionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const inflowCategories = [
  "Vente comptoir",
  "Commande client",
  "Encaissement créance",
  "Apport personnel",
  "Autre entrée",
]

const outflowCategories = [
  "Achat MP",
  "Salaires",
  "Loyer",
  "Électricité",
  "Eau",
  "Transport",
  "Emballage",
  "Maintenance",
  "Autre dépense",
]

export function NewTransactionDrawer({ open, onOpenChange }: NewTransactionDrawerProps) {
  const [transactionType, setTransactionType] = useState<"inflow" | "outflow">("inflow")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [reference, setReference] = useState("")

  const categories = transactionType === "inflow" ? inflowCategories : outflowCategories

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

    // Here you would save to database
    toast.success(
      transactionType === "inflow" 
        ? `Entrée de ${amountNum.toLocaleString("fr-TN")} TND enregistrée`
        : `Sortie de ${amountNum.toLocaleString("fr-TN")} TND enregistrée`
    )

    // Reset form
    setAmount("")
    setCategory("")
    setDescription("")
    setPaymentMethod("")
    setReference("")
    onOpenChange(false)
  }

  const handleTypeChange = (value: "inflow" | "outflow") => {
    setTransactionType(value)
    setCategory("") // Reset category when type changes
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nouvelle transaction</SheetTitle>
          <SheetDescription>
            Enregistrez une entrée ou sortie de caisse
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Transaction Type */}
          <div className="space-y-3">
            <Label>Type de transaction</Label>
            <RadioGroup
              value={transactionType}
              onValueChange={(value) => handleTypeChange(value as "inflow" | "outflow")}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="inflow"
                  id="inflow"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="inflow"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <ArrowUpCircle className="mb-2 h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Entrée</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="outflow"
                  id="outflow"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="outflow"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive [&:has([data-state=checked])]:border-destructive cursor-pointer"
                >
                  <ArrowDownCircle className="mb-2 h-6 w-6 text-destructive" />
                  <span className="text-sm font-medium">Sortie</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Montant (TND) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.001"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment">Mode de paiement</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="card">Carte bancaire</SelectItem>
                <SelectItem value="transfer">Virement</SelectItem>
                <SelectItem value="check">Chèque</SelectItem>
                <SelectItem value="mobile">Paiement mobile</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">Référence</Label>
            <Input
              id="reference"
              placeholder="N° facture, chèque, etc."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Notes additionnelles..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Summary */}
          {amount && category && (
            <div className={`rounded-lg p-4 ${
              transactionType === "inflow" ? "bg-primary/10" : "bg-destructive/10"
            }`}>
              <p className="text-sm font-medium">Résumé</p>
              <p className={`text-lg font-bold ${
                transactionType === "inflow" ? "text-primary" : "text-destructive"
              }`}>
                {transactionType === "inflow" ? "+" : "-"}
                {parseFloat(amount || "0").toLocaleString("fr-TN")} TND
              </p>
              <p className="text-sm text-muted-foreground">{category}</p>
            </div>
          )}
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            Enregistrer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
