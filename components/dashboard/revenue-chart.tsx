"use client"

import { useMemo } from "react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTenant } from "@/lib/tenant-context"
import { getRevenueData } from "@/lib/mock-data"

export function RevenueChart() {
  const { currentTenant } = useTenant()
  const data = getRevenueData(currentTenant.id)

  const chartColor = useMemo(() => {
    return currentTenant.id === "masmoudi" ? "#4A7C59" : "#C17817"
  }, [currentTenant.id])

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const avgRevenue = data.length > 0 ? Math.round(totalRevenue / data.length) : 0

  if (data.length === 0) {
    return (
      <Card className="col-span-full lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">CA des 7 derniers jours</CardTitle>
          <CardDescription>Total: 0 TND | Moyenne: 0 TND/jour</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Aucune donnee de vente pour le moment</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">CA des 7 derniers jours</CardTitle>
        <CardDescription>
          Total: {totalRevenue.toLocaleString("fr-TN")} TND | Moyenne: {avgRevenue.toLocaleString("fr-TN")} TND/jour
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tick={{ fill: "var(--color-muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tick={{ fill: "var(--color-muted-foreground)" }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="rounded-lg border bg-card p-2 shadow-sm">
                        <div className="text-xs text-muted-foreground">{data.day} ({data.date})</div>
                        <div className="font-semibold">{data.revenue.toLocaleString("fr-TN")} TND</div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="revenue"
                fill={chartColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
