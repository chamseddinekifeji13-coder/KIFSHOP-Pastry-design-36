"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"

interface CashierTransaction {
  id: string
  created_by_name: string
  created_by_id: string
  amount: number
  type: "income" | "expense"
  category: string
  description: string
  created_at: string
}

interface CashierCollection {
  id: string
  collected_by_name: string
  collected_by: string
  order_id: string
  amount: number
  payment_method: string
  collected_at: string
}

export function CashierAuditLog() {
  const [transactions, setTransactions] = useState<CashierTransaction[]>([])
  const [collections, setCollections] = useState<CashierCollection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAuditData()
  }, [])

  const loadAuditData = async () => {
    const supabase = createClient()

    // Get today's transactions
    const today = new Date().toISOString().split("T")[0]

    // Fetch transactions
    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .gte("created_at", today)
      .order("created_at", { ascending: false })

    // Fetch collections
    const { data: collData } = await supabase
      .from("order_collections")
      .select("*")
      .gte("collected_at", today)
      .order("collected_at", { ascending: false })

    setTransactions(txData || [])
    setCollections(collData || [])
    setLoading(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-TN", {
      style: "currency",
      currency: "TND",
    }).format(amount)
  }

  const formatDateTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMM yyyy HH:mm:ss", { locale: fr })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Historique des encaissements</CardTitle>
          <CardDescription>
            Qui a encaissé et quand - Audit complet des paiements collectés
          </CardDescription>
        </CardHeader>
        <CardContent>
          {collections.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Aucun encaissement aujourd&apos;hui
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caissier</TableHead>
                  <TableHead>Commande</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Heure</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((col) => (
                  <TableRow key={col.id}>
                    <TableCell className="font-semibold">
                      {col.collected_by_name || "Inconnu"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      #{col.order_id}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(col.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {col.payment_method === "cash" ? "Espèces" : "Carte"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(col.collected_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des ventes (POS)</CardTitle>
          <CardDescription>
            Qui a effectué chaque vente à la caisse enregistreuse
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Aucune vente enregistrée aujourd&apos;hui
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caissier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Heure</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-semibold">
                      {tx.created_by_name || "Système"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tx.type === "income" ? "default" : "destructive"}
                      >
                        {tx.type === "income" ? "Entrée" : "Sortie"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.category}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {tx.description}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(tx.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
