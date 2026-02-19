"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, BellOff, Package, ShoppingCart, ChefHat, UserPlus, Check, ArrowRight, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTenant } from "@/lib/tenant-context"
import { useNotifications, useDueReminders } from "@/hooks/use-tenant-data"
import { markNotificationRead, markAllNotificationsRead, dismissNotification } from "@/lib/notifications/actions"
import { dismissReminder } from "@/lib/prospects/actions"
import { toast } from "sonner"
import type { Notification } from "@/lib/notifications/actions"

function getNotifIcon(type: string) {
  switch (type) {
    case "transfer_request": return <Package className="h-3.5 w-3.5 text-blue-600" />
    case "purchase_request": return <ShoppingCart className="h-3.5 w-3.5 text-orange-600" />
    case "production_ready": return <ChefHat className="h-3.5 w-3.5 text-green-600" />
    default: return <Info className="h-3.5 w-3.5 text-muted-foreground" />
  }
}

function getNotifBg(type: string) {
  switch (type) {
    case "transfer_request": return "bg-blue-100"
    case "purchase_request": return "bg-orange-100"
    case "production_ready": return "bg-green-100"
    default: return "bg-muted"
  }
}

function getPriorityDot(priority: string) {
  switch (priority) {
    case "urgent": return "bg-red-500"
    case "high": return "bg-orange-500"
    default: return ""
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "A l'instant"
  if (mins < 60) return `Il y a ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `Il y a ${days}j`
}

export function NotificationBell() {
  const router = useRouter()
  const { currentTenant, currentRole } = useTenant()
  const { data: notifications = [], mutate: mutateNotifs, error: notifError } = useNotifications()
  const { data: reminders = [], mutate: mutateReminders, error: reminderError } = useDueReminders()
  const [open, setOpen] = useState(false)



  const unreadNotifs = notifications.filter((n) => n.status === "unread")
  const totalCount = unreadNotifs.length + reminders.length

  async function handleMarkRead(notif: Notification) {
    if (notif.status === "unread") {
      await markNotificationRead(notif.id)
      mutateNotifs()
    }
    if (notif.actionUrl) {
      router.push(notif.actionUrl)
      setOpen(false)
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead(currentTenant.id, currentRole)
    mutateNotifs()
    toast.success("Toutes les notifications marquees comme lues")
  }

  async function handleDismissNotif(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    await dismissNotification(id)
    mutateNotifs()
  }

  async function handleDismissReminder(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    await dismissReminder(id)
    mutateReminders()
    toast.success("Rappel ignore")
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 animate-pulse">
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          )}
          <span className="sr-only">Notifications ({totalCount})</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            {totalCount > 0 && (
              <Badge className="bg-red-500 text-white text-[10px] px-1.5 h-4">{totalCount}</Badge>
            )}
          </div>
          {unreadNotifs.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-foreground" onClick={handleMarkAllRead}>
              <Check className="h-3 w-3 mr-1" />
              Tout lire
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {/* Rappels prospects */}
          {reminders.length > 0 && (
            <>
              <div className="px-4 py-2 bg-muted/30">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Rappels prospects</span>
              </div>
              {reminders.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/50"
                  onClick={() => { router.push("/prospects"); setOpen(false) }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 mt-0.5">
                    <UserPlus className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground">{r.phone || "Pas de telephone"} - Relancer</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => handleDismissReminder(e, r.id)}>
                    <BellOff className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              {reminders.length > 3 && (
                <div className="px-4 py-2 text-center border-b border-border/50">
                  <button
                    className="text-[11px] text-primary hover:underline"
                    onClick={() => { router.push("/prospects"); setOpen(false) }}
                  >
                    +{reminders.length - 3} autres rappels
                  </button>
                </div>
              )}
            </>
          )}

          {/* System notifications */}
          {notifications.length > 0 && (
            <>
              <div className="px-4 py-2 bg-muted/30">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Alertes systeme</span>
              </div>
              {notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/50 ${
                    n.status === "unread" ? "bg-primary/[0.03]" : ""
                  }`}
                  onClick={() => handleMarkRead(n)}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getNotifBg(n.type)} mt-0.5 relative`}>
                    {getNotifIcon(n.type)}
                    {getPriorityDot(n.priority) && (
                      <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${getPriorityDot(n.priority)} ring-2 ring-background`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm truncate ${n.status === "unread" ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                    </div>
                    {n.message && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                      {n.createdByName && (
                        <span className="text-[10px] text-muted-foreground">par {n.createdByName}</span>
                      )}
                      {n.actionUrl && (
                        <span className="text-[10px] text-primary flex items-center gap-0.5">
                          Voir <ArrowRight className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => handleDismissNotif(e, n.id)}>
                    <BellOff className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </>
          )}

          {/* Empty state */}
          {totalCount === 0 && (
            <div className="py-12 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
