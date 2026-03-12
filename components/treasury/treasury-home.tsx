'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, DollarSign, TrendingUp, Users, AlertTriangle, ArrowRight } from 'lucide-react'
import { useTransactions } from '@/hooks/use-tenant-data'

export function TreasuryHome() {
  const { data: transactions } = useTransactions()

  const todayStats = useMemo(() => {
    if (!transactions) return null
    
    const today = new Date().toISOString().split('T')[0]
    const todayTransactions = transactions.filter(t => t.created_at?.split('T')[0] === today)
    
    const income = todayTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0)
    
    const expenses = todayTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0)
    
    return {
      totalTransactions: todayTransactions.length,
      totalIncome: income,
      totalExpenses: expenses,
      netProfit: income - expenses,
    }
  }, [transactions])

  return (
    <div className="space-y-6">
      {/* Alert - Session ouverte */}
      <Alert className="bg-green-50 border-green-200">
        <Clock className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <span className="font-semibold">Session active</span> - Ouverte par Gérant à 08:30
        </AlertDescription>
      </Alert>

      {/* KPIs du jour */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Recettes du jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {todayStats?.totalIncome.toFixed(3) || '0.000'} TND
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {todayStats?.totalTransactions || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Dépenses du jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {todayStats?.totalExpenses.toFixed(3) || '0.000'} TND
            </div>
            <p className="text-xs text-gray-500 mt-1">Depuis ce matin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Bénéfice net</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(todayStats?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {todayStats?.netProfit.toFixed(3) || '0.000'} TND
            </div>
            <p className="text-xs text-gray-500 mt-1">Recettes - Dépenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Solde en caisse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              15,200.000 TND
            </div>
            <p className="text-xs text-gray-500 mt-1">Estimé</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              Encaissement rapide
            </CardTitle>
            <CardDescription>Encaisser une commande livrée</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-green-600 hover:bg-green-700">
              Encaisser une commande
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Rapports
            </CardTitle>
            <CardDescription>Voir les recettes du jour/mois</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Voir les rapports
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Users className="w-5 h-5 mr-2 text-purple-600" />
              Performance caissiers
            </CardTitle>
            <CardDescription>Suivi des caissiers cette semaine</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Voir la performance
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Clock className="w-5 h-5 mr-2 text-orange-600" />
              Clôture de caisse
            </CardTitle>
            <CardDescription>Fermer la session et archiver</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Fermer la caisse
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Transactions récentes */}
      <Card>
        <CardHeader>
          <CardTitle>Dernières transactions</CardTitle>
          <CardDescription>Les 5 dernières transactions de la journée</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions?.slice(-5).reverse().map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-sm">{t.description}</p>
                  <p className="text-xs text-gray-500">{new Date(t.created_at).toLocaleTimeString('fr-FR')}</p>
                </div>
                <p className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{Math.abs(t.amount || 0).toFixed(3)} TND
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
