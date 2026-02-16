"use client"

import { useState } from "react"
import { Plus, Minus, ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, Package } from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
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
import { toast } from "sonner"

interface StockMovementDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: { id: string; name: string; type: "raw" | "finished" } | null
}

export function StockMovementDrawer({ open, onOpenChange, item }: StockMovementDrawerProps) {
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [location, setLocation] = useState("labo")

  const handleSubmit = (action: "add" | "remove" | "transfer") => {
    if (!quantity) {
      toast.error("Veuillez entrer une quantite")
      return
    }

    const actionLabels = {
      add: "Entree de stock",
      remove: "Sortie de stock",
      transfer: "Transfert",
    }

    toast.success(`${actionLabels[action]} enregistre`, {
      description: `${quantity} unites ${item ? `de ${item.name}` : ""}`,
    })

    setQuantity("")
    setReason("")
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0 [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-primary-foreground">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {item ? `Mouvement: ${item.name}` : "Mouvement de stock"}
              </h2>
              <p className="text-sm text-primary-foreground/70">Entree, sortie ou transfert</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6">
          <Tabs defaultValue="add">
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/70 p-1">
              <TabsTrigger value="add" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <ArrowDownToLine className="h-3.5 w-3.5" />
                Entree
              </TabsTrigger>
              <TabsTrigger value="remove" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <ArrowUpFromLine className="h-3.5 w-3.5" />
                Sortie
              </TabsTrigger>
              <TabsTrigger value="transfer" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Transfert
              </TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="mt-5 space-y-4">
              <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Quantite</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 text-lg font-semibold text-center h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Motif</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger className="bg-muted/50 border-0">
                      <SelectValue placeholder="Selectionner un motif" />
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
                  <Label className="text-xs font-medium">Destination</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="bg-muted/50 border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="labo">Laboratoire</SelectItem>
                      <SelectItem value="reserve">Reserve</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md h-11" onClick={() => handleSubmit("add")}>
                <Plus className="mr-2 h-4 w-4" />
                {"Enregistrer l'entree"}
              </Button>
            </TabsContent>

            <TabsContent value="remove" className="mt-5 space-y-4">
              <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Quantite</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-destructive/30 text-lg font-semibold text-center h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Motif</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger className="bg-muted/50 border-0">
                      <SelectValue placeholder="Selectionner un motif" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Vente</SelectItem>
                      <SelectItem value="production">Utilisation production</SelectItem>
                      <SelectItem value="waste">Perte/Perime</SelectItem>
                      <SelectItem value="adjustment">Ajustement inventaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full rounded-xl h-11" variant="destructive" onClick={() => handleSubmit("remove")}>
                <Minus className="mr-2 h-4 w-4" />
                Enregistrer la sortie
              </Button>
            </TabsContent>

            <TabsContent value="transfer" className="mt-5 space-y-4">
              <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Quantite</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 text-lg font-semibold text-center h-12"
                  />
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">De</Label>
                    <Select defaultValue="reserve">
                      <SelectTrigger className="bg-muted/50 border-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reserve">Reserve</SelectItem>
                        <SelectItem value="labo">Laboratoire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground mb-2.5" />
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Vers</Label>
                    <Select defaultValue="labo">
                      <SelectTrigger className="bg-muted/50 border-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="labo">Laboratoire</SelectItem>
                        <SelectItem value="reserve">Reserve</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button className="w-full rounded-xl h-11 bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={() => handleSubmit("transfer")}>
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
