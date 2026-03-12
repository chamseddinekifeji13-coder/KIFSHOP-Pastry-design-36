"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { openCashSession, closeCashSession, getActiveCashSession } from '@/lib/treasury/cash-actions'
import { Clock, X, Check } from 'lucide-react'

export function CashSessionManagement() {
  const [activeSession, setActiveSession] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [openingBalance, setOpeningBalance] = useState('')
  const [closingBalance, setClosingBalance] = useState('')
  const [differenceReason, setDifferenceReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenSession = async () => {
    try {
      setIsLoading(true)
      const session = await openCashSession(parseFloat(openingBalance) || 0)
      setActiveSession(session)
      setOpeningBalance('')
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to open session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseSession = async () => {
    try {
      setIsLoading(true)
      await closeCashSession(
        activeSession.id,
        parseFloat(closingBalance) || 0,
        differenceReason
      )
      setActiveSession(null)
      setClosingBalance('')
      setDifferenceReason('')
    } catch (error) {
      console.error('Failed to close session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!activeSession) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Session de Caisse</h3>
            <p className="text-sm text-gray-500">Aucune session active</p>
          </div>
          <Button onClick={() => setIsOpen(true)}>
            <Clock className="w-4 h-4 mr-2" />
            Ouvrir la caisse
          </Button>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ouvrir une Session de Caisse</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Solde initial (TND)</Label>
                <Input
                  type="number"
                  placeholder="0.000"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  step="0.001"
                />
              </div>
              <Button onClick={handleOpenSession} disabled={isLoading} className="w-full">
                <Check className="w-4 h-4 mr-2" />
                Ouvrir la caisse
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    )
  }

  return (
    <Card className="p-6 border-green-200 bg-green-50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center">
              <Clock className="w-5 h-5 mr-2 text-green-600" />
              Session active
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Ouverte par {activeSession.opened_by_name} à{' '}
              {new Date(activeSession.opened_at).toLocaleTimeString('fr-FR')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{activeSession.opening_balance.toFixed(3)} TND</p>
            <p className="text-sm text-gray-500">Solde d'ouverture</p>
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div>
            <Label>Solde de fermeture (TND)</Label>
            <Input
              type="number"
              placeholder="0.000"
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
              step="0.001"
            />
          </div>
          
          <div>
            <Label>Raison de la différence (si applicable)</Label>
            <Textarea
              placeholder="Expliquez toute différence entre le solde attendu et le solde réel..."
              value={differenceReason}
              onChange={(e) => setDifferenceReason(e.target.value)}
              className="h-24"
            />
          </div>

          <Button
            onClick={handleCloseSession}
            disabled={isLoading || !closingBalance}
            variant="destructive"
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            Fermer la caisse
          </Button>
        </div>
      </div>
    </Card>
  )
}
