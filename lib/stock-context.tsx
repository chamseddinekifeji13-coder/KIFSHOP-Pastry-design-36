"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useTenant } from "./tenant-context"
import {
  getRawMaterials,
  getFinishedProducts,
  type RawMaterial,
  type FinishedProduct,
} from "./mock-data"

interface StockMovement {
  id: string
  date: string
  type: "entry" | "exit" | "production-in" | "production-out"
  itemName: string
  quantity: number
  unit: string
  reason: string
}

interface StockContextType {
  rawMaterials: RawMaterial[]
  finishedProducts: FinishedProduct[]
  movements: StockMovement[]
  deductMaterials: (ingredients: { materialId: string; quantity: number }[]) => boolean
  addFinishedProduct: (name: string, quantity: number, unit: string, category: string) => void
  addRawMaterialStock: (materialId: string, quantity: number) => void
  removeRawMaterialStock: (materialId: string, quantity: number) => void
  addFinishedProductStock: (productId: string, quantity: number) => void
  removeFinishedProductStock: (productId: string, quantity: number) => void
}

const StockContext = createContext<StockContextType | undefined>(undefined)

export function StockProvider({ children }: { children: ReactNode }) {
  const { currentTenant } = useTenant()

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(() =>
    getRawMaterials(currentTenant.id).map(m => ({ ...m }))
  )
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>(() =>
    getFinishedProducts(currentTenant.id).map(p => ({ ...p }))
  )
  const [movements, setMovements] = useState<StockMovement[]>([])

  // Reset stock when tenant changes
  useEffect(() => {
    setRawMaterials(getRawMaterials(currentTenant.id).map(m => ({ ...m })))
    setFinishedProducts(getFinishedProducts(currentTenant.id).map(p => ({ ...p })))
    setMovements([])
  }, [currentTenant.id])

  const recalculateStatus = (material: RawMaterial): RawMaterial["status"] => {
    if (material.expiryDate) {
      const expiry = new Date(material.expiryDate)
      const now = new Date()
      const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays <= 7) return "expiring"
    }
    if (material.quantity <= material.safetyThreshold) return "critical"
    return "in-stock"
  }

  const addMovement = useCallback((type: StockMovement["type"], itemName: string, quantity: number, unit: string, reason: string) => {
    setMovements(prev => [
      {
        id: `mv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toISOString(),
        type,
        itemName,
        quantity,
        unit,
        reason,
      },
      ...prev,
    ])
  }, [])

  const deductMaterials = useCallback((ingredients: { materialId: string; quantity: number }[]): boolean => {
    // Verify all materials have sufficient stock
    for (const ing of ingredients) {
      const material = rawMaterials.find(m => m.id === ing.materialId)
      if (!material || material.quantity < ing.quantity) {
        return false
      }
    }

    // Perform deduction
    setRawMaterials(prev =>
      prev.map(m => {
        const ingredient = ingredients.find(i => i.materialId === m.id)
        if (!ingredient) return m
        const updated = { ...m, quantity: parseFloat((m.quantity - ingredient.quantity).toFixed(4)) }
        updated.status = recalculateStatus(updated)
        return updated
      })
    )

    // Record movements
    for (const ing of ingredients) {
      const material = rawMaterials.find(m => m.id === ing.materialId)
      if (material) {
        addMovement("production-out", material.name, ing.quantity, material.unit, "Deduction production")
      }
    }

    return true
  }, [rawMaterials, addMovement])

  const addFinishedProduct = useCallback((name: string, quantity: number, unit: string, category: string) => {
    setFinishedProducts(prev => {
      const existing = prev.find(p => p.name === name)
      if (existing) {
        return prev.map(p =>
          p.id === existing.id
            ? { ...p, quantity: p.quantity + quantity }
            : p
        )
      }
      return [
        ...prev,
        {
          id: `fp-${Date.now()}`,
          tenantId: currentTenant.id,
          name,
          quantity,
          unit,
          price: 0,
          category,
        },
      ]
    })
    addMovement("production-in", name, quantity, unit, "Production terminee")
  }, [currentTenant.id, addMovement])

  const addRawMaterialStock = useCallback((materialId: string, quantity: number) => {
    setRawMaterials(prev =>
      prev.map(m => {
        if (m.id !== materialId) return m
        const updated = { ...m, quantity: parseFloat((m.quantity + quantity).toFixed(4)) }
        updated.status = recalculateStatus(updated)
        return updated
      })
    )
    const material = rawMaterials.find(m => m.id === materialId)
    if (material) {
      addMovement("entry", material.name, quantity, material.unit, "Entree de stock")
    }
  }, [rawMaterials, addMovement])

  const removeRawMaterialStock = useCallback((materialId: string, quantity: number) => {
    setRawMaterials(prev =>
      prev.map(m => {
        if (m.id !== materialId) return m
        const updated = { ...m, quantity: parseFloat(Math.max(0, m.quantity - quantity).toFixed(4)) }
        updated.status = recalculateStatus(updated)
        return updated
      })
    )
    const material = rawMaterials.find(m => m.id === materialId)
    if (material) {
      addMovement("exit", material.name, quantity, material.unit, "Sortie de stock")
    }
  }, [rawMaterials, addMovement])

  const addFinishedProductStock = useCallback((productId: string, quantity: number) => {
    setFinishedProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? { ...p, quantity: p.quantity + quantity }
          : p
      )
    )
    const product = finishedProducts.find(p => p.id === productId)
    if (product) {
      addMovement("entry", product.name, quantity, product.unit, "Entree de stock")
    }
  }, [finishedProducts, addMovement])

  const removeFinishedProductStock = useCallback((productId: string, quantity: number) => {
    setFinishedProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? { ...p, quantity: Math.max(0, p.quantity - quantity) }
          : p
      )
    )
    const product = finishedProducts.find(p => p.id === productId)
    if (product) {
      addMovement("exit", product.name, quantity, product.unit, "Sortie de stock")
    }
  }, [finishedProducts, addMovement])

  return (
    <StockContext.Provider
      value={{
        rawMaterials,
        finishedProducts,
        movements,
        deductMaterials,
        addFinishedProduct,
        addRawMaterialStock,
        removeRawMaterialStock,
        addFinishedProductStock,
        removeFinishedProductStock,
      }}
    >
      {children}
    </StockContext.Provider>
  )
}

export function useStock() {
  const context = useContext(StockContext)
  if (context === undefined) {
    throw new Error("useStock must be used within a StockProvider")
  }
  return context
}
