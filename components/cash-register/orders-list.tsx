'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, Plus } from 'lucide-react'

interface Order {
  id: string
  customerName: string
  items: OrderItem[]
  total: number
  date: Date
  status: 'pending' | 'completed' | 'cancelled'
}

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  subtotal: number
}

export function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([
    {
      id: '1',
      customerName: 'Ahmed Ben Ali',
      items: [
        { id: '1', name: 'Gâteau au chocolat', quantity: 1, price: 25, subtotal: 25 },
        { id: '2', name: 'Croissants', quantity: 2, price: 5, subtotal: 10 }
      ],
      total: 35,
      date: new Date(),
      status: 'completed'
    }
  ])

  const deleteOrder = (id: string) => {
    setOrders(orders.filter(order => order.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commandes Récentes</CardTitle>
        <CardDescription>Liste des 10 dernières commandes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.customerName}</TableCell>
                  <TableCell>{order.items.length} article(s)</TableCell>
                  <TableCell className="font-semibold">{order.total} TND</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status === 'completed' ? 'Complétée' : 
                       order.status === 'pending' ? 'En attente' : 'Annulée'}
                    </span>
                  </TableCell>
                  <TableCell>{order.date.toLocaleDateString('fr-TN')}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteOrder(order.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
