'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown, Plus, Loader2 } from 'lucide-react'
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

interface Alert {
  id: string
  name: string
  currentStock: number
  minStock: number
  unit: string
  severity: 'critical' | 'warning'
}

interface StockAlertsPanelProps {
  alerts: Alert[]
  onRefresh?: () => void
}

export function StockAlertsPanel({ alerts, onRefresh }: StockAlertsPanelProps) {
  const [converting, setConverting] = useState<string | null>(null)

  const handleConvert = async (alertId: string) => {
    setConverting(alertId)
    try {
      // API call to convert to procurement order
      await new Promise(resolve => setTimeout(resolve, 1000))
    } finally {
      setConverting(null)
    }
  }

  const getSeverityColor = (severity: 'critical' | 'warning') => {
    return severity === 'critical' 
      ? 'bg-red-100 text-red-800' 
      : 'bg-orange-100 text-orange-800'
  }

  const getSeverityLabel = (severity: 'critical' | 'warning') => {
    return severity === 'critical' ? 'Rupture' : 'Faible'
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Article</TableHead>
              <TableHead>Stock Actuel</TableHead>
              <TableHead>Stock Min.</TableHead>
              <TableHead>Unité</TableHead>
              <TableHead>Sévérité</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell className="font-medium">{alert.name}</TableCell>
                <TableCell>
                  <span className="font-semibold text-red-600">
                    {alert.currentStock}
                  </span>
                </TableCell>
                <TableCell>{alert.minStock}</TableCell>
                <TableCell>{alert.unit}</TableCell>
                <TableCell>
                  <Badge className={getSeverityColor(alert.severity)}>
                    {getSeverityLabel(alert.severity)}
                  </Badge>
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
                      <DropdownMenuItem
                        onClick={() => handleConvert(alert.id)}
                        disabled={converting === alert.id}
                      >
                        {converting === alert.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Conversion...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Créer bon d'appro
                          </>
                        )}
                      </DropdownMenuItem>
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
