"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCurrency } from "@/lib/utils"
import { Gift } from "lucide-react"

interface ComboItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface ComboBundle {
  id: string
  name: string
  description?: string
  items: ComboItem[]
  regularPrice: number
  comboPrice: number
  savings: number
}

interface ComboBundleProps {
  combos: ComboBundle[]
  onSelectCombo: (combo: ComboBundle) => void
}

export function ComboBundleSelector({ combos, onSelectCombo }: ComboBundleProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-bold text-amber-900">
        <Gift className="h-4 w-4" />
        <span>Combos et Lots</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {combos.map(combo => (
          <Card
            key={combo.id}
            className="p-3 bg-gradient-to-r from-emerald-50 to-emerald-50/30 border-2 border-emerald-200 cursor-pointer hover:shadow-md transition-all"
            onClick={() => onSelectCombo(combo)}
          >
            <div className="space-y-2">
              {/* Combo name and badge */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-emerald-900">
                    {combo.name}
                  </h4>
                  {combo.description && (
                    <p className="text-xs text-emerald-700">{combo.description}</p>
                  )}
                </div>
                <Badge className="bg-emerald-600 text-white">
                  -{Math.round(combo.savings)}%
                </Badge>
              </div>

              {/* Items in combo */}
              <div className="bg-white/50 p-2 rounded text-xs space-y-1">
                {combo.items.map(item => (
                  <div
                    key={item.id}
                    className="flex justify-between text-emerald-800"
                  >
                    <span>
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price comparison */}
              <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                <div className="text-xs">
                  <div className="line-through text-emerald-500 text-xs">
                    {formatCurrency(combo.regularPrice)}
                  </div>
                  <div className="font-bold text-emerald-900">
                    {formatCurrency(combo.comboPrice)}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectCombo(combo)
                  }}
                >
                  Ajouter
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
