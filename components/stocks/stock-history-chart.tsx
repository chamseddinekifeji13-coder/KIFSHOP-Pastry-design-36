"use client"

import { useState, useEffect } from "react"
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, TrendingDown, TrendingUp, Minus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

interface StockHistoryData {
  date: string
  stock: number
  alert_threshold: number
  delta: number
}

interface StockHistoryResponse {
  material_id: string
  material_name: string
  unit: string
  current_stock: number
  min_stock: number
  history: StockHistoryData[]
  error?: string
}

interface StockHistoryChartProps {
  materialId: string
  materialName: string
  unit?: string
  onClose?: () => void
}

export function StockHistoryChart({ materialId, materialName, unit, onClose }: StockHistoryChartProps) {
  const [data, setData] = useState<StockHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState("30")

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true)
      const supabase = createClient()
      const { data: result, error } = await supabase.rpc("get_stock_history", {
        p_raw_material_id: materialId,
        p_days: parseInt(days),
      })
      if (error) {
        console.error("Error fetching stock history:", error.message)
        setData(null)
      } else {
        setData(result as StockHistoryResponse)
      }
      setLoading(false)
    }
    fetchHistory()
  }, [materialId, days])

  const history = data?.history || []
  const minStock = data?.min_stock || 0
  const currentStock = data?.current_stock || 0
  const materialUnit = data?.unit || unit || ""

  // Calculate trend
  const firstStock = history.length > 0 ? history[0].stock : 0
  const lastStock = history.length > 0 ? history[history.length - 1].stock : 0
  const trend = lastStock - firstStock
  const trendPct = firstStock > 0 ? Math.round((trend / firstStock) * 100) : 0

  // Days below threshold
  const daysBelow = history.filter(d => d.stock <= d.alert_threshold && d.alert_threshold > 0).length

  // Format date for display
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getDate()}/${d.getMonth() + 1}`
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              Historique : {materialName}
              {trend > 0 && <TrendingUp className="h-4 w-4 text-emerald-500" />}
              {trend < 0 && <TrendingDown className="h-4 w-4 text-destructive" />}
              {trend === 0 && <Minus className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
            <CardDescription className="flex items-center gap-3 mt-1">
              <span>Actuel : <strong>{currentStock} {materialUnit}</strong></span>
              {minStock > 0 && <span>Seuil : <strong>{minStock} {materialUnit}</strong></span>}
              {trendPct !== 0 && (
                <Badge variant={trendPct > 0 ? "default" : "destructive"} className="text-[10px]">
                  {trendPct > 0 ? "+" : ""}{trendPct}%
                </Badge>
              )}
              {daysBelow > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {daysBelow}j sous seuil
                </Badge>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 jours</SelectItem>
                <SelectItem value="14">14 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
                <SelectItem value="60">60 jours</SelectItem>
                <SelectItem value="90">90 jours</SelectItem>
              </SelectContent>
            </Select>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
                <span className="sr-only">Fermer</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-[280px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex items-center justify-center h-[280px]">
            <p className="text-sm text-muted-foreground">{"Aucun historique de mouvement pour cette periode"}</p>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4A7C59" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4A7C59" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tick={{ fill: "var(--color-muted-foreground)" }}
                  interval={Math.max(0, Math.floor(history.length / 8))}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tick={{ fill: "var(--color-muted-foreground)" }}
                  domain={[0, "auto"]}
                />
                {minStock > 0 && (
                  <ReferenceLine
                    y={minStock}
                    stroke="#ef4444"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{
                      value: `Seuil ${minStock}${materialUnit}`,
                      position: "insideTopRight",
                      fill: "#ef4444",
                      fontSize: 10,
                    }}
                  />
                )}
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as StockHistoryData
                      return (
                        <div className="rounded-lg border bg-card p-2.5 shadow-sm text-xs">
                          <div className="text-muted-foreground mb-1">{formatDate(d.date)}</div>
                          <div className="flex items-center gap-2 font-semibold">
                            <span className="h-2 w-2 rounded-full bg-[#4A7C59]" />
                            Stock : {d.stock} {materialUnit}
                          </div>
                          {d.delta !== 0 && (
                            <div className={`mt-0.5 ${d.delta > 0 ? "text-emerald-600" : "text-destructive"}`}>
                              Mouvement : {d.delta > 0 ? "+" : ""}{d.delta} {materialUnit}
                            </div>
                          )}
                          {d.alert_threshold > 0 && d.stock <= d.alert_threshold && (
                            <div className="text-destructive mt-0.5 font-medium">Sous le seuil</div>
                          )}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={30}
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="stock"
                  name={`${materialName} (${materialUnit})`}
                  stroke="#4A7C59"
                  strokeWidth={2}
                  fill="url(#stockGradient)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, fill: "#4A7C59" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
