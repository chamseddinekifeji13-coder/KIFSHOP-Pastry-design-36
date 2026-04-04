"use client"

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { collectOrderPayment } from '@/lib/treasury/cash-actions'
import { DollarSign, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { useClientOrders } from '@/hooks/use-tenant-data'
import { useToast } from '@/hooks/use-toast'

export function QuickOrderCollection() {
  const { data: orders, isLoading, mutate } = useClientOrders()
  const { toast } = useToast()
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [isCollecting, setIsCollecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter orders that are delivered but not yet collected
  const deliveredOrders = orders?.filter((o: any) => 
    o.status === 'livre' || o.status === 'delivered'
  ) || []

  const handleOpenCollection = (order: any) => {
    setSelectedOrder(order)
    setAmount(order.total?.toString() || '0')
    setPaymentMethod('cash')
    setNotes('')
    setError(null)
  }

  const handleCollect = async () => {
    if (!selectedOrder) return
    
    try {
      setError(null)
      setIsCollecting(true)
      const result = await collectOrderPayment(
        selectedOrder.id,
        parseFloat(amount) || 0,
        paymentMethod,
        notes
      )

      if (!result?.success) {
        const errorMessage = result?.error || "Erreur lors de l'encaissement"
        setError(errorMessage)
        toast({
          title: "Erreur lors de l'encaissement",
          description: errorMessage,
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Encaissement réussi",
        description: `Paiement de ${amount} TND enregistré`
      })
      setSelectedOrder(null)
      mutate()
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de l\'encaissement'
      console.error('[v0] Collection failed:', err)
      setError(errorMessage)
      toast({
        title: "Erreur lors de l'encaissement",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsCollecting(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
          Commandes a Encaisser
        </h3>
        
        {deliveredOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune commande livree en attente d'encaissement
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commande</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveredOrders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    #{order.id?.slice(0, 8)}
                  </TableCell>
                  <TableCell>{order.customer_name || order.customerName || order.customer_phone || order.phone || 'N/A'}</TableCell>
                  <TableCell>
                    {new Date(order.created_at || order.createdAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {(order.total || 0).toFixed(3)} TND
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800">Livre</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleOpenCollection(order)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      Encaisser
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Encaissement - Commande #{selectedOrder?.id?.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Erreur</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Client</p>
              <p className="font-semibold">
                {selectedOrder?.customer_name || selectedOrder?.customerName || selectedOrder?.customer_phone || selectedOrder?.phone || "N/A"}
              </p>
            </div>

            <div>
              <Label>Montant a encaisser (TND)</Label>
              <Input
                type="number"
                placeholder="0.000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.001"
              />
              <p className="text-sm text-gray-500 mt-1">
                Total original: {(selectedOrder?.total || 0).toFixed(3)} TND
              </p>
            </div>

            <div>
              <Label>Mode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Especes</SelectItem>
                  <SelectItem value="card">Carte bancaire</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                  <SelectItem value="transfer">Virement</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes (optionnel)</Label>
              <Input
                placeholder="Notes supplementaires..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedOrder(null)} 
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleCollect}
                disabled={isCollecting || !amount}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isCollecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Encaissement...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmer
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
