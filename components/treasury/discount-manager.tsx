"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Percent, X } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Discount {
  id: string
  type: "percentage" | "fixed"
  value: number
  label: string
}

interface DiscountManagerProps {
  subtotal: number
  onApply: (discount: Discount) => void
  onRemove: (discountId: string) => void
  appliedDiscounts: Discount[]
}

export function DiscountManager({
  subtotal,
  onApply,
  onRemove,
  appliedDiscounts,
}: DiscountManagerProps) {
  const [showPresets, setShowPresets] = useState(false)
  const [customValue, setCustomValue] = useState("")
  const [customType, setCustomType] = useState<"percentage" | "fixed">("percentage")

  const presetDiscounts: Discount[] = [
    { id: "p10", type: "percentage", value: 10, label: "10%" },
    { id: "p15", type: "percentage", value: 15, label: "15%" },
    { id: "p20", type: "percentage", value: 20, label: "20%" },
    { id: "f5", type: "fixed", value: 5, label: "5 TND" },
    { id: "f10", type: "fixed", value: 10, label: "10 TND" },
  ]

  const totalDiscount = appliedDiscounts.reduce((sum, d) => {
    if (d.type === "percentage") {
      return sum + (subtotal * d.value) / 100
    }
    return sum + d.value
  }, 0)

  const handleApplyCustom = () => {
    if (!customValue) return

    const value = parseFloat(customValue)
    if (isNaN(value)) return

    const discount: Discount = {
      id: `custom-${Date.now()}`,
      type: customType,
      value,
      label: customType === "percentage" ? `${value}%` : `${value} TND`,
    }

    onApply(discount)
    setCustomValue("")
  }

  return (
    <div className="space-y-3">
      {/* Applied Discounts */}
      {appliedDiscounts.length > 0 && (
        <Card className="p-2 bg-emerald-50 border-emerald-200">
          <div className="space-y-2">
            {appliedDiscounts.map(discount => (
              <div key={discount.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Percent className="h-3 w-3 text-emerald-600" />
                  <span className="text-emerald-900">{discount.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-600">
                    -{formatCurrency((subtotal * discount.value) / (discount.type === "percentage" ? 100 : 1))}
                  </span>
                  <button
                    onClick={() => onRemove(discount.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-emerald-200 font-bold text-emerald-900">
              Total reduction: -{formatCurrency(totalDiscount)}
            </div>
          </div>
        </Card>
      )}

      {/* Preset buttons */}
      <div className="grid grid-cols-3 gap-1">
        {presetDiscounts.slice(0, 3).map(discount => (
          <Button
            key={discount.id}
            size="sm"
            variant="outline"
            onClick={() => onApply(discount)}
            className="text-xs h-8"
          >
            {discount.label}
          </Button>
        ))}
      </div>

      {/* Custom discount input */}
      <div className="space-y-2">
        <div className="flex gap-1">
          <Input
            type="number"
            placeholder="Montant"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            className="h-8 text-sm"
          />
          <select
            value={customType}
            onChange={(e) => setCustomType(e.target.value as "percentage" | "fixed")}
            className="h-8 px-2 rounded-md border text-sm"
          >
            <option value="percentage">%</option>
            <option value="fixed">TND</option>
          </select>
          <Button
            size="sm"
            onClick={handleApplyCustom}
            className="h-8 text-xs"
          >
            Appliquer
          </Button>
        </div>
      </div>
    </div>
  )
}
