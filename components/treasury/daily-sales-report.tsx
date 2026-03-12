"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, Users } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface DailySalesReport {
  date: Date
  totalSales: number
  totalTransactions: number
  averageTransaction: number
  topProduct: { name: string; quantity: number; revenue: number }
  byCashier: Array<{
    name: string
    sales: number
    transactions: number
  }>
  paymentMethods: {
    cash: number
    card: number
    other: number
  }
}

interface DailySalesReportProps {
  report: DailySalesReport
}

export function DailySalesReportView({ report }: DailySalesReportProps) {
  return (
    <div className="space-y-4 p-4 bg-white rounded-xl border border-amber-200">
      {/* Header */}
      <div className="border-b border-amber-200 pb-3">
        <h2 className="text-xl font-bold text-amber-900">
          Rapport de ventes du jour
        </h2>
        <p className="text-sm text-amber-600">
          {report.date.toLocaleDateString("fr-TN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-50/30 border-emerald-200">
          <div className="text-xs text-emerald-600 font-semibold mb-1">
            TOTAL DES VENTES
          </div>
          <div className="text-2xl font-bold text-emerald-900">
            {formatCurrency(report.totalSales)}
          </div>
        </Card>

        <Card className="p-3 bg-gradient-to-br from-blue-50 to-blue-50/30 border-blue-200">
          <div className="text-xs text-blue-600 font-semibold mb-1">
            TRANSACTIONS
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {report.totalTransactions}
          </div>
        </Card>

        <Card className="p-3 bg-gradient-to-br from-amber-50 to-amber-50/30 border-amber-200">
          <div className="text-xs text-amber-600 font-semibold mb-1">
            MOYENNE/TRANSACTION
          </div>
          <div className="text-2xl font-bold text-amber-900">
            {formatCurrency(report.averageTransaction)}
          </div>
        </Card>
      </div>

      {/* Top product */}
      {report.topProduct && (
        <Card className="p-3 bg-gradient-to-r from-amber-100 to-amber-50 border-amber-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-amber-600 font-semibold">PRODUIT LE PLUS VENDU</p>
              <p className="text-lg font-bold text-amber-900">{report.topProduct.name}</p>
              <p className="text-sm text-amber-700">
                {report.topProduct.quantity} unites · {formatCurrency(report.topProduct.revenue)}
              </p>
            </div>
            <TrendingUp className="h-6 w-6 text-amber-600" />
          </div>
        </Card>
      )}

      {/* Payment methods */}
      <Card className="p-3 bg-slate-50 border-slate-200">
        <p className="text-xs text-slate-600 font-semibold mb-2">MOYENS DE PAIEMENT</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-700">Especes</span>
            <span className="font-bold text-slate-900">
              {formatCurrency(report.paymentMethods.cash)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-700">Carte</span>
            <span className="font-bold text-slate-900">
              {formatCurrency(report.paymentMethods.card)}
            </span>
          </div>
          {report.paymentMethods.other > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-700">Autres</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(report.paymentMethods.other)}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* By cashier */}
      {report.byCashier.length > 0 && (
        <Card className="p-3 bg-slate-50 border-slate-200">
          <p className="text-xs text-slate-600 font-semibold mb-3">PERFORMANCE DES CAISSIERS</p>
          <div className="space-y-2">
            {report.byCashier.map(cashier => (
              <div key={cashier.name} className="flex items-center justify-between p-2 bg-white rounded">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{cashier.name}</p>
                  <p className="text-xs text-slate-600">{cashier.transactions} transactions</p>
                </div>
                <p className="font-bold text-amber-900">
                  {formatCurrency(cashier.sales)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
