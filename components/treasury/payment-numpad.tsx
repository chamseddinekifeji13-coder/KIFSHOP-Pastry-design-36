"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Delete, RotateCcw } from "lucide-react"

interface PaymentNumpadProps {
  amount: string
  onChange: (amount: string) => void
  onSubmit: () => void
  disabled?: boolean
}

export function PaymentNumpad({ amount, onChange, onSubmit, disabled }: PaymentNumpadProps) {
  const handleDigit = (digit: string) => {
    const newAmount = (amount + digit).slice(0, 10)
    onChange(newAmount)
  }

  const handleBackspace = () => {
    onChange(amount.slice(0, -1))
  }

  const handleClear = () => {
    onChange("")
  }

  const handleDecimal = () => {
    if (!amount.includes(".")) {
      onChange(amount + ".")
    }
  }

  const numpadButtons = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "C"],
  ]

  return (
    <div className="space-y-4">
      {/* Display */}
      <div className="bg-gradient-to-r from-amber-900 to-amber-800 rounded-xl p-4 text-center">
        <div className="text-5xl font-mono font-bold text-white tabular-nums">
          {amount || "0"}
        </div>
        <div className="text-xs text-amber-200 mt-1">Montant reçu (TND)</div>
      </div>

      {/* Numpad Grid */}
      <div className="grid grid-cols-3 gap-2">
        {numpadButtons.map((row, idx) => (
          <div key={idx} className="contents">
            {row.map((btn) => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === "C") handleClear()
                  else if (btn === ".") handleDecimal()
                  else handleDigit(btn)
                }}
                className="h-14 bg-white border-2 border-amber-200 rounded-lg font-bold text-lg text-amber-900 hover:bg-amber-50 active:bg-amber-100 transition-colors"
              >
                {btn}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Backspace and Submit */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handleBackspace}
          variant="outline"
          className="h-12 border-amber-300"
        >
          <Delete className="h-4 w-4 mr-2" />
          Annuler
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!amount || disabled}
          className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
        >
          Confirmer
        </Button>
      </div>
    </div>
  )
}
