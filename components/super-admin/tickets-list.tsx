"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  ArrowLeft,
  CircleDot,
  Filter,
  Building2,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getAllTickets,
  getTicketMessages,
  replyToTicket,
  updateTicketStatus,
  type AdminTicketOverview,
  type AdminTicketMessage,
} from "@/lib/super-admin/actions"

// ─── Labels ────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Resolu",
  closed: "Ferme",
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  bug: "Bug",
  billing: "Facturation",
  feature_request: "Fonctionnalite",
  account: "Compte",
}

// ─── Badge components ──────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; icon: typeof CircleDot }> = {
    open: { className: "bg-chart-1/10 text-chart-1 border-chart-1/20", icon: CircleDot },
    in_progress: { className: "bg-warning/10 text-warning border-warning/20", icon: Clock },
    resolved: { className: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
    closed: { className: "bg-muted text-muted-foreground border-border", icon: XCircle },
  }
  const { className, icon: Icon } = config[status] || config.open
  return (
    <Badge variant="outline" className={`gap-1 text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {STATUS_LABELS[status] || status}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, string> = {
    low: "bg-muted text-muted-foreground border-border",
    normal: "bg-primary/10 text-primary border-primary/20",
    high: "bg-warning/10 text-warning border-warning/20",
    urgent: "bg-destructive/10 text-destructive border-destructive/20",
  }
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config[priority] || config.normal}`}>
      {PRIORITY_LABELS[priority] || priority}
    </Badge>
  )
}

// ─── Ticket conversation view (admin) ──────────────────────
function AdminTicketConversation({
  ticket,
  onBack,
  onStatusChange,
}: {
  ticket: AdminTicketOverview
  onBack: () => void
  onStatusChange: () => void
}) {
  const [messages, setMessages] = useState<AdminTicketMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    const msgs = await getTicketMessages(ticket.id)
    setMessages(msgs)
    setLoading(false)
  }, [ticket.id])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSend() {
    if (!newMessage.trim()) return
    setSending(true)
    try {
      await replyToTicket(ticket.id, newMessage.trim())
      setNewMessage("")
      await loadMessages()
      onStatusChange()
    } catch (err) {
      console.error("Failed to reply:", err)
    } finally {
      setSending(false)
    }
  }

  async function handleStatusChange(status: string) {
    setUpdatingStatus(true)
    try {
      await updateTicketStatus(ticket.id, status)
      onStatusChange()
    } catch (err) {
      console.error("Failed to update status:", err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start gap-3 pb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{ticket.subject}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <Badge variant="outline" className="text-xs gap-1">
              <Building2 className="h-3 w-3" />
              {ticket.tenant_name}
            </Badge>
            <span className="text-xs text-muted-foreground">
              par {ticket.created_by_name}
            </span>
            <span className="text-xs text-muted-foreground">
              {CATEGORY_LABELS[ticket.category] || ticket.category}
            </span>
          </div>
        </div>
        <div className="shrink-0">
          <Select
            value={ticket.status}
            onValueChange={handleStatusChange}
            disabled={updatingStatus}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Ouvert</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="resolved">Resolu</SelectItem>
              <SelectItem value="closed">Ferme</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 py-4" style={{ maxHeight: "calc(100vh - 380px)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun message</p>
        ) : (
          <div className="space-y-4 px-1">
            {messages.map((msg) => {
              const isAdmin = msg.sender_type === "admin"
              return (
                <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                    isAdmin
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}>
                    <div className={`flex items-center gap-2 mb-1 ${isAdmin ? "justify-end" : ""}`}>
                      <span className={`text-xs font-medium ${isAdmin ? "text-primary-foreground/80" : "text-foreground/70"}`}>
                        {msg.sender_name}
                      </span>
                      <span className={`text-[10px] ${isAdmin ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* Reply input */}
      <Separator />
      <div className="flex items-end gap-2 pt-4">
        <Textarea
          placeholder="Repondre au ticket..."
          rows={2}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

// ─── Main admin tickets list ───────────────────────────────
export function TicketsList() {
  const [tickets, setTickets] = useState<AdminTicketOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<AdminTicketOverview | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  const loadTickets = useCallback(async () => {
    setLoading(true)
    const data = await getAllTickets()
    setTickets(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (selectedTicket) {
    return (
      <Card>
        <CardContent className="p-6">
          <AdminTicketConversation
            ticket={selectedTicket}
            onBack={() => {
              setSelectedTicket(null)
              loadTickets()
            }}
            onStatusChange={loadTickets}
          />
        </CardContent>
      </Card>
    )
  }

  const filteredTickets = tickets
    .filter((t) => statusFilter === "all" || t.status === statusFilter)
    .filter((t) => priorityFilter === "all" || t.priority === priorityFilter)

  const openCount = tickets.filter((t) => t.status === "open").length
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length
  const urgentCount = tickets.filter((t) => t.priority === "urgent" && t.status !== "closed" && t.status !== "resolved").length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tickets.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10">
              <AlertCircle className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-xs text-muted-foreground">Ouverts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">En cours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{urgentCount}</p>
              <p className="text-xs text-muted-foreground">Urgents</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Tous les tickets</CardTitle>
              <CardDescription>{filteredTickets.length} ticket(s)</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="open">Ouverts</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="resolved">Resolus</SelectItem>
                  <SelectItem value="closed">Fermes</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Priorite" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes priorites</SelectItem>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-sm text-muted-foreground">Aucun ticket</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sujet</TableHead>
                    <TableHead>Patisserie</TableHead>
                    <TableHead>Auteur</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Priorite</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-center">Messages</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {ticket.subject}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {ticket.tenant_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{ticket.created_by_name}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[ticket.category] || ticket.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={ticket.priority} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          {ticket.message_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(ticket.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
