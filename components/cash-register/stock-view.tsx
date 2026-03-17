'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle } from 'lucide-react'

interface StockItem {
  id: string
  name: string
  category: string
  quantity: number
  minQuantity: number
  unit: string
}

export function StockView() {
  const [stock] = React.useState<StockItem[]>([
    { id: '1', name: 'Farine', category: 'Matière première', quantity: 50, minQuantity: 20, unit: 'kg' },
    { id: '2', name: 'Sucre', category: 'Matière première', quantity: 15, minQuantity: 10, unit: 'kg' },
    { id: '3', name: 'Beurre', category: 'Matière première', quantity: 8, minQuantity: 5, unit: 'kg' },
    { id: '4', name: 'Œufs', category: 'Matière première', quantity: 3, minQuantity: 24, unit: 'boîtes' },
    { id: '5', name: 'Boîte pâtisserie', category: 'Emballage', quantity: 200, minQuantity: 100, unit: 'pièces' },
  ])

  const lowStockItems = stock.filter(item => item.quantity <= item.minQuantity)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock</CardTitle>
        <CardDescription>Inventaire des matières premières et emballages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lowStockItems.length > 0 && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-orange-900">
                {lowStockItems.length} article(s) en quantité faible
              </p>
              <p className="text-sm text-orange-800">
                {lowStockItems.map(item => item.name).join(', ')}
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Quantité Min.</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="font-semibold">{item.quantity}</TableCell>
                  <TableCell>{item.minQuantity}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      item.quantity > item.minQuantity 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.quantity > item.minQuantity ? 'OK' : 'Faible'}
                    </span>
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

import React from 'react'
