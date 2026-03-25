'use client'

import { useState } from 'react'
import { ChevronDown, Eye, Edit2, Trash2, Send, Check } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ProcurementOrder {
  id: string
  status: 'DRAFT' | 'VALIDATED' | 'SENT' | 'CANCELLED'
  createdAt: string
  totalAmount?: number
  itemsCount: number
  supplierId?: string
}

interface ProcurementOrdersManagementProps {
  orders: ProcurementOrder[]
  onRefresh?: () => void
}

const statusConfig = {
  DRAFT: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
  VALIDATED: { label: 'Validé', color: 'bg-blue-100 text-blue-800' },
  SENT: { label: 'Envoyé', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Annulé', color: 'bg-red-100 text-red-800' },
}

export function ProcurementOrdersManagement({
  orders,
  onRefresh,
}: ProcurementOrdersManagementProps) {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)

  const handleValidate = async (orderId: string) => {
    // API call to validate order
    console.log('Validating order:', orderId)
  }

  const handleSend = async (orderId: string) => {
    // API call to send order
    console.log('Sending order:', orderId)
  }

  const handleDelete = async (orderId: string) => {
    // API call to delete order
    console.log('Deleting order:', orderId)
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Articles</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Créé</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                <TableCell>
                  <Badge className={statusConfig[order.status].color}>
                    {statusConfig[order.status].label}
                  </Badge>
                </TableCell>
                <TableCell>{order.itemsCount} article{order.itemsCount > 1 ? 's' : ''}</TableCell>
                <TableCell>
                  {order.totalAmount ? `${order.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` : '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(order.createdAt), { 
                    addSuffix: true,
                    locale: fr 
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Voir détails
                      </DropdownMenuItem>
                      {order.status === 'DRAFT' && (
                        <>
                          <DropdownMenuItem onClick={() => handleValidate(order.id)}>
                            <Check className="h-4 w-4 mr-2" />
                            Valider
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(order.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </>
                      )}
                      {order.status === 'VALIDATED' && (
                        <DropdownMenuItem onClick={() => handleSend(order.id)}>
                          <Send className="h-4 w-4 mr-2" />
                          Envoyer au fournisseur
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
