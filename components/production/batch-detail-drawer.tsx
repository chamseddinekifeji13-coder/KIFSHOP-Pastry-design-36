"use client"

import { useState, useEffect } from "react"
import { Package, Plus, Loader2, Scale, Hash, StickyNote, Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { useTenant } from "@/lib/tenant-context"
import { usePackaging, useFinishedProducts } from "@/hooks/use-tenant-data"
import { addPackagingSession, fetchBatchPackagingSessions, type ProductionBatch, type BatchPackagingSession } from "@/lib/production/actions"
import { toast } from "sonner"
import { useSWRConfig } from "swr"
import useSWR from "swr"

interface BatchDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: ProductionBatch | null
}

export function BatchDetailDrawer({ open, onOpenChange, batch }: BatchDetailDrawerProps) {
  const { currentTenant } = useTenant()
  const { data: packagingList = [] } = usePackaging()
  const { data: finishedProducts = [] } = useFinishedProducts()
  const { mutate } = useSWRConfig()

  const { data: sessions = [], mutate: mutateSessions } = useSWR(
    batch && open ? ["batch-sessions", batch.id] : null,
    ([_, batchId]) => fetchBatchPackagingSessions(batchId),
    { revalidateOnFocus: false }
  )

  const [selectedPackaging, setSelectedPackaging] = useState("")
  const [weight, setWeight] = useState("")
  const [qty, setQty] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [openCombobox, setOpenCombobox] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedPackaging("")
      setWeight("")
      setQty("")
      setNotes("")
    }
  }, [open])

  if (!batch) return null

  const progressPercent = batch.producedQuantity > 0
    ? Math.max(0, Math.min(100, ((batch.producedQuantity - batch.remainingQuantity) / batch.producedQuantity) * 100))
    : 0

  // Find finished product linked to this batch's recipe
  const linkedProduct = batch.recipeId
    ? finishedProducts.find((fp: any) => fp.recipeId === batch.recipeId)
    : null

  const handleAddSession = async () => {
    if (!selectedPackaging || !weight || !qty) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    const pkg = packagingList.find((p: any) => p.id === selectedPackaging)
    if (!pkg) return

    setSaving(true)
    try {
      await addPackagingSession(currentTenant.id, batch.id, {
        finishedProductId: linkedProduct?.id,
        packagingId: selectedPackaging,
        packagingName: pkg.name,
        weightGrams: parseFloat(weight),
        quantity: parseInt(qty),
        notes: notes.trim() || undefined,
      })
      toast.success("Session de conditionnement ajoutee", {
        description: `${qty} x ${pkg.name} (${weight}g)`,
      })
      mutateSessions()
      mutate((key: string) => typeof key === "string" && key.includes("batches"))
      setSelectedPackaging("")
      setWeight("")
      setQty("")
      setNotes("")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'ajout"
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Details du lot</h2>
            </div>
            <p className="text-sm text-muted-foreground">{batch.recipeName}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 py-6">
          {/* Batch info */}
          <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Quantite produite</p>
                <p className="font-semibold">{batch.producedQuantity} {batch.producedUnit}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Restant</p>
                <p className="font-semibold text-amber-600">{batch.remainingQuantity} {batch.producedUnit}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Statut</p>
                <Badge variant={
                  batch.status === "termine" ? "default" :
                  batch.status === "partiellement_conditionne" ? "secondary" :
                  "outline"
                }>
                  {batch.status === "en_cours" ? "En cours" :
                   batch.status === "partiellement_conditionne" ? "Partiellement" :
                   "Termine"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm">{new Date(batch.productionDate).toLocaleDateString("fr-FR")}</p>
              </div>
            </div>
            {batch.notes && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{batch.notes}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progression du conditionnement</span>
                <span>{progressPercent.toFixed(0)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </div>

          {/* Existing sessions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Package className="h-3.5 w-3.5" /> Sessions de conditionnement ({sessions.length})
            </div>
            {sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Aucune session de conditionnement
              </div>
            ) : (
              <div className="rounded-lg border divide-y">
                {sessions.map((session) => (
                  <div key={session.id} className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{session.packagingName}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(session.sessionDate).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Scale className="h-3 w-3" />{session.weightGrams}g</span>
                      <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{session.quantity} unites</span>
                      <span>= {((session.weightGrams * session.quantity) / 1000).toFixed(2)} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add new session form */}
          {batch.status !== "termine" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Plus className="h-3.5 w-3.5" /> Ajouter une session
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Emballage *</Label>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCombobox}
                        className="w-full justify-between bg-muted/50 border-0 font-normal"
                      >
                        {selectedPackaging
                          ? packagingList.find((p: any) => p.id === selectedPackaging)?.name || "Emballage"
                          : "Selectionner un emballage"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher un emballage..." />
                        <CommandList>
                          <CommandEmpty>Aucun emballage trouve.</CommandEmpty>
                          <CommandGroup heading="Emballages disponibles">
                            {packagingList.map((pkg: any) => (
                              <CommandItem
                                key={pkg.id}
                                value={pkg.name}
                                onSelect={() => {
                                  setSelectedPackaging(pkg.id)
                                  setOpenCombobox(false)
                                  setTimeout(() => {
                                    document.getElementById("session-weight-input")?.focus()
                                  }, 100)
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selectedPackaging === pkg.id ? "opacity-100" : "opacity-0")} />
                                <div className="flex-1">
                                  <div className="font-medium">{pkg.name}</div>
                                  <div className="text-xs text-muted-foreground">Stock: {pkg.quantity || 0}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Poids par unite (g) *</Label>
                    <Input
                      id="session-weight-input"
                      type="number"
                      step="0.1"
                      placeholder="Ex: 250"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          document.getElementById("session-qty-input")?.focus()
                        }
                      }}
                      className="bg-muted/50 border-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Quantite *</Label>
                    <Input
                      id="session-qty-input"
                      type="number"
                      placeholder="Ex: 10"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && selectedPackaging && weight && qty) {
                          handleAddSession()
                        }
                      }}
                      className="bg-muted/50 border-0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Notes</Label>
                  <Textarea
                    placeholder="Observations..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="resize-none bg-muted/50 border-0 min-h-16"
                  />
                </div>
                <Button
                  onClick={handleAddSession}
                  disabled={saving || !selectedPackaging || !weight || !qty}
                  className="w-full"
                >
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ajout en cours...</>
                  ) : (
                    <><Plus className="mr-2 h-4 w-4" />Ajouter la session</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Fermer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
