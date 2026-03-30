"use client"

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, RefreshCw, Loader2 } from 'lucide-react'
import { useCashierStats } from '@/hooks/use-tenant-data'

export function CashierPerformanceView() {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Use the same Supabase browser client pattern as useTransactions
  const { data: stats, error, isLoading, mutate } = useCashierStats(startDate, endDate)

  const totalCollected = useMemo(() => {
    return (stats || []).reduce((sum, s) => sum + (s.totalAmount || 0), 0)
  }, [stats])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await mutate()
    setIsRefreshing(false)
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex gap-4 items-end">
          <div>
            <label className="text-sm text-gray-600">Date début</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Date fin</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="gap-2 h-10"
          >
            {isRefreshing || isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualiser
          </Button>
        </div>
        {error && (
          <p className="text-sm text-red-600 mt-2">Erreur de chargement des données</p>
        )}
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
              {isLoading && !stats ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : !stats || stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    Aucune donnée pour cette période
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((stat) => (
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
