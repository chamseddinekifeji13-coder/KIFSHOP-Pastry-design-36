"use client"

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Lock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Receipt,
  ShoppingBag,
  Clock,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTenant } from '@/lib/tenant-context'
import {
  fetchDailySummary,
  saveDailyClosure,
  fetchClosureHistory,
  type DailyClosureSummary,
  type ClosureHistoryEntry,
} from '@/lib/treasury/actions'

interface DailyClosureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DailyClosureDialog({ open, onOpenChange, onSuccess }: DailyClosureDialogProps) {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant.id

  const [step, setStep] = useState<'summary' | 'confirm' | 'done'>('summary')
  const [summary, setSummary] = useState<DailyClosureSummary | null>(null)
  const [history, setHistory] = useState<ClosureHistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [actualClosing, setActualClosing] = useState('')
  const [differenceReason, setDifferenceReason] = useState('')

  const difference = useMemo(() => {
    if (!summary || !actualClosing) return 0
    return parseFloat(actualClosing) - summary.netRevenue
  }, [summary, actualClosing])

  const hasDifference = Math.abs(difference) > 0.001

  // Load summary when dialog opens
  useEffect(() => {
    if (open && tenantId && tenantId !== '__fallback__') {
      setStep('summary')
      setActualClosing('')
      setDifferenceReason('')
      loadSummary()
      loadHistory()
    }
  }, [open, tenantId])

  const loadSummary = async () => {
    setIsLoading(true)
    try {
      const data = await fetchDailySummary(tenantId)
      setSummary(data)
    } catch (err) {
      console.error('Failed to load daily summary:', err)
      toast.error('Erreur lors du chargement du récapitulatif')
    } finally {
      setIsLoading(false)
    }
  }

  const loadHistory = async () => {
    try {
      const data = await fetchClosureHistory(tenantId, 10)
      setHistory(data)
    } catch (err) {
      console.error('Failed to load closure history:', err)
    }
  }

  const handleConfirmClosure = async () => {
    if (!summary) return
    if (!actualClosing) {
      toast.error('Veuillez saisir le solde réel de la caisse')
      return
    }
    if (hasDifference && !differenceReason.trim()) {
      toast.error('Veuillez expliquer la différence entre le solde attendu et le solde réel')
      return
    }

    setIsSaving(true)
    try {
      const result = await saveDailyClosure(
        tenantId,
        summary,
        parseFloat(actualClosing),
        'Gérant', // Will be replaced by actual user name if available
        differenceReason || undefined
      )

      if (result.success) {
        setStep('done')
        toast.success('Clôture de journée enregistrée avec succès')
        onSuccess?.()
      } else {
        toast.error(`Erreur: ${result.error}`)
      }
    } catch (err) {
      console.error('Failed to save closure:', err)
      toast.error('Erreur lors de l\'enregistrement de la clôture')
    } finally {
      setIsSaving(false)
    }
  }

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Clôture de Journée
          </DialogTitle>
          <DialogDescription className="capitalize">{today}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Calcul du récapitulatif...</p>
          </div>
        ) : step === 'done' ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h3 className="text-lg font-semibold">Journée clôturée</h3>
            <p className="text-sm text-muted-foreground text-center">
              La clôture du {summary?.date} a été enregistrée avec succès.
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-4">
              Fermer
            </Button>
          </div>
        ) : summary ? (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Recettes</span>
                </div>
                <p className="text-lg font-bold text-green-700">{summary.totalSales.toFixed(3)} TND</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-xs text-muted-foreground">Dépenses</span>
                </div>
                <p className="text-lg font-bold text-red-700">{summary.totalExpenses.toFixed(3)} TND</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs text-muted-foreground">Espèces</span>
                </div>
                <p className="text-lg font-bold">{summary.totalCashIncome.toFixed(3)} TND</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Carte</span>
                </div>
                <p className="text-lg font-bold">{summary.totalCardIncome.toFixed(3)} TND</p>
              </Card>
            </div>

            {/* Stats Row */}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Receipt className="h-3.5 w-3.5" />
                <span>{summary.transactionsCount} transactions</span>
              </div>
              <div className="flex items-center gap-1">
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>{summary.ordersCount} commandes</span>
              </div>
            </div>

            <Separator />

            {/* Net Revenue */}
            <div className="flex justify-between items-center px-1">
              <span className="font-semibold">Solde attendu (net)</span>
              <span className={`text-xl font-bold ${summary.netRevenue >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {summary.netRevenue.toFixed(3)} TND
              </span>
            </div>

            <Separator />

            {/* Input: Actual Closing */}
            {step === 'summary' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Solde réel en caisse (TND)</Label>
                  <Input
                    type="number"
                    placeholder="0.000"
                    step="0.001"
                    value={actualClosing}
                    onChange={(e) => setActualClosing(e.target.value)}
                    className="mt-1.5 text-lg font-semibold h-12"
                  />
                </div>

                {actualClosing && hasDifference && (
                  <div className={`rounded-lg p-3 ${
                    difference > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className={`h-4 w-4 ${difference > 0 ? 'text-blue-600' : 'text-amber-600'}`} />
                      <span className="text-sm font-medium">
                        Différence : {difference > 0 ? '+' : ''}{difference.toFixed(3)} TND
                      </span>
                    </div>
                    <div>
                      <Label className="text-xs">Raison de la différence</Label>
                      <Textarea
                        placeholder="Expliquez la différence..."
                        value={differenceReason}
                        onChange={(e) => setDifferenceReason(e.target.value)}
                        className="mt-1 h-20 text-sm"
                      />
                    </div>
                  </div>
                )}

                <Button
                  className="w-full h-11 gap-2"
                  onClick={() => {
                    if (!actualClosing) {
                      toast.error('Veuillez saisir le solde réel')
                      return
                    }
                    setStep('confirm')
                  }}
                  disabled={!actualClosing}
                >
                  <Lock className="h-4 w-4" />
                  Valider la clôture
                </Button>
              </div>
            )}

            {/* Confirmation Step */}
            {step === 'confirm' && (
              <div className="space-y-4">
                <Card className="p-4 border-amber-200 bg-amber-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-800">Confirmer la clôture ?</p>
                      <p className="text-xs text-amber-700">
                        Solde attendu : <strong>{summary.netRevenue.toFixed(3)} TND</strong>
                      </p>
                      <p className="text-xs text-amber-700">
                        Solde réel : <strong>{parseFloat(actualClosing).toFixed(3)} TND</strong>
                      </p>
                      {hasDifference && (
                        <p className="text-xs text-amber-700">
                          Différence : <strong>{difference > 0 ? '+' : ''}{difference.toFixed(3)} TND</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </Card>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep('summary')}
                  >
                    Retour
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleConfirmClosure}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Confirmer
                  </Button>
                </div>
              </div>
            )}

            {/* Closure History (collapsible) */}
            {history.length > 0 && step === 'summary' && (
              <div className="pt-2">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <History className="h-4 w-4" />
                  <span>Historique des clôtures</span>
                  {showHistory ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
                </button>

                {showHistory && (
                  <div className="mt-3 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs text-right">Ventes</TableHead>
                          <TableHead className="text-xs text-right">Écart</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-xs">
                              {new Date(entry.closure_date).toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell className="text-xs text-right font-medium">
                              {Number(entry.total_sales).toFixed(3)}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              {Number(entry.difference) !== 0 ? (
                                <Badge variant={Number(entry.difference) > 0 ? 'default' : 'destructive'} className="text-[10px]">
                                  {Number(entry.difference) > 0 ? '+' : ''}{Number(entry.difference).toFixed(3)}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">OK</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
