"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Scale } from "lucide-react"

interface WeightInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  pricePerKg: number
  onConfirm: (weightInKg: number, totalPrice: number) => void
}

export function WeightInputDialog({
  open,
  onOpenChange,
  productName,
  pricePerKg,
  onConfirm,
}: WeightInputDialogProps) {
  const [weight, setWeight] = useState("")
  const [error, setError] = useState("")

  const totalPrice = weight ? parseFloat(weight) * pricePerKg : 0

  const handleConfirm = () => {
    const w = parseFloat(weight)
    if (!weight || isNaN(w) || w <= 0) {
      setError("Veuillez entrer un poids valide (> 0)")
      return
    }

    onConfirm(w, totalPrice)
    setWeight("")
    setError("")
    onOpenChange(false)
  }

  const handleQuickWeight = (kg: number) => {
    setWeight(kg.toString())
    setError("")
  }

  const presetWeights = [
    { label: "250g", kg: 0.25 },
    { label: "500g", kg: 0.5 },
    { label: "750g", kg: 0.75 },
    { label: "1kg", kg: 1 },
    { label: "1.5kg", kg: 1.5 },
    { label: "2kg", kg: 2 },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Saisir le poids : {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weight-input" className="text-sm">
              Poids (kg) - Prix par kg : {pricePerKg.toFixed(3)} TND
            </Label>
            <Input
              id="weight-input"
              type="number"
              step="0.01"
              placeholder="Ex: 0.3, 1.2, 2.5"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value)
                setError("")
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm()
              }}
              className="bg-muted/50"
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {/* Preset buttons */}
          <div className="grid grid-cols-3 gap-2">
            {presetWeights.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant={weight === preset.kg.toString() ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickWeight(preset.kg)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Price preview */}
          {weight && !error && (
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Poids :</span>
                <span className="font-medium">{parseFloat(weight).toFixed(3)} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Prix unitaire :</span>
                <span className="font-medium">{pricePerKg.toFixed(3)} TND/kg</span>
              </div>
              <div className="border-t border-muted-foreground/20 pt-2 flex justify-between text-base font-semibold">
                <span>Total :</span>
                <span className="text-primary">{totalPrice.toFixed(3)} TND</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setWeight("")
                setError("")
              }}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!weight || !!error}
              className="flex-1"
            >
              Confirmer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
