"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { collectOrderPayment } from '@/lib/treasury/cash-actions'
import { DollarSign } from 'lucide-react'

interface QuickCollectionProps {
  orderId: string
  orderTotal: number
  onCollectionSuccess?: () => void
}

export function QuickOrderCollection({ orderId, orderTotal, onCollectionSuccess }: QuickCollectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState(orderTotal.toString())
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCollect = async () => {
    try {
      setIsLoading(true)
      await collectOrderPayment(
        orderId,
        parseFloat(amount) || 0,
        paymentMethod,
        notes
      )
      setIsOpen(false)
      setAmount(orderTotal.toString())
      setPaymentMethod('cash')
      setNotes('')
      onCollectionSuccess?.()
    } catch (error) {
      console.error('Collection failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setIsOpen(true)}
        className="bg-green-600 hover:bg-green-700"
      >
        <DollarSign className="w-4 h-4 mr-1" />
        Encaisser
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encaissement - Commande #{orderId.slice(0, 8)}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Montant à encaisser (TND)</Label>
              <Input
                type="number"
                placeholder="0.000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.001"
              />
              <p className="text-sm text-gray-500 mt-1">Total original: {orderTotal.toFixed(3)} TND</p>
            </div>

            <div>
              <Label>Mode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="card">Carte bancaire</SelectItem>
                  <SelectItem value="check">Chèque</SelectItem>
                  <SelectItem value="transfer">Virement</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                placeholder="Notes supplémentaires..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                Annuler
              </Button>
              <Button
                onClick={handleCollect}
                disabled={isLoading || !amount}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Encaissement...' : 'Confirmer l\'encaissement'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
