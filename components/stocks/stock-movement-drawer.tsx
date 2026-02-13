"use client"

import { useState } from "react"
import { Plus, Minus, ArrowLeftRight } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStock } from "@/lib/stock-context"
import { toast } from "sonner"

interface StockMovementDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: { id: string; name: string; type: "raw" | "finished" } | null
}

export function StockMovementDrawer({ open, onOpenChange, item }: StockMovementDrawerProps) {
  const { addRawMaterialStock, removeRawMaterialStock, addFinishedProductStock, removeFinishedProductStock } = useStock()
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [location, setLocation] = useState("labo")

  const handleSubmit = (action: "add" | "remove" | "transfer") => {
    if (!quantity) {
      toast.error("Veuillez entrer une quantité")
      return
    }

    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantité invalide")
      return
    }

    // Apply real stock changes if an item is selected
    if (item) {
      if (action === "add") {
        if (item.type === "raw") {
          addRawMaterialStock(item.id, qty)
        } else {
          addFinishedProductStock(item.id, qty)
        }
      } else if (action === "remove") {
        if (item.type === "raw") {
          removeRawMaterialStock(item.id, qty)
        } else {
          removeFinishedProductStock(item.id, qty)
        }
      }
      // Transfer: remove from current location is handled as a UI-only action for now
    }

    const actionLabels = {
      add: "Entrée de stock",
      remove: "Sortie de stock",
      transfer: "Transfert",
    }

    toast.success(`${actionLabels[action]} enregistré`, {
      description: `${quantity} unités ${item ? `de ${item.name}` : ""}`,
    })

    setQuantity("")
    setReason("")
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {item ? `Mouvement: ${item.name}` : "Nouveau mouvement de stock"}
          </SheetTitle>
          <SheetDescription>
            Enregistrez une entrée, sortie ou transfert de stock
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="add">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="add" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Entrée
              </TabsTrigger>
              <TabsTrigger value="remove" className="gap-1.5">
                <Minus className="h-3.5 w-3.5" />
                Sortie
              </TabsTrigger>
              <TabsTrigger value="transfer" className="gap-1.5">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Transfert
              </TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="quantity-add">Quantité</Label>
                <Input
                  id="quantity-add"
                  type="number"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason-add">Motif</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason-add">
                    <SelectValue placeholder="Sélectionner un motif" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Achat fournisseur</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="return">Retour client</SelectItem>
                    <SelectItem value="adjustment">Ajustement inventaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-add">Destination</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger id="location-add">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="labo">Laboratoire</SelectItem>
                    <SelectItem value="reserve">Réserve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => handleSubmit("add")}>
                <Plus className="mr-2 h-4 w-4" />
                Enregistrer l{"'"}entrée
              </Button>
            </TabsContent>

            <TabsContent value="remove" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="quantity-remove">Quantité</Label>
                <Input
                  id="quantity-remove"
                  type="number"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason-remove">Motif</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason-remove">
                    <SelectValue placeholder="Sélectionner un motif" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Vente</SelectItem>
                    <SelectItem value="production">Utilisation production</SelectItem>
                    <SelectItem value="waste">Perte/Périmé</SelectItem>
                    <SelectItem value="adjustment">Ajustement inventaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" variant="destructive" onClick={() => handleSubmit("remove")}>
                <Minus className="mr-2 h-4 w-4" />
                Enregistrer la sortie
              </Button>
            </TabsContent>

            <TabsContent value="transfer" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="quantity-transfer">Quantité</Label>
                <Input
                  id="quantity-transfer"
                  type="number"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>De</Label>
                  <Select defaultValue="reserve">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reserve">Réserve</SelectItem>
                      <SelectItem value="labo">Laboratoire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vers</Label>
                  <Select defaultValue="labo">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="labo">Laboratoire</SelectItem>
                      <SelectItem value="reserve">Réserve</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full" variant="secondary" onClick={() => handleSubmit("transfer")}>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Effectuer le transfert
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
