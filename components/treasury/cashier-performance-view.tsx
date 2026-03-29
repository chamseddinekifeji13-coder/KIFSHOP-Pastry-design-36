"use client"

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'

export function CashierPerformanceView() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  // SWR config pour synchronisation en temps reel
  // Rafraichit tous les 5 secondes + revalidation au focus/reconnexion
  const { data: cashierStats, mutate } = useSWR(
    `/api/treasury/cashier-stats?startDate=${startDate}&endDate=${endDate}`,
    (url: string) => fetch(url).then(res => res.json()),
    {
      refreshInterval: 5000,  // Rafraichir toutes les 5s
      revalidateOnFocus: true,  // Rafraichir quand l'utilisateur revient sur l'onglet
      revalidateOnReconnect: true,  // Rafraichir apres reconnexion
      dedupingInterval: 500,  // Deduplique rapidement
      keepPreviousData: true,  // Garde les donnees pendant la revalidation
    }
  )

  const stats = useMemo(() => {
    if (!cashierStats?.data) return []
    return cashierStats.data
  }, [cashierStats])

  const totalCollected = useMemo(() => {
    return stats.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0)
  }, [stats])

  // Rafraichir manuellement quand les dates changent
  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
    // Forcer un rafraichissement immediat
    setTimeout(() => mutate(), 0)
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex gap-4">
          <div>
            <label className="text-sm text-gray-600">Date début</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange(e.target.value, endDate)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Date fin</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange(startDate, e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Performance des Caissiers ({startDate} à {endDate})
        </h3>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caissier</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Encaissements</TableHead>
                <TableHead className="text-right">Montant Total</TableHead>
                <TableHead className="text-right">Moyenne/Transaction</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    Aucune donnée pour cette période
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((stat: any) => (
                  <TableRow key={stat.cashierId}>
                    <TableCell className="font-medium">{stat.cashierName}</TableCell>
                    <TableCell className="text-right">{stat.totalTransactions}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{stat.totalCollections}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {stat.totalAmount.toFixed(3)} TND
                    </TableCell>
                    <TableCell className="text-right">
                      {stat.totalTransactions > 0
                        ? (stat.totalAmount / stat.totalTransactions).toFixed(3)
                        : '0.000'}{' '}
                      TND
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Actif</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between">
            <p className="font-semibold">Total collecté sur la période</p>
            <p className="text-2xl font-bold text-green-600">{totalCollected.toFixed(3)} TND</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
