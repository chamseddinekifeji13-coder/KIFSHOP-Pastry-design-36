"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { ChevronDown, Check } from "lucide-react"

interface ProductVariant {
  id: string
  name: string
  priceModifier: number
}

interface ProductWithVariants {
  id: string
  name: string
  basePrice: number
  variants: ProductVariant[]
  image?: string
}

interface ProductVariantSelectorProps {
  product: ProductWithVariants
  onSelect: (variant: ProductVariant, finalPrice: number) => void
  onCancel: () => void
}

export function ProductVariantSelector({
  product,
  onSelect,
  onCancel,
}: ProductVariantSelectorProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants[0] || null
  )

  const finalPrice = selectedVariant
    ? product.basePrice + selectedVariant.priceModifier
    : product.basePrice

  return (
    <Card className="p-4 bg-white border-2 border-amber-200">
      <div className="space-y-4">
        {/* Product info */}
        <div>
          <h3 className="font-bold text-lg text-amber-900">{product.name}</h3>
          <p className="text-sm text-amber-600">
            Prix: {formatCurrency(product.basePrice)}
          </p>
        </div>

        {/* Variants */}
        {product.variants.length > 0 ? (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-amber-900">
              Choisir une variante:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {product.variants.map(variant => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`p-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    selectedVariant?.id === variant.id
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : "border-amber-200 bg-amber-50/30 text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{variant.name}</span>
                    {selectedVariant?.id === variant.id && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                  {variant.priceModifier !== 0 && (
                    <div className="text-xs text-amber-600">
                      {variant.priceModifier > 0 ? "+" : ""}
                      {formatCurrency(variant.priceModifier)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Final price */}
        <div className="bg-gradient-to-r from-amber-100 to-amber-50 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-amber-900">Prix final:</span>
            <span className="text-2xl font-bold text-amber-900">
              {formatCurrency(finalPrice)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-10"
          >
            Annuler
          </Button>
          <Button
            onClick={() => selectedVariant && onSelect(selectedVariant, finalPrice)}
            disabled={!selectedVariant}
            className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Ajouter
          </Button>
        </div>
      </div>
    </Card>
  )
}
