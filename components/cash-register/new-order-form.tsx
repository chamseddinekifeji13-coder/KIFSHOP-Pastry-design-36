'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Minus } from 'lucide-react'

interface NewOrderProps {
  onSubmit?: (order: any) => void
}

export function NewOrderForm({ onSubmit }: NewOrderProps) {
  const [customerName, setCustomerName] = useState('')
  const [items, setItems] = useState<Array<{ id: string; name: string; quantity: number; price: number }>>([
    { id: '1', name: 'Gâteau au chocolat', quantity: 0, price: 25 },
    { id: '2', name: 'Croissants', quantity: 0, price: 5 },
    { id: '3', name: 'Pain au chocolat', quantity: 0, price: 3.5 }
  ])

  const updateQuantity = (id: string, quantity: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, quantity: Math.max(0, quantity) } : item
    ))
  }

  const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)

  const handleSubmit = () => {
    if (!customerName.trim()) {
      alert('Veuillez entrer le nom du client')
      return
    }

    const orderItems = items.filter(item => item.quantity > 0)
    if (orderItems.length === 0) {
      alert('Veuillez ajouter au moins un article')
      return
    }

    onSubmit?.({
      customerName,
      items: orderItems,
      total
    })

    // Reset form
    setCustomerName('')
    setItems(items.map(item => ({ ...item, quantity: 0 })))
  }

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle>Nouvelle Commande</CardTitle>
        <CardDescription>Créer une nouvelle commande client</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Nom du Client</label>
          <Input
            placeholder="Entrer le nom du client"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          <label className="block text-sm font-medium">Articles</label>
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-gray-600">{item.price} TND</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-2xl font-bold text-primary">{total.toFixed(2)} TND</span>
          </div>
          <Button 
            onClick={handleSubmit}
            className="w-full"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Créer la Commande
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
