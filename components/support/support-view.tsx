"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  TicketPlus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  ArrowLeft,
  CircleDot,
  Filter,
  Wrench,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useTenant } from "@/lib/tenant-context"
import {
  fetchTickets,
  createTicket,
  fetchTicketMessages,
  sendTicketMessage,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
  type SupportTicket,
  type TicketMessage,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/tickets/actions"

// ─── Status badge styling ──────────────────────────────────
function StatusBadge({ status }: { status: TicketStatus }) {
  const config: Record<TicketStatus, { className: string; icon: typeof CircleDot }> = {
    open: { className: "bg-chart-1/10 text-chart-1 border-chart-1/20", icon: CircleDot },
    in_progress: { className: "bg-warning/10 text-warning border-warning/20", icon: Clock },
    resolved: { className: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
    closed: { className: "bg-muted text-muted-foreground border-border", icon: CheckCircle2 },
  }
  const { className, icon: Icon } = config[status] || config.open
  return (
    <Badge variant="outline" className={`gap-1 text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {TICKET_STATUS_LABELS[status]}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const config: Record<TicketPriority, string> = {
    low: "bg-muted text-muted-foreground border-border",
    normal: "bg-primary/10 text-primary border-primary/20",
    high: "bg-warning/10 text-warning border-warning/20",
    urgent: "bg-destructive/10 text-destructive border-destructive/20",
  }
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config[priority]}`}>
      {TICKET_PRIORITY_LABELS[priority]}
    </Badge>
  )
}

// ─── Create ticket dialog ──────────────────────────────────
function CreateTicketDialog({ onCreated }: { onCreated: () => void }) {
  const { currentTenant, currentUser, authUser } = useTenant()
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState<TicketCategory>("general")
  const [priority, setPriority] = useState<TicketPriority>("normal")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!subject.trim() || !message.trim()) return
    if (!currentTenant?.id || currentTenant.id === "__fallback__") {
      console.error("Tenant non disponible pour creer un ticket")
      return
    }
    setSubmitting(true)
    try {
      await createTicket({
        tenantId: currentTenant.id,
        createdByUserId: authUser?.id || currentUser.id,
        createdByName: currentUser.name,
        subject: subject.trim(),
        category,
        priority,
        message: message.trim(),
      })
      setOpen(false)
      setSubject("")
      setCategory("general")
      setPriority("normal")
      setMessage("")
      onCreated()
    } catch (err) {
      console.error("Failed to create ticket:", err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <TicketPlus className="mr-2 h-4 w-4" />
          Nouveau ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Signaler un probleme</DialogTitle>
          <DialogDescription>
            Decrivez votre probleme et notre equipe vous repondra dans les plus brefs delais.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              placeholder="Decrivez brievement votre probleme"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Categorie</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TICKET_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Priorite</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TICKET_PRIORITY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Expliquez votre probleme en detail..."
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting || !subject.trim() || !message.trim()}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Ticket conversation view ──────────────────────────────
function TicketConversation({
  ticket,
  onBack,
}: {
  ticket: SupportTicket
  onBack: () => void
}) {
  const { currentUser } = useTenant()
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    const msgs = await fetchTicketMessages(ticket.id)
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
      await sendTicketMessage({
        ticketId: ticket.id,
        senderType: "user",
        senderName: currentUser.name,
        message: newMessage.trim(),
      })
      setNewMessage("")
      await loadMessages()
    } catch (err) {
      console.error("Failed to send message:", err)
    } finally {
      setSending(false)
    }
  }

  const isClosed = ticket.status === "closed" || ticket.status === "resolved"

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
            <span className="text-xs text-muted-foreground">
              {TICKET_CATEGORY_LABELS[ticket.category]}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(ticket.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
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
              const isAdmin = msg.senderType === "admin"
              const isSystem = msg.senderType === "system"

              if (isSystem) {
                const parts = msg.message.split(" | ")
                const action = parts[0] || ""
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="max-w-[90%] rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Wrench className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">{action}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {new Date(msg.createdAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {parts.slice(1).map((part, i) => (
                          <p key={i} className="text-xs text-foreground/80">{part.trim()}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div key={msg.id} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                    isAdmin
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}>
                    <div className={`flex items-center gap-2 mb-1 ${isAdmin ? "" : "justify-end"}`}>
                      <span className={`text-xs font-medium ${isAdmin ? "text-foreground/70" : "text-primary-foreground/80"}`}>
                        {msg.senderName}
                      </span>
                      <span className={`text-[10px] ${isAdmin ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                        {new Date(msg.createdAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
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

      {/* Input */}
      {!isClosed ? (
        <>
          <Separator />
          <div className="flex items-end gap-2 pt-4">
            <Textarea
              placeholder="Ecrire un message..."
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
        </>
      ) : (
        <div className="flex items-center justify-center gap-2 pt-4 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4" />
          Ce ticket est {ticket.status === "resolved" ? "resolu" : "ferme"}.
        </div>
      )}
    </div>
  )
}

// ─── Main support view ─────────────────────────────────────
export function SupportView() {
  const { currentTenant, isLoading: tenantLoading } = useTenant()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const loadTickets = useCallback(async () => {
    if (currentTenant.id === "__fallback__") return
    setLoading(true)
    const data = await fetchTickets(currentTenant.id)
    setTickets(data)
    setLoading(false)
  }, [currentTenant.id])

  useEffect(() => {
    if (!tenantLoading) {
      loadTickets()
    }
  }, [tenantLoading, loadTickets])

  if (tenantLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (selectedTicket) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Support</h1>
          <p className="text-sm text-muted-foreground">Conversation avec le support KIFSHOP</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <TicketConversation
              ticket={selectedTicket}
              onBack={() => {
                setSelectedTicket(null)
                loadTickets()
              }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredTickets = statusFilter === "all"
    ? tickets
    : tickets.filter((t) => t.status === statusFilter)

  const openCount = tickets.filter((t) => t.status === "open").length
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length
  const resolvedCount = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Support</h1>
          <p className="text-sm text-muted-foreground">Signalez un probleme et suivez vos demandes</p>
        </div>
        <CreateTicketDialog onCreated={loadTickets} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resolvedCount}</p>
              <p className="text-xs text-muted-foreground">Resolus</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Mes tickets</CardTitle>
              <CardDescription>{tickets.length} ticket(s) au total</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="open">Ouverts</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="resolved">Resolus</SelectItem>
                  <SelectItem value="closed">Fermes</SelectItem>
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
              <p className="text-xs text-muted-foreground mt-1">
                {statusFilter === "all"
                  ? "Creez un ticket pour signaler un probleme"
                  : "Aucun ticket avec ce statut"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="w-full text-left p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{ticket.subject}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <StatusBadge status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} />
                        <span className="text-xs text-muted-foreground">
                          {TICKET_CATEGORY_LABELS[ticket.category]}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(ticket.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
