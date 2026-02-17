"use client"

import { useMemo } from "react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useTransactions } from "@/hooks/use-tenant-data"

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

export function RevenueChart() {
  const { data: transactions, isLoading } = useTransactions()

  const chartData = useMemo(() => {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      const dayRevenue = (transactions || [])
        .filter((t) => t.type === "entree" && t.createdAt?.startsWith(dateStr))
        .reduce((sum, t) => sum + t.amount, 0)
      last7Days.push({
        day: DAY_NAMES[date.getDay()],
        date: `${date.getDate()}/${date.getMonth() + 1}`,
        revenue: dayRevenue,
      })
    }
    return last7Days
  }, [transactions])

  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0)
  const avgRevenue = Math.round(totalRevenue / 7)

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">CA des 7 derniers jours</CardTitle>
        <CardDescription>
          Total: {totalRevenue.toLocaleString("fr-TN")} TND | Moyenne: {avgRevenue.toLocaleString("fr-TN")} TND/jour
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-[280px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : totalRevenue === 0 ? (
          <div className="flex items-center justify-center h-[280px]">
            <p className="text-sm text-muted-foreground">Aucune donnee de vente pour le moment</p>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "var(--color-muted-foreground)" }} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "var(--color-muted-foreground)" }} />
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload
                    return (
                      <div className="rounded-lg border bg-card p-2 shadow-sm">
                        <div className="text-xs text-muted-foreground">{d.day} ({d.date})</div>
                        <div className="font-semibold">{d.revenue.toLocaleString("fr-TN")} TND</div>
                      </div>
                    )
                  }
                  return null
                }} />
                <Bar dataKey="revenue" fill="#C17817" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
